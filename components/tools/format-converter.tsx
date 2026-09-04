'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Leaflet 必须浏览器端才加载（其源码顶层引用 window，SSR 会崩）。
// 这里只 import 类型 + CSS（CSS import 在 SSR 安全），运行时用 loadLeaflet() 动态 import。
import type * as LeafletNS from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  ExportResult,
  GjFeatureCollection,
  InputFormat,
  ParseResult,
  SourceFile,
} from '@/lib/geo';

/**
 * 矢量数据格式转换工具箱。
 * - 导入：GeoJSON / Shapefile(.zip 或 .shp+.dbf+.prj) / TopoJSON / KML / GPX / WKT / CSV
 * - 导出：GeoJSON / Shapefile / TopoJSON / KML / WKT / CSV
 * - 附加能力：坐标重投影（WGS84 / CGCS2000 / WebMercator / UTM 自动分带 / 自定义 proj4）、
 *   属性表预览、地图联动预览（底图优先高德+Esri）、TopoJSON 压缩比、要素统计。
 * 全程浏览器本地处理，数据不上传。
 */

export interface ConverterCopy {
  title: string;
  en: string;
  desc: string;
  importEn: string;
  drop: string;
  browse: string;
  importFormats: string;
  parsing: string;
  parseError: string;
  overview: string;
  crsSource: string;
  crsTarget: string;
  transform: string;
  target: string;
  convert: string;
  reset: string;
  download: string;
  downloading: string;
  map: string;
  table: string;
  stats: string;
  basemap: string;
  basemapAmap: string;
  basemapEsri: string;
  gcjTip: string;
  srcEnabled: string;
}

/* ═════════ 类型与常量 ═════════ */

const FORMAT_LABEL: Record<InputFormat, string> = {
  geojson: 'GeoJSON',
  topojson: 'TopoJSON',
  shapefile: 'Shapefile',
  kml: 'KML',
  gpx: 'GPX',
  wkt: 'WKT',
  csv: 'CSV（经纬度表）',
  json: 'JSON',
  txt: 'TXT',
  unknown: '未知',
};

const OUTPUT_FORMATS: { value: string; label: string }[] = [
  { value: 'geojson', label: 'GeoJSON (.geojson)' },
  { value: 'shapefile', label: 'Shapefile (.zip 打包)' },
  { value: 'topojson', label: 'TopoJSON (.topojson)' },
  { value: 'kml', label: 'KML (.kml)' },
  { value: 'wkt', label: 'WKT (.wkt)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

const CRS_PRESETS: { value: string; label: string }[] = [
  { value: 'EPSG:4326', label: 'WGS84 经纬度 (EPSG:4326)' },
  { value: 'EPSG:4490', label: 'CGCS2000 经纬度 (EPSG:4490)' },
  { value: 'EPSG:3857', label: 'Web Mercator (EPSG:3857)' },
  { value: 'EPSG:4526', label: 'CGCS2000 3°带 111°E (EPSG:4526)' },
  { value: 'EPSG:4528', label: 'CGCS2000 3°带 117°E (EPSG:4528)' },
  { value: 'utm', label: 'UTM 自动分带（WGS84）' },
  { value: 'custom', label: '自定义 proj4 字符串…' },
];

/** 与 lib/geo 重投影的目标 CRS 种类对应（局部简化类型，避免依赖内部实现细节） */
type CrsKind = 'EPSG:4326' | 'EPSG:4490' | 'EPSG:3857' | 'EPSG:4526' | 'EPSG:4528' | 'utm' | 'custom';

/** 默认空解析结果 */
const EMPTY: ParseResult = {
  fc: { type: 'FeatureCollection', features: [] },
  format: 'unknown',
  sourceCrs: 'EPSG:4326',
  stem: 'data',
  warnings: [],
};

export function FormatConverter({ copy }: { copy: ConverterCopy }) {
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  // 转换设置
  const [sourceCrs, setSourceCrs] = useState('EPSG:4326');
  const [doReproject, setDoReproject] = useState(false);
  const [targetCrsKind, setTargetCrsKind] = useState('EPSG:3857');
  const [customCrs, setCustomCrs] = useState('+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m');
  const [targetFormat, setTargetFormat] = useState('geojson');
  const [converted, setConverted] = useState<ExportResult | null>(null);
  // 视图
  const [view, setView] = useState<'map' | 'table' | 'stats'>('map');

  const inputRef = useRef<HTMLInputElement>(null);

  /* ── base：解析当前数据（原始或重投影后）便于导出/预览 ── */
  const workingFC: GjFeatureCollection = useMemo(() => {
    if (!parsed) return EMPTY.fc;
    return parsed.fc;
  }, [parsed]);

  const sourceCrsValue = useMemo(() => sourceCrs.trim() || 'EPSG:4326', [sourceCrs]);

  const handleFiles = useCallback(async (files: File[] | null) => {
    if (!files || !files.length) return;
    setBusy(true); setError(''); setNote(''); setConverted(null); setParsed(null);
    try {
      const geo = await import('@/lib/geo');
      const srcs: SourceFile[] = await Promise.all(
        Array.from(files).map(async (f) => ({ name: f.name, content: await f.arrayBuffer() }))
      );
      const result = await geo.parseFiles(srcs);
      setParsed(result);
      setSourceCrs(result.sourceCrs || 'EPSG:4326');
      // 自动记录导入格式与源坐标
      setNote(
        result.format !== 'unknown'
          ? `已导入 ${FORMAT_LABEL[result.format]} · ${result.fc.features.length} 个要素`
          : `${result.fc.features.length} 个要素`
      );
      setBusy(false);
    } catch (e: any) {
      setError(e?.message || '解析失败，请检查文件是否有效。');
      setBusy(false);
    }
  }, []);

  // 拖拽
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault(); setDragOver(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles]
  );

  const resetAll = useCallback(() => {
    setParsed(null); setConverted(null); setError(''); setNote(''); setBusy(false);
    setSourceCrs('EPSG:4326'); setDoReproject(false); setTargetCrsKind('EPSG:3857'); setTargetFormat('geojson');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const doConvert = useCallback(async () => {
    if (!parsed) return;
    setBusy(true); setError(''); setConverted(null);
    try {
      const geo = await import('@/lib/geo');
      // 1) 重投影（若启用）
      let fc = parsed.fc;
      let outCrs = sourceCrsValue;
      if (doReproject && sourceCrsValue !== 'EPSG:4326') {
        // 源非 WGS84：先归到 WGS84 再投影到目标，保证一致
        fc = geo.reprojectFC(fc, sourceCrsValue, { kind: 'EPSG:4326' });
        outCrs = 'EPSG:4326';
      }
      if (doReproject) {
        fc = geo.reprojectFC(fc, outCrs, { kind: targetCrsKind as CrsKind, crs: customCrs });
        outCrs = targetCrsKind === 'custom' ? customCrs : targetCrsKind === 'utm' ? 'utm' : targetCrsKind;
      }

      // 2) 导出目标格式
      const stem = parsed.stem;
      let result: ExportResult;
      switch (targetFormat) {
        case 'geojson': {
          const text = JSON.stringify(fc, null, 2);
          result = { content: new TextEncoder().encode(text).buffer, fileName: `${stem}.geojson`, mime: 'application/geo+json' };
          break;
        }
        case 'shapefile': {
          // 打包为单个 .zip（.shp/.shx/.dbf/.prj/.cpg 五件套），其他软件解压即用
          const zip = geo.writeShapefileZip(fc, outCrs === 'utm' ? 'EPSG:4326' : outCrs, stem);
          result = {
            content: zip.content.slice().buffer,
            fileName: zip.fileName,
            mime: 'application/zip',
            note: '内含 .shp / .shx / .dbf / .prj / .cpg 五件套，解压后可直接导入 ArcGIS / QGIS',
          };
          break;
        }
        case 'topojson': {
          const t = geo.fcToTopoJSON(fc);
          result = { content: new TextEncoder().encode(t.text).buffer, fileName: `${stem}.topojson`, mime: 'application/json', note: t.note };
          break;
        }
        case 'kml': {
          const text = geo.fcToKML(fc);
          result = { content: new TextEncoder().encode(text).buffer, fileName: `${stem}.kml`, mime: 'application/vnd.google-earth.kml+xml' };
          break;
        }
        case 'wkt': {
          const text = geo.fcToWKT(fc);
          result = {
            content: new TextEncoder().encode(text).buffer,
            fileName: `${stem}.wkt`,
            mime: 'text/plain',
            note: fc.features.length > 1 ? '多要素按行输出（每行一个几何），各软件文本导入通用' : undefined,
          };
          break;
        }
        case 'csv': {
          const t = geo.fcToCSV(fc);
          result = { content: new TextEncoder().encode(t.text).buffer, fileName: `${stem}.csv`, mime: 'text/csv', note: t.isPoints ? '已导出为 经纬度 表列' : '含 wkt 几何列，可用任意表处理打开' };
          break;
        }
        default:
          throw new Error('请选择导出格式');
      }
      setConverted(result);
      setBusy(false);
      setNote('转换完成 ✓ 点击「下载」保存文件');
    } catch (e: any) {
      setError(e?.message || '转换失败');
      setBusy(false);
    }
  }, [parsed, targetFormat, targetCrsKind, customCrs, doReproject, sourceCrsValue]);

  const downloadAll = useCallback(() => {
    if (!converted) return;
    saveBytes(converted); // 单个文件（SHP 为 zip 包）
  }, [converted]);

  return (
    <article className="explore-card relative h-full overflow-hidden rounded-2xl">
      <span className="corner" aria-hidden="true" />
      <div className="p-6 md:p-8">
        {/* header */}
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em]">
            <span className="marker-dot" />
            <span className="text-accent">{copy.en}</span>
          </div>
          <span className="mono-label !text-accent">100% 本地处理 · 数据不上传</span>
        </div>
        <h2 className="relative mt-4 text-[1.5rem] font-bold leading-tight text-ink">{copy.title}</h2>
        <p className="relative mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{copy.desc}</p>

        {/* 导入区 */}
        <div
          className={`relative mt-6 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-accent/70 bg-accent/5' : 'border-line-strong'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="font-mono text-[12px] tracking-[0.14em] text-ink-faint">{copy.importEn}</div>
          <p className="mt-3 text-[14.5px] text-ink-soft">{copy.drop}</p>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            {copy.importFormats}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-4 cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_0_24px_var(--accent-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:opacity-50"
          >
            {copy.browse}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".geojson,.json,.zip,.shp,.dbf,.prj,.cpg,.topojson,.kml,.kmz,.gpx,.wkt,.txt,.csv,.tsv"
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          />
          {busy && <p className="mt-4 text-[13px] text-ink-faint">{copy.parsing}</p>}
        </div>

        {error && (
          <div className="relative mt-4 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-[13.5px] text-accent">
            ✕ {copy.parseError}：{error}
          </div>
        )}

        {/* 工作区 */}
        {parsed && (
          <div className="relative mt-6 space-y-6">
            {/* 概览条 */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-panel/60 px-4 py-3 font-mono text-[12px] text-ink-soft">
              <span><b className="text-accent">{FORMAT_LABEL[parsed.format]}</b> · {parsed.fc.features.length} 要素</span>
              <span>{countGeomTypes(parsed.fc)}</span>
              {note && <span className="text-ink-faint">{note}</span>}
            </div>
            {parsed.warnings.map((w, i) => (
              <div key={i} className="text-[12.5px] text-ink-faint">⚠ {w}</div>
            ))}
            {parsed.sourceCrs !== 'EPSG:4326' && parsed.sourceCrs !== '' && (
              <p className="text-[12.5px] text-ink-soft">
                源数据疑似坐标系：<b className="text-accent">{parsed.sourceCrs}</b>（已自动填入左侧）。
              </p>
            )}

            {/* 控制面板 */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* 坐标 */}
              <div className="rounded-xl border border-line bg-panel/40 p-4">
                <div className="mono-label">{copy.crsSource}</div>
                <input
                  value={sourceCrs}
                  onChange={(e) => setSourceCrs(e.target.value)}
                  placeholder="EPSG:4326 或 proj4 字符串"
                  className="mt-2 w-full rounded-lg border border-line bg-panel-solid px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-accent/60"
                />
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
                  <input type="checkbox" checked={doReproject} onChange={(e) => setDoReproject(e.target.checked)} className="accent-accent" />
                  {copy.transform}
                </label>
                {doReproject && (
                  <>
                    <div className="mono-label mt-3">{copy.crsTarget}</div>
                    <select
                      value={targetCrsKind}
                      onChange={(e) => setTargetCrsKind(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-line bg-panel-solid px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-accent/60"
                    >
                      {CRS_PRESETS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {targetCrsKind === 'custom' && (
                      <input
                        value={customCrs}
                        onChange={(e) => setCustomCrs(e.target.value)}
                        placeholder="+proj=... "
                        className="mt-2 w-full rounded-lg border border-line bg-panel-solid px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-accent/60"
                      />
                    )}
                  </>
                )}
              </div>

              {/* 导出 */}
              <div className="rounded-xl border border-line bg-panel/40 p-4">
                <div className="mono-label">{copy.target}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {OUTPUT_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setTargetFormat(f.value)}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                        targetFormat === f.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-line text-ink-soft hover:border-accent/50 hover:text-accent'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={doConvert}
                    className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_0_24px_var(--accent-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:opacity-50"
                  >
                    {busy ? copy.downloading : copy.convert}
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    {copy.reset}
                  </button>
                  {/* 下载按钮：位于「转换 / 重置」右侧，转换完成后弹出 */}
                  {converted && (
                    <button
                      type="button"
                      onClick={downloadAll}
                      className="animate-pulse-once cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_0_24px_var(--accent-glow)] ring-2 ring-accent/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
                    >
                      {copy.download} ↓
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 结果 + 预览 tabs */}
            <div className="rounded-xl border border-line bg-panel/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 rounded-lg border border-line p-1">
                  {(
                    [
                      ['map', copy.map],
                      ['table', copy.table],
                      ['stats', copy.stats],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                        view === v ? 'bg-accent text-white' : 'text-ink-soft hover:text-accent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="mono-label shrink-0">{copy.basemap}</span>
                  <BasemapToggle />
                </div>
              </div>

              <div className="mt-4">
                {view === 'map' && <MapPreviewView fc={workingFC} copy={copy} />}
                {view === 'table' && <TableView fc={workingFC} />}
                {view === 'stats' && <StatsView fc={workingFC} sourceCrs={sourceCrsValue} />}
              </div>

              {converted && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
                  <span className="text-[13.5px] text-ink">
                    ✓ {converted.fileName} · {fmtBytes(converted.content.byteLength)}
                  </span>
                  {converted.note && <span className="text-[12.5px] text-ink-faint">{converted.note}</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* ═════════ 底图选择（全局信号用于 MapPreviewView） ═════════ */

/** 图层切换用的模块级信号（简单事件总线，避免状态层层下传导致地图重建）。 */
type BasemapKind = 'amap' | 'esri';
const BASEMAP_EMITTER = {
  current: 'amap' as BasemapKind,
  listeners: new Set<(k: BasemapKind) => void>(),
  set(k: BasemapKind) { this.current = k; this.listeners.forEach((l) => l(k)); },
  on(l: (k: BasemapKind) => void) { this.listeners.add(l); return () => this.listeners.delete(l); },
};

function BasemapToggle() {
  const [k, setK] = useState<BasemapKind>('amap');
  return (
    <div className="flex rounded-lg border border-line p-0.5 text-[12.5px]">
      {(
        [
          ['amap', '高德'],
          ['esri', 'Esri'],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => { setK(v); BASEMAP_EMITTER.set(v); }}
          className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${
            k === v ? 'bg-accent text-white' : 'text-ink-soft hover:text-accent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ═════════ 地图预览（Leaflet + 高德/Esri） ═════════ */

const AMAP_STYLE_LAYER = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** 浏览器端才加载 Leaflet（SSR 安全）。 */
let leafletCache: typeof LeafletNS | null = null;
async function loadLeaflet(): Promise<typeof LeafletNS> {
  if (!leafletCache) leafletCache = (await import('leaflet')).default;
  return leafletCache;
}

function makeTileLayers(L: typeof LeafletNS) {
  const amap = L.tileLayer(AMAP_STYLE_LAYER, {
    maxZoom: 19,
    subdomains: ['1', '2', '3', '4'],
    attribution: '高德地图',
  });
  const esri = L.tileLayer(ESRI_SATELLITE, {
    maxZoom: 19,
    attribution: 'Esri',
  });
  return { amap, esri };
}

/* ── 图层管理：点 / 线 / 面三类独立图层（显隐、颜色、缩放） ── */

type LayerClass = 'point' | 'line' | 'polygon';

const LAYER_META: { key: LayerClass; name: string }[] = [
  { key: 'point', name: '点' },
  { key: 'line', name: '线' },
  { key: 'polygon', name: '面' },
];

const DEFAULT_COLORS: Record<LayerClass, string> = {
  point: '#ff7a45',
  line: '#3b82f6',
  polygon: '#22c55e',
};

type LayerState = Record<LayerClass, { visible: boolean; color: string }>;

const DEFAULT_LAYER_STATE: LayerState = {
  point: { visible: true, color: DEFAULT_COLORS.point },
  line: { visible: true, color: DEFAULT_COLORS.line },
  polygon: { visible: true, color: DEFAULT_COLORS.polygon },
};

/** 按几何类别把要素分到三个 Leaflet 图层（点/线/面），使用传入颜色。 */
function geometryLayersFor(
  L: typeof LeafletNS,
  fc: GjFeatureCollection,
  onSelect: (f: any) => void,
  colors: Record<LayerClass, string>
): Record<LayerClass, LeafletNS.FeatureGroup> {
  const pointLayer = L.featureGroup();
  const lineLayer = L.featureGroup();
  const faceLayer = L.featureGroup();
  const groups: Record<LayerClass, LeafletNS.FeatureGroup> = { point: pointLayer, line: lineLayer, polygon: faceLayer };

  const onClick = (e: LeafletNS.LeafletMouseEvent, f: any) => {
    onSelect({ props: f?.properties || {}, latlng: e.latlng });
  };

  fc.features.forEach((f) => {
    const g = f.geometry;
    if (!g) return;
    if (g.type === 'Point') {
      L.circleMarker(g.coordinates.slice(0, 2) as [number, number], {
        radius: 5, color: colors.point, weight: 1.5, fillOpacity: 0.85,
      }).addTo(pointLayer).on('click', (e) => onClick(e, f));
    } else if (g.type === 'MultiPoint') {
      (g.coordinates as number[][]).forEach((c) => {
        L.circleMarker(c.slice(0, 2) as [number, number], {
          radius: 5, color: colors.point, weight: 1.5, fillOpacity: 0.85,
        }).addTo(pointLayer).on('click', (e) => onClick(e, f));
      });
    } else if (g.type === 'LineString' || g.type === 'MultiLineString') {
      L.geoJSON({ type: 'Feature', properties: f.properties, geometry: g } as any, {
        style: { color: colors.line, weight: 2, opacity: 0.9 },
        onEachFeature: (_ff, layer) => layer.on('click', (e) => onClick(e, f)),
      }).addTo(lineLayer);
    } else {
      // Polygon / MultiPolygon / GeometryCollection → 面图层
      L.geoJSON({ type: 'Feature', properties: f.properties, geometry: g } as any, {
        style: { color: colors.polygon, weight: 2, opacity: 0.9, fillOpacity: 0.28 },
        onEachFeature: (_ff, layer) => layer.on('click', (e) => onClick(e, f)),
      }).addTo(faceLayer);
    }
  });

  return groups;
}

/** 统计三类图层的要素数（与渲染分桶一致：GeometryCollection 计入面）。 */
function countLayers(fc: GjFeatureCollection): Record<LayerClass, number> {
  const c: Record<LayerClass, number> = { point: 0, line: 0, polygon: 0 };
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Point' || g.type === 'MultiPoint') c.point++;
    else if (g.type === 'LineString' || g.type === 'MultiLineString') c.line++;
    else c.polygon++;
  }
  return c;
}

function MapPreviewView({ fc, copy }: { fc: GjFeatureCollection; copy: ConverterCopy }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const groupsRef = useRef<Record<LayerClass, LeafletNS.FeatureGroup> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [layerState, setLayerState] = useState<LayerState>(DEFAULT_LAYER_STATE);
  const [clicked, setClicked] = useState<{ props: Record<string, unknown>; latlng: LeafletNS.LatLng } | null>(null);

  const counts = useMemo(() => countLayers(fc), [fc]);

  // 初始建图（一次）：Leaflet 动态加载只在浏览器发生。
  // 建图是异步的，统一用 mapReady 状态通知数据 effect「地图已可用」，避免异步竞态丢渲染。
  useEffect(() => {
    let disposed = false;
    let off: (() => void) | null = null;
    (async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = await loadLeaflet();
      if (disposed || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      const layers = makeTileLayers(L);
      layers.amap.addTo(map);
      map.setView([30.5929, 114.3052], 4);
      mapRef.current = map;
      groupsRef.current = { point: L.featureGroup(), line: L.featureGroup(), polygon: L.featureGroup() };
      L.control.attribution({ prefix: false }).addAttribution('高德 | Esri').addTo(map);

      // 底图切换
      let cur = layers.amap;
      off = BASEMAP_EMITTER.on((k) => {
        const next = k === 'esri' ? layers.esri : layers.amap;
        map.removeLayer(cur as any);
        next.addTo(map);
        cur = next;
      });
      setMapReady(true);
    })();
    return () => {
      disposed = true;
      off?.();
      mapRef.current?.remove();
      mapRef.current = null;
      groupsRef.current = null;
    };
  }, []);

  // 数据变化 → 重建点/线/面三类图层，按当前开关显隐，并自动缩放至图层整体范围。
  useEffect(() => {
    if (!mapReady) return;
    (async () => {
      const map = mapRef.current, prev = groupsRef.current;
      if (!map || !prev) return;
      const L = await loadLeaflet();
      for (const { key } of LAYER_META) {
        if (map.hasLayer(prev[key])) map.removeLayer(prev[key]);
      }
      if (fc.features.length === 0) {
        groupsRef.current = { point: L.featureGroup(), line: L.featureGroup(), polygon: L.featureGroup() };
        return; // 数据清空：不画，保持底图
      }
      const groups = geometryLayersFor(L, fc, (sel) => setClicked(sel), {
        point: layerState.point.color,
        line: layerState.line.color,
        polygon: layerState.polygon.color,
      });
      groupsRef.current = groups;
      for (const { key } of LAYER_META) {
        if (layerState[key].visible) groups[key].addTo(map);
      }
      // 自动缩放至图层（导入 / 切回地图视图时触发）
      let bounds: LeafletNS.LatLngBounds | null = null;
      for (const { key } of LAYER_META) {
        const b = groups[key].getBounds();
        if (b.isValid()) bounds = bounds ? bounds.extend(b) : b;
      }
      if (bounds) {
        try {
          map.fitBounds(bounds, { maxZoom: 14, padding: [20, 20] });
        } catch { /* 无界 */ }
      }
    })();
    // layerState 刻意不在依赖里：颜色/显隐由下面两个 effect 增量处理，避免整组重建。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fc, mapReady]);

  // 颜色修改 → setStyle 原地更新，不重建图层（拖动取色器也能流畅跟随）。
  useEffect(() => {
    if (!mapReady) return;
    const groups = groupsRef.current;
    if (!groups) return;
    groups.point.setStyle({ color: layerState.point.color });
    groups.line.setStyle({ color: layerState.line.color });
    groups.polygon.setStyle({ color: layerState.polygon.color });
  }, [mapReady, layerState.point.color, layerState.line.color, layerState.polygon.color]);

  // 显隐开关 → 整组 add / remove。
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current, groups = groupsRef.current;
    if (!map || !groups) return;
    for (const { key } of LAYER_META) {
      if (layerState[key].visible) {
        if (!map.hasLayer(groups[key])) groups[key].addTo(map);
      } else if (map.hasLayer(groups[key])) {
        map.removeLayer(groups[key]);
      }
    }
  }, [mapReady, layerState.point.visible, layerState.line.visible, layerState.polygon.visible]);

  const zoomToLayer = (key: LayerClass) => {
    const map = mapRef.current, groups = groupsRef.current;
    if (!map || !groups) return;
    const b = groups[key].getBounds();
    if (b.isValid()) map.fitBounds(b, { maxZoom: 14, padding: [20, 20] });
  };

  const isWgs84 = fc.features.length === 0; // 简化；实际判断在 stats/view 里做

  return (
    <div>
      <div ref={containerRef} className="h-[52vh] min-h-[320px] w-full rounded-lg border border-line bg-[#dcded6]" />
      {/* 图层管理：显隐 / 要素数 / 颜色 / 定位 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-panel-solid px-4 py-2.5">
        <span className="mono-label">图层</span>
        {LAYER_META.map(({ key, name }) => {
          const st = layerState[key];
          const has = counts[key] > 0;
          return (
            <div key={key} className={`flex items-center gap-2 text-[13px] ${has ? 'text-ink' : 'text-ink-faint opacity-50'}`}>
              <input
                type="checkbox"
                checked={st.visible}
                disabled={!has}
                title={`显示/隐藏「${name}」图层`}
                onChange={() => setLayerState((s) => ({ ...s, [key]: { ...s[key], visible: !s[key].visible } }))}
                className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
              />
              <span>{name}</span>
              <span className="font-mono text-[12px] text-ink-faint">{counts[key]}</span>
              <input
                type="color"
                value={st.color}
                disabled={!has}
                title={`修改「${name}」图层颜色`}
                onChange={(e) => setLayerState((s) => ({ ...s, [key]: { ...s[key], color: e.target.value } }))}
                className="h-5 w-6 cursor-pointer rounded border border-line bg-transparent p-0 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={!has}
                onClick={() => zoomToLayer(key)}
                title={`缩放至「${name}」图层`}
                className="cursor-pointer rounded px-1 py-0.5 text-[12px] text-ink-soft transition-colors hover:text-accent disabled:cursor-not-allowed disabled:hover:text-ink-soft"
              >
                定位
              </button>
            </div>
          );
        })}
      </div>
      {clicked && (
        <div className="mt-3 rounded-lg border border-line bg-panel-solid p-3">
          <div className="mono-label mb-1.5">
            {clicked.latlng.lat.toFixed(5)}, {clicked.latlng.lng.toFixed(5)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
            {Object.entries(clicked.props).slice(0, 12).map(([k, v]) => (
              <span key={k} className="truncate"><b className="text-ink">{k}:</b> {String(v)}</span>
            ))}
            {Object.keys(clicked.props).length === 0 && <span className="italic text-ink-faint">（无属性）</span>}
          </div>
        </div>
      )}
      {!isWgs84 && <GcjHint copy={copy} />}
    </div>
  );
}

function GcjHint({ copy }: { copy: ConverterCopy }) {
  return (
    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-faint">
      {copy.gcjTip}
    </p>
  );
}

/* ═════════ 属性表 ═════════ */

function TableView({ fc }: { fc: GjFeatureCollection }) {
  const cols = useMemo(() => {
    const set = new Set<string>();
    for (const f of fc.features) for (const k of Object.keys(f.properties || {})) set.add(k);
    return [...set].slice(0, 20);
  }, [fc]);
  const rows = fc.features.slice(0, 100);

  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="w-full text-left font-mono text-[12px]">
        <thead>
          <tr className="border-b border-line bg-panel">
            <th className="px-2 py-1.5 text-accent">#</th>
            {cols.map((c) => (
              <th key={c} className="max-w-[180px] truncate px-2 py-1.5 text-ink">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => (
            <tr key={i} className="border-b border-line/50">
              <td className="px-2 py-1 text-ink-faint">{i + 1}</td>
              {cols.map((c) => (
                <td key={c} className="max-w-[180px] truncate px-2 py-1 text-ink-soft">
                  {fmtVal((f.properties || {})[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {fc.features.length === 0 && <div className="p-4 text-[13px] text-ink-faint">（无要素 / 无属性）</div>}
      {fc.features.length > rows.length && (
        <div className="border-t border-line bg-panel px-3 py-2 text-[12px] text-ink-faint">
          仅展示前 {rows.length} / {fc.features.length} 行
        </div>
      )}
    </div>
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/* ═════════ 统计面板 ═════════ */

function StatsView({ fc, sourceCrs }: { fc: GjFeatureCollection; sourceCrs: string }) {
  const stats = useMemo(() => {
    const geomCount: Record<string, number> = {};
    for (const f of fc.features) {
      const g = f.geometry;
      if (!g) continue;
      if (g.type === 'GeometryCollection') {
        (g.geometries as any[]).forEach((s) => { geomCount[s.type] = (geomCount[s.type] || 0) + 1; });
      } else geomCount[g.type] = (geomCount[g.type] || 0) + 1;
    }
    // bbox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (coords: any) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number') {
        if (isFinite(coords[0])) { minX = Math.min(minX, coords[0]); maxX = Math.max(maxX, coords[0]); }
        if (isFinite(coords[1])) { minY = Math.min(minY, coords[1]); maxY = Math.max(maxY, coords[1]); }
        return;
      }
      coords.forEach(walk);
    };
    for (const f of fc.features) if (f.geometry) walk(f.geometry.coordinates);
    const insideGeog = minX !== Infinity && minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;
    return { geomCount, bbox: minX !== Infinity ? [minX, minY, maxX, maxY] as number[] : null, insideGeog };
  }, [fc]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-line bg-panel/50 p-4">
        <div className="mono-label mb-2">几何类型</div>
        {Object.entries(stats.geomCount).length === 0 && <div className="text-[13px] text-ink-faint">空</div>}
        {Object.entries(stats.geomCount).map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line/40 py-1 text-[13px]">
            <span className="text-ink-soft">{k}</span>
            <span className="font-mono text-ink">{v}</span>
          </div>
        ))}
        {fc.features.length > 0 && (
          <div className="mt-2 flex justify-between text-[13px]">
            <span className="text-ink-soft">合计</span>
            <span className="font-mono text-accent">{fc.features.length}</span>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line bg-panel/50 p-4">
        <div className="mono-label mb-2">范围（bbox）</div>
        {stats.bbox ? (
          <>
            <div className="text-[13px] text-ink-soft leading-relaxed">
              minX <b className="font-mono text-ink">{stats.bbox[0].toFixed(5)}</b> · minY <b className="font-mono text-ink">{stats.bbox[1].toFixed(5)}</b>
              <br />
              maxX <b className="font-mono text-ink">{stats.bbox[2].toFixed(5)}</b> · maxY <b className="font-mono text-ink">{stats.bbox[3].toFixed(5)}</b>
            </div>
            <div className={`mt-2 inline-block rounded px-2 py-0.5 text-[11.5px] ${stats.insideGeog ? 'bg-accent/10 text-accent' : 'bg-panel-solid text-ink-faint'}`}>
              {stats.insideGeog ? '✓ 坐标在经纬度范围（WGS84/CGCS2000 地理坐标）' : '⚠ 坐标超出经纬度范围 —— 可能是投影坐标，请设置正确的源坐标系'}
            </div>
            <div className="mt-2 text-[12px] text-ink-faint">当前源坐标系：{sourceCrs}</div>
          </>
        ) : (
          <div className="text-[13px] text-ink-faint">空数据</div>
        )}
      </div>
    </div>
  );
}

/* ═════════ 工具 ═════════ */

function countGeomTypes(fc: GjFeatureCollection): string {
  const count: Record<string, number> = {};
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'GeometryCollection') (g.geometries as any[]).forEach((s) => { count[s.type] = (count[s.type] || 0) + 1; });
    else count[g.type] = (count[g.type] || 0) + 1;
  }
  return Object.entries(count).map(([k, v]) => `${k}×${v}`).join(' · ');
}

function fmtBytes(n: number): string {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
}

function saveBytes(result: ExportResult | { fileName: string; content: Uint8Array | ArrayBuffer; mime?: string }): void {
  const { fileName, content } = result;
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
  const mime = (result as any).mime || 'application/octet-stream';
  // 复制一份 ArrayBuffer 以避免 TS 对 SharedArrayBuffer 泛型的严格报错
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
