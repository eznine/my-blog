/* GEE Playground · 主逻辑
 * 自托管 EE 官方 JS 库（lib/ee/browser.js）+ Leaflet + CodeMirror5。
 * 认证：ee.data.authenticateViaOauth（内置 GIS popup）
 * 图层：obj.getMapId(visParams, cb) → mapid.urlFormat 直接喂 L.tileLayer
 * 导出：ee.batch.Export.* → task.start() 自动提交，任务面板轮询 ee.data.getTaskList
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ═══════════════ 状态与持久化 ═══════════════ */
  var LS_SETTINGS = 'gee_playground_settings';
  var LS_SCRIPT = 'gee_playground_script';
  var settings = { clientId: '', project: '' };
  try {
    var saved = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
    if (saved.clientId) settings.clientId = saved.clientId;
    if (saved.project) settings.project = saved.project;
  } catch (e) { /* 忽略损坏的本地配置 */ }

  var state = {
    authed: false,
    ready: false,        // ee.initialize 完成（算法目录已加载）
    authBusy: false,
    layerSeq: 0,
    consoleSeq: 0,
    hintCache: { classes: [], methods: {} }, // {Image: ['select', ...]}
    lastResults: {},     // 供将来扩展，保留
  };

  /* ═══════════════ 小工具 ═══════════════ */
  function toast(msg, isErr) {
    var box = $('toast');
    var el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' is-err' : '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 3200);
    setTimeout(function () { el.remove(); }, 3700);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function msg(e) {
    if (e === null || e === undefined) return '';
    if (typeof e === 'string') return e;
    if (e.message) return e.message;
    try { return JSON.stringify(e); } catch (_) { return String(e); }
  }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /** 输出值的美化：FC 摘要 / 截断 */
  function fmtValue(v) {
    if (v === undefined || v === null) return String(v);
    if (typeof v === 'string') return v;
    var text;
    if (typeof v === 'object') {
      var copy = v;
      if (v.type === 'FeatureCollection' && Array.isArray(v.features)) {
        copy = { type: 'FeatureCollection', features: v.features.length + ' 个要素', columns: v.columns };
        if (v.features.length) {
          copy.__first = v.features.slice(0, 3).map(function (f) {
            return { type: f.type, geometry: f.geometry && f.geometry.type, properties: f.properties };
          });
        }
      } else if (v.type === 'Feature') {
        copy = { type: 'Feature', geometry: v.geometry && v.geometry.type, properties: v.properties };
      } else if (v.type === 'Image') {
        copy = { type: 'Image', id: v.id, bands: (v.bands || []).map(function (b) { return b.id; }) };
      } else if (v.type === 'ImageCollection') {
        copy = { type: 'ImageCollection', size: v.features ? v.features.length + ' 个影像' : '未知', id: v.id };
      }
      try { text = JSON.stringify(copy, null, 1); } catch (_) { text = String(v); }
    } else {
      text = String(v);
    }
    if (text.length > 8000) {
      text = text.slice(0, 8000) + '\n… 输出过长，已截断（共 ' + text.length + ' 字符）';
    }
    return text;
  }

  function isEeObj(v) {
    return !!v && typeof v === 'object' && typeof v.getInfo === 'function';
  }

  /* ═══════════════ 控制台 ═══════════════ */
  var logEl = $('log');
  function logLine(cls, html) {
    var div = document.createElement('div');
    div.className = 'log-entry ' + cls;
    div.innerHTML = '<span class="t">' + fmtTime(Date.now()) + '</span>' + html;
    logEl.appendChild(div);
    while (logEl.children.length > 500) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }
  function logInfo(text) { logLine('log-info', esc(text)); }
  function logOk(text) { logLine('log-ok', esc(text)); }
  function logErr(text) { logLine('log-err', esc(text)); }
  function logRun(text) { logLine('log-run', esc(text)); }
  function logPrint(label, text) {
    var div = document.createElement('div');
    div.className = 'log-entry log-print';
    div.innerHTML = '<span class="t">' + fmtTime(Date.now()) + '</span>' +
      (label ? '<span class="pl">' + esc(label) + '</span>' : '') +
      '<pre></pre>';
    div.querySelector('pre').textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  $('btn-clear').addEventListener('click', function () { logEl.innerHTML = ''; });

  /* 控制台三个标签页 */
  var panes = { log: $('pane-log'), tasks: $('pane-tasks'), help: $('pane-help') };
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.remove('is-active'); });
      Object.keys(panes).forEach(function (k) { panes[k].classList.remove('is-active'); });
      btn.classList.add('is-active');
      panes[btn.getAttribute('data-pane')].classList.add('is-active');
      if (btn.getAttribute('data-pane') === 'tasks') refreshTasks();
    });
  });

  /* ═══════════════ 地图 ═══════════════ */
  var map = L.map('map', { center: [37.74, 112.66], zoom: 6, zoomControl: true });
  var basemaps = {
    '亮色底图': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 20, subdomains: 'abcd',
    }),
    '影像底图': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri', maxZoom: 19,
    }),
    '街道底图': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19, subdomains: 'abc',
    }),
  };
  basemaps['亮色底图'].addTo(map);
  L.control.scale({ imperial: false }).addTo(map);

  var layerControl = null;
  function rebuildLayerControl() {
    if (layerControl) map.removeControl(layerControl);
    layerControl = L.control.layers(basemaps, {}, { position: 'topleft', collapsed: true }).addTo(map);
  }
  rebuildLayerControl();

  map.on('mousemove', function (e) {
    $('mb-coords').textContent =
      'LNG ' + e.latlng.lng.toFixed(4) + ' · LAT ' + e.latlng.lat.toFixed(4);
  });
  map.on('zoomend moveend', function () {
    $('mb-zoom').textContent = 'Z ' + map.getZoom();
    $('mb-coords').textContent =
      'LNG ' + map.getCenter().lng.toFixed(4) + ' · LAT ' + map.getCenter().lat.toFixed(4);
  });

  /* Map 全局 API（与 Code Editor 兼容的子集） */
  function bboxOfGeoJSON(gj) {
    if (!gj || !gj.coordinates) return null;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    (function walk(a) {
      if (typeof a[0] === 'number') {
        minX = Math.min(minX, a[0]); maxX = Math.max(maxX, a[0]);
        minY = Math.min(minY, a[1]); maxY = Math.max(maxY, a[1]);
      } else { a.forEach(walk); }
    })(gj.coordinates);
    return [minY, minX, maxY, maxX]; // [s, w, n, e]
  }

  function addEeLayer(mappable, visParams, name, shown) {
    var seq = ++state.layerSeq;
    var label = name || ('图层 ' + seq);
    if (mappable instanceof ee.Geometry) mappable = ee.Feature(mappable);
    // 裸 GeoJSON（无 getInfo 的普通对象）也包一下
    if (!isEeObj(mappable) && mappable && mappable.type) {
      mappable = mappable.type === 'FeatureCollection'
        ? ee.FeatureCollection(mappable)
        : ee.Feature(mappable);
    }
    var done = function (mapId, err) {
      if (err) { logErr('图层「' + label + '」获取失败：' + msg(err)); return; }
      if (!mapId || !mapId.urlFormat) { logErr('图层「' + label + '」返回了无效的 MapID'); return; }
      var opacity = (visParams && typeof visParams.opacity === 'number')
        ? Math.max(0, Math.min(1, visParams.opacity)) : 1;
      var layer = L.tileLayer(mapId.urlFormat, {
        tileSize: 256,
        maxZoom: 20,
        opacity: opacity,
        attribution: 'Earth Engine',
      });
      if (shown !== false) layer.addTo(map);
      layerControl.addOverlay(layer, label);
      logOk('图层「' + label + '」已叠加' + (shown === false ? '（隐藏）' : ''));
    };
    try {
      if (typeof mappable.getMapId !== 'function') {
        logErr('Map.addLayer 暂不支持该对象类型');
        return;
      }
      mappable.getMapId(visParams || {}, done);
    } catch (e) {
      logErr('图层「' + label + '」提交失败：' + msg(e));
    }
  }

  var MapApi = {
    addLayer: function (obj, visParams, name, shown) {
      addEeLayer(obj, visParams, name, shown);
      return undefined;
    },
    setCenter: function (lng, lat, zoom) {
      map.setView([lat, lng], zoom === undefined ? 10 : zoom);
    },
    centerObject: function (obj, zoom) {
      if (!isEeObj(obj)) { logErr('centerObject 需要 EE 对象'); return; }
      var geom = obj;
      if (obj instanceof ee.Geometry) geom = obj;
      else if (typeof obj.geometry === 'function') geom = obj.geometry();
      var b = (geom && typeof geom.bounds === 'function') ? geom.bounds() : geom;
      if (!b || typeof b.getInfo !== 'function') {
        logInfo('centerObject：该对象无几何范围（影像类对象请先用 setCenter）');
        return;
      }
      b.getInfo(function (res, err) {
        if (err) { logErr('centerObject 失败：' + msg(err)); return; }
        var bb = res && res.coordinates ? bboxOfGeoJSON(res) : null;
        if (!bb) { logInfo('centerObject：对象无空间范围'); return; }
        var cy = (bb[0] + bb[2]) / 2, cx = (bb[1] + bb[3]) / 2;
        if (zoom === undefined) {
          var bounds = L.latLngBounds([[bb[0], bb[1]], [bb[2], bb[3]]]);
          map.fitBounds(bounds);
        } else {
          map.setView([cy, cx], zoom);
        }
      });
    },
    getBounds: function () {
      var b = map.getBounds();
      return [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]];
    },
    getCenter: function () {
      var c = map.getCenter();
      return { lng: c.lng, lat: c.lat, zoom: map.getZoom() };
    },
    getZoom: function () { return map.getZoom(); },
    clear: function () { rebuildLayerControl(); },
  };

  /* ═══════════════ print ═══════════════ */
  function print() {
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0) return;
    var label = null, value = args[0];
    if (args.length > 1 && typeof args[0] === 'string') { label = args[0]; value = args[1]; }
    if (isEeObj(value)) {
      value.getInfo(function (res, err) {
        if (err) logErr('print 取值失败：' + msg(err));
        else logPrint(label, fmtValue(res));
      });
    } else {
      logPrint(label, fmtValue(value));
    }
  }

  /* ═══════════════ 导出（自动提交，无需 .start()） ═══════════════ */
  function makeExport(grp, meth) {
    return function () {
      if (!state.authed) throw new Error('未登录：请先登录 Google 账号');
      var task;
      try {
        task = ee.batch.Export[grp][meth].apply(null, arguments);
      } catch (e) {
        logErr('导出参数错误：' + msg(e));
        return null;
      }
      try {
        task.start();
      } catch (e) {
        logErr('导出任务提交失败：' + msg(e));
        return task;
      }
      toast('导出任务已提交，进度见「任务」面板');
      logOk('导出任务已提交：' + (task.id || '') + '（' + grp + '.' + meth + '）');
      setTimeout(refreshTasks, 1500);
      return task;
    };
  }
  var ExportApi = {
    image: {
      toDrive: makeExport('image', 'toDrive'),
      toCloudStorage: makeExport('image', 'toCloudStorage'),
      toAsset: makeExport('image', 'toAsset'),
    },
    table: {
      toDrive: makeExport('table', 'toDrive'),
      toCloudStorage: makeExport('table', 'toCloudStorage'),
      toAsset: makeExport('table', 'toAsset'),
    },
    video: {
      toDrive: makeExport('video', 'toDrive'),
      toCloudStorage: makeExport('video', 'toCloudStorage'),
    },
  };

  function saveAs(name, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  /* ── 用户脚本用的 console（与全局 console 隔离，避免刷屏） ── */
  var userConsole = {
    log: function () { var a = Array.prototype.slice.call(arguments); logInfo(a.map(fmtValue).join(' ')); },
    info: function () { userConsole.log.apply(null, arguments); },
    warn: function () { var a = Array.prototype.slice.call(arguments); logErr(a.map(fmtValue).join(' ')); },
    error: function () { var a = Array.prototype.slice.call(arguments); logErr(a.map(fmtValue).join(' ')); },
  };

  /* ═══════════════ 运行 ═══════════════ */
  function run() {
    if (!state.authed) {
      toast('请先登录 Google 账号', true);
      return;
    }
    var code = editor.getValue();
    try { localStorage.setItem(LS_SCRIPT, code); } catch (e) { /* 忽略 */ }
    rebuildLayerControl();          // 每次运行清掉上一个脚本的图层（与 Code Editor 一致）
    logRun('▶ RUN · 脚本开始执行');
    var fn;
    try {
      fn = new Function(
        'ee', 'Map', 'print', 'Export', 'toast', 'saveAs', 'console',
        'return (async () => {\n' + code + '\n})();'
      );
    } catch (e) {
      logErr('脚本语法错误：' + msg(e));
      return;
    }
    var p;
    try {
      p = fn(ee, MapApi, print, ExportApi, toast, saveAs, userConsole);
    } catch (e) {
      logErr('脚本执行错误：' + msg(e));
      return;
    }
    if (p && typeof p.catch === 'function') {
      p.catch(function (e) {
        logErr('脚本异步错误：' + msg(e) + (e && e.stack ? '\n' + e.stack.split('\n').slice(0, 4).join('\n') : ''));
      });
    }
  }

  /* ═══════════════ 认证 ═══════════════ */
  function setChip(busy, text) {
    var dot = $('auth-dot'), txt = $('auth-text');
    dot.className = 'dot' + (busy ? ' is-busy' : (state.authed ? ' is-on' : ''));
    txt.textContent = text;
  }
  function onAuthSuccess() {
    state.authed = true;
    state.authBusy = false;
    setChip(false, settings.project || '已登录');
    // 初始化 API（下载算法目录），project 一并设置
    var proj = settings.project;
    ee.data.setProject(proj);
    ee.initialize(null, null, function () {
      state.ready = true;
      logOk('Earth Engine API 就绪 · project: ' + (proj || '未设置'));
      buildHints();
      refreshTasks();
      $('btn-login').textContent = '重新登录';
      $('btn-logout').style.display = '';
      logInfo('提示：print() 输出在下方「控制台」；导出任务在「任务」面板查看。');
    }, function (err) {
      logErr('初始化失败：' + msg(err) + '（请确认项目 ID 已启用 Earth Engine API）');
    }, null, proj);
  }
  function onAuthError(err) {
    state.authed = false;
    state.authBusy = false;
    setChip(false, '未登录');
    logErr('登录失败：' + msg(err));
  }
  function login() {
    if (!settings.clientId || !settings.project) {
      toast('请先填写 OAuth 客户端 ID 与项目 ID', true);
      openSettings();
      return;
    }
    if (state.authBusy) return;
    state.authBusy = true;
    setChip(true, '登录中…');
    try {
      ee.data.authenticateViaOauth(
        settings.clientId,
        onAuthSuccess,
        onAuthError,
        ['https://www.googleapis.com/auth/drive']
      );
    } catch (e) {
      state.authBusy = false;
      setChip(false, '未登录');
      logErr('发起登录失败：' + msg(e));
    }
  }
  $('btn-login').addEventListener('click', login);
  $('auth-chip').addEventListener('click', openSettings);
  $('auth-chip').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); }
  });

  /* ═══════════════ 设置弹窗 ═══════════════ */
  var dlg = $('settings');
  var inCid = $('in-clientid'), inProj = $('in-project');
  function openSettings() {
    inCid.value = settings.clientId;
    inProj.value = settings.project;
    $('btn-logout').style.display = state.authed ? '' : 'none';
    dlg.showModal();
    setTimeout(function () { inCid.focus(); }, 50);
  }
  function closeSettings() { dlg.close(); }
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-cancel').addEventListener('click', closeSettings);
  $('btn-save').addEventListener('click', function () {
    settings.clientId = inCid.value.trim();
    settings.project = inProj.value.trim();
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch (e) { /* 忽略 */ }
    closeSettings();
    if (state.authed && settings.project) {
      // 项目改了 → 重新走一遍初始化以更新 project
      state.authed = false;
      login();
    } else {
      toast('设置已保存');
    }
  });
  $('btn-logout').addEventListener('click', function () {
    closeSettings();
    location.reload();
  });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) closeSettings();
  });

  /* ═══════════════ 任务面板 ═══════════════ */
  var taskTimer = null;
  function refreshTasks() {
    if (!state.authed) return renderTasks(null);
    ee.data.getTaskList(function (res, err) {
      if (err) { renderTasks(null, err); return; }
      renderTasks(res && res.tasks ? res.tasks : []);
      scheduleTaskPoll();
    });
  }
  function scheduleTaskPoll() {
    if (taskTimer) return;
    taskTimer = setInterval(function () {
      if (!state.authed) { clearInterval(taskTimer); taskTimer = null; return; }
      var active = document.querySelector('#pane-tasks.is-active');
      if (active) refreshTasks();
    }, 15000);
  }
  function renderTasks(tasks, err) {
    var box = $('tasks');
    box.innerHTML = '';
    if (err) {
      var e0 = document.createElement('div');
      e0.className = 'task-empty';
      e0.textContent = '任务列表获取失败：' + msg(err);
      box.appendChild(e0);
      return;
    }
    if (!state.authed) {
      var e1 = document.createElement('div');
      e1.className = 'task-empty';
      e1.textContent = '登录后可见导出任务。';
      box.appendChild(e1);
      $('task-badge').textContent = '';
      return;
    }
    var RUNNING_STATES = ['READY', 'RUNNING', 'CANCEL_REQUESTED'];
    var running = (tasks || []).filter(function (t) { return RUNNING_STATES.indexOf(t.state) !== -1; });
    $('task-badge').textContent = running.length ? '(' + running.length + ')' : '';
    if (!tasks || !tasks.length) {
      var e2 = document.createElement('div');
      e2.className = 'task-empty';
      e2.textContent = '暂无任务。运行含 Export.* 的脚本后，导出任务会出现在这里。';
      box.appendChild(e2);
      return;
    }
    var STATE_CLS = {
      READY: 'is-running', RUNNING: 'is-running', CANCEL_REQUESTED: 'is-running',
      COMPLETED: 'is-completed', FAILED: 'is-failed',
    };
    tasks.slice().sort(function (a, b) {
      return (b.creation_timestamp_ms || 0) - (a.creation_timestamp_ms || 0);
    }).slice(0, 50).forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'task-row';
      var d = document.createElement('span');
      d.className = 'task-desc';
      d.textContent = t.description || t.id || '(未命名任务)';
      row.appendChild(d);
      var s = document.createElement('span');
      s.className = 'task-state ' + (STATE_CLS[t.state] || '');
      s.textContent = t.state || 'UNKNOWN';
      row.appendChild(s);
      var m = document.createElement('span');
      m.className = 'task-meta';
      m.textContent = t.task_type + (t.creation_timestamp_ms ? ' · ' + fmtTime(t.creation_timestamp_ms) : '') + ' · ' + (t.id || '');
      row.appendChild(m);
      if (t.state === 'FAILED' && t.error_message) {
        var er = document.createElement('div');
        er.className = 'task-error';
        er.textContent = t.error_message;
        row.appendChild(er);
      }
      if (RUNNING_STATES.indexOf(t.state) !== -1 && t.id) {
        var c = document.createElement('button');
        c.className = 'task-cancel';
        c.textContent = '取消';
        c.addEventListener('click', function () {
          ee.data.cancelTask(t.id, function (_, err2) {
            if (err2) logErr('取消任务失败：' + msg(err2));
            else logInfo('已请求取消任务 ' + t.id);
            refreshTasks();
          });
        });
        row.appendChild(c);
      }
      box.appendChild(row);
    });
  }

  /* ═══════════════ 代码补全（基于 EE 算法目录） ═══════════════ */
  var HINT_MAP = { addLayer: 1, setCenter: 1, centerObject: 1, getBounds: 1, getCenter: 1, getZoom: 1, clear: 1 };
  var HINT_EXPORT = { image: 1, table: 1, video: 1 };
  var HINT_EXPORT_SUB = { toDrive: 1, toCloudStorage: 1, toAsset: 1 };
  function buildHints() {
    ee.data.getAlgorithms(function (algs, err) {
      if (err || !algs) return;
      var classes = {}, methods = {};
      Object.keys(algs).forEach(function (key) {
        var parts = key.split('.');
        if (parts.length === 2 && /^[A-Z]/.test(parts[0])) {
          classes[parts[0]] = 1;
          (methods[parts[0]] = methods[parts[0]] || []).push(parts[1]);
        }
      });
      state.hintCache.classes = Object.keys(classes).sort();
      state.hintCache.methods = methods;
    });
  }

  CodeMirror.registerHelper('hint', 'gee', function (cm) {
    var cur = cm.getCursor(), line = cm.getLine(cur.line);
    var pre = line.slice(0, cur.ch);
    var m = /([A-Za-z_$][\w$.]*)$/.exec(pre);
    if (!m) return null;
    var full = m[1];
    var start = cur.ch - full.length;
    var list = [];
    var dots = full.split('.');
    var last = dots[dots.length - 1];
    var chain = dots.slice(0, -1).join('.');
    var isGlobal = dots.length === 1;
    if (isGlobal) {
      var kw = ['ee', 'Map', 'print', 'Export', 'toast', 'saveAs', 'var', 'let', 'const', 'function',
        'return', 'if', 'else', 'for', 'while', 'true', 'false', 'null', 'undefined', 'new', 'typeof'];
      list = kw.concat(state.hintCache.classes);
    } else if (chain === 'ee') {
      list = state.hintCache.classes.slice();
    } else if (chain === 'Map') {
      list = Object.keys(HINT_MAP);
    } else if (chain === 'Export') {
      list = Object.keys(HINT_EXPORT);
    } else if (chain === 'Export.image' || chain === 'Export.table' || chain === 'Export.video') {
      list = Object.keys(HINT_EXPORT_SUB);
    } else {
      var cls = chain.replace(/^ee\./, '');
      list = (state.hintCache.methods[cls] || []).slice();
    }
    if (!list.length) return null;
    list = list.filter(function (w) { return w.toLowerCase().startsWith(last.toLowerCase()); });
    if (!list.length) return null;
    return {
      list: list.slice(0, 60),
      from: { line: cur.line, ch: start },
      to: { line: cur.line, ch: cur.ch },
    };
  });
  function autocomplete(cm) {
    cm.showHint({ hint: CodeMirror.hint.gee, completeSingle: false });
  }

  /* ═══════════════ 编辑器 ═══════════════ */
  var editor = CodeMirror($('editor'), {
    value: '',
    mode: 'javascript',
    theme: 'gee',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    styleActiveLine: true,
    tabSize: 2,
    indentUnit: 2,
    lineWrapping: false,
    extraKeys: {
      'Ctrl-Enter': run,
      'Cmd-Enter': run,
      'Ctrl-Space': autocomplete,
      'Cmd-Space': autocomplete,
    },
  });
  editor.on('change', function () {
    // 防抖自动保存
    clearTimeout(editor.__saveT);
    editor.__saveT = setTimeout(function () {
      try { localStorage.setItem(LS_SCRIPT, editor.getValue()); } catch (e) { /* 忽略 */ }
    }, 600);
  });
  editor.on('inputRead', function (cm) {
    if (cm.state.completionActive || cm.getOption('mode').indexOf('javascript') === -1) return;
    var word = cm.getTokenAt(cm.getCursor()).string || '';
    if (word.length >= 3 && /^[\w$.]+$/.test(word)) {
      clearTimeout(editor.__hintT);
      editor.__hintT = setTimeout(function () { autocomplete(cm); }, 380);
    }
  });
  setTimeout(function () { editor.refresh(); }, 100);

  /* ═══════════════ 示例 ═══════════════ */
  var EXAMPLES = [
    {
      name: 'SRTM 地形与山体阴影',
      code: [
        '// SRTM 数字高程模型 → 山体阴影 + 高程分层设色（太原盆地一带）',
        'var dem = ee.Image(\'USGS/SRTMGL1_003\');',
        'var hillshade = ee.Terrain.hillshade(dem);',
        '',
        'Map.addLayer(hillshade, {}, \'山体阴影\', false);   // 默认隐藏，图层面板可打开',
        'Map.addLayer(dem,',
        '  {min: 0, max: 3000, palette: [\'#2c7bb6\', \'#abd9e9\', \'#ffffbf\', \'#fdae61\', \'#d7191c\']},',
        '  \'SRTM 高程\');',
        '',
        'Map.setCenter(112.66, 37.74, 8);',
        '',
        '// 控制台输出：卫星 + 数据条带信息',
        'print(\'SRTM 元数据:\', dem);',
        'print(\'盆地及周边高程统计:\', dem.reduceRegion({',
        '  reducer: ee.Reducer.minMax(),',
        '  geometry: ee.Geometry.Point([112.66, 37.74]).buffer(50000),',
        '  scale: 90',
        '}));',
      ].join('\n'),
    },
    {
      name: 'Landsat 9 NDVI',
      code: [
        '// 2024 年夏太原周边 Landsat 9 影像 → NDVI',
        'var region = ee.Geometry.Point([112.66, 37.74]).buffer(40000);',
        '',
        'var l9 = ee.ImageCollection(\'LANDSAT/LC09/C02/T1_L2\')',
        '  .filterBounds(region)',
        '  .filterDate(\'2024-07-01\', \'2024-09-30\')',
        '  .filter(ee.Filter.lt(\'CLOUD_COVER\', 20));',
        '',
        'print(\'可用影像数:\', l9.size());',
        '',
        '// 取云量最少的一景',
        'var image = l9.sort(\'CLOUD_COVER\').first();',
        'var ndvi = image.normalizedDifference([\'SR_B5\', \'SR_B4\']).rename(\'NDVI\');',
        '',
        'Map.centerObject(image, 10);',
        'Map.addLayer(image, {bands: [\'SR_B4\', \'SR_B3\', \'SR_B2\'], min: 7000, max: 13000}, \'真彩色\');',
        'Map.addLayer(ndvi, {',
        '  min: -0.2, max: 0.8,',
        '  palette: [\'#800026\', \'#bd0026\', \'#e31a1c\', \'#fc4e2a\', \'#fd8d3c\', \'#feb24c\', \'#fed976\', \'#ffffb2\', \'#ffffcc\']',
        '}, \'NDVI\');',
        '',
        'print(\'影像日期:\', ee.Date(image.get(\'DATE_ACQUIRED\')));',
        'print(\'区域 NDVI 均值:\', ndvi.reduceRegion({',
        '  reducer: ee.Reducer.mean(), geometry: region, scale: 100, maxPixels: 1e9',
        '}).get(\'NDVI\'));',
      ].join('\n'),
    },
    {
      name: '行政边界与面积统计',
      code: [
        '// FAO/GAUL 省级边界 + 面积统计（山西）',
        'var shanxi = ee.FeatureCollection(\'FAO/GAUL/2015/level1\')',
        '  .filter(ee.Filter.eq(\'ADM1_NAME\', \'Shanxi\'));',
        '',
        'Map.addLayer(shanxi.style({color: \'#d3381c\', fillColor: \'#d3381c22\', width: 1.5}), {}, \'山西省界\');',
        'Map.centerObject(shanxi, 7);',
        '',
        'print(\'要素数:\', shanxi.size());',
        'print(\'面积(km²):\', shanxi.geometry().area().divide(1e6));',
        'print(\'第一条要素:\', shanxi.first());',
      ].join('\n'),
    },
    {
      name: '哨兵2 合成与云掩膜',
      code: [
        '// 2025 年 7 月太原周边哨兵2 影像：筛选 + 中值合成',
        'var region = ee.Geometry.Point([112.66, 37.74]).buffer(30000);',
        '',
        'var s2 = ee.ImageCollection(\'COPERNICUS/S2_HARMONIZED\')',
        '  .filterBounds(region)',
        '  .filterDate(\'2025-07-01\', \'2025-07-31\')',
        '  .filter(ee.Filter.lt(\'CLOUDY_PIXEL_PERCENTAGE\', 20));',
        '',
        'var mosaic = s2.median();',
        '',
        'Map.centerObject(region, 10);',
        'Map.addLayer(mosaic, {bands: [\'B4\', \'B3\', \'B2\'], min: 100, max: 3000}, \'真彩色合成\');',
        '',
        'print(\'当月可用影像数:\', s2.size());',
        'print(\'云量最低影像:\', s2.sort(\'CLOUDY_PIXEL_PERCENTAGE\').first());',
      ].join('\n'),
    },
    {
      name: '导出到 Google Drive',
      code: [
        '// 把 SRTM 裁剪结果导出到自己的 Google Drive（受磁盘配额限制）',
        'var region = ee.Geometry.Rectangle([111.5, 35.5, 113.8, 38.2]); // 山西中部',
        'Map.addLayer(region, {}, \'导出范围\');',
        'Map.centerObject(region, 7);',
        '',
        'var dem = ee.Image(\'USGS/SRTMGL1_003\').clip(region);',
        '',
        'Export.image.toDrive({',
        '  image: dem,',
        '  description: \'SRTM_山西中部\',',
        '  folder: \'GEE_EXPORTS\',          // Google Drive 里的目标文件夹',
        '  region: region,',
        '  scale: 30,',
        '  maxPixels: 1e9',
        '});',
        '',
        'print(\'导出任务已提交，进度与产物见「任务」面板。\');',
      ].join('\n'),
    },
  ];

  var sel = $('sel-example');
  EXAMPLES.forEach(function (ex, i) {
    var o = document.createElement('option');
    o.value = String(i);
    o.textContent = ex.name;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function () {
    var idx = Number(sel.value);
    if (isNaN(idx) || !EXAMPLES[idx]) return;
    var current = editor.getValue().trim();
    if (current && current !== EXAMPLES[idx].code.trim()) {
      var okc = window.confirm('示例将覆盖当前代码，确定载入「' + EXAMPLES[idx].name + '」？');
      if (!okc) { sel.value = '-1'; return; }
    }
    editor.setValue(EXAMPLES[idx].code);
    editor.setCursor({ line: 0, ch: 0 });
    editor.focus();
    logInfo('已载入示例：' + EXAMPLES[idx].name);
  });

  /* 初始内容：上次的脚本或第一个示例 */
  var stored = '';
  try { stored = localStorage.getItem(LS_SCRIPT) || ''; } catch (e) { /* 忽略 */ }
  if (!stored.trim()) stored = EXAMPLES[0].code;
  editor.setValue(stored);

  /* ═══════════════ 上下/左右分隔条（pointer capture） ═══════════════ */
  function bindSplitter(bar, onDrag, onEnd) {
    var startX = 0, startVal = 0, dragging = false;
    bar.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startVal = onDrag.start ? onDrag.start() : 0;
      bar.setPointerCapture(e.pointerId);
      bar.classList.add('is-drag');
      document.body.classList.add('is-drag');
    });
    bar.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      onDrag.move(e.clientX - startX, startVal);
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove('is-drag');
      document.body.classList.remove('is-drag');
      onEnd && onEnd();
    }
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  var colCode = $('col-code');
  bindSplitter($('split-v'), {
    start: function () { return colCode.offsetWidth; },
    move: function (dx, startVal) {
      var main = $('main');
      var min = Math.max(300, main.offsetWidth * 0.22);
      var max = main.offsetWidth - 320;
      var w = Math.max(min, Math.min(max, startVal + dx));
      colCode.style.width = w + 'px';
    },
  }, function () { map.invalidateSize(); editor.refresh(); });

  var consoleBox = $('console');
  bindSplitter($('split-h'), {
    start: function () { return consoleBox.offsetHeight; },
    move: function (dx, startVal) {
      var main = $('main');
      var min = 110;
      var max = main.offsetHeight - 200;
      var h = Math.max(min, Math.min(max, startVal - dx));
      consoleBox.style.height = h + 'px';
    },
  }, function () { map.invalidateSize(); editor.refresh(); });
  $('split-h').style.display = 'block';

  window.addEventListener('resize', function () {
    map.invalidateSize();
    clearTimeout(window.__rzT);
    window.__rzT = setTimeout(function () { editor.refresh(); }, 150);
  });

  /* ═══════════════ 全局错误兜底 ═══════════════ */
  window.addEventListener('error', function (e) {
    if (e && e.message && String(e.message).indexOf('ResizeObserver') === -1) {
      logErr('页面错误：' + e.message);
    }
  });
  window.addEventListener('unhandledrejection', function (e) {
    logErr('未处理的异步错误：' + (e.reason ? msg(e.reason) : 'unknown'));
  });

  /* ═══════════════ 启动自检 ═══════════════ */
  if (!window.ee) {
    logErr('Earth Engine 库（lib/ee/browser.js）加载失败，请检查网络或文件完整性。');
  } else {
    logInfo('GEE Playground 已就绪。点右上角「登录 Google」开始使用。');
    logInfo('登录需要：可访问 Google 的网络 + 已在控制台 ⚙ 里填好 Client ID 与项目 ID。');
    setChip(false, '未登录');
  }
})();