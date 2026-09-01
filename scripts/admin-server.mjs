/**
 * EZNINE 后台 API 服务器（本地内容管理）。
 *
 * 纯 Node 内置模块实现（无依赖），监听 127.0.0.1:3001。
 * 与 Next.js 静态导出（output: 'export'）解耦：站点照常构建部署，
 * 内容管理通过本服务在本地读写 content/ 与 public/uploads/。
 *
 * 启动：npm run admin
 * 密码：环境变量 ADMIN_PASSWORD，或 site.config.json 的 adminPassword 字段。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.ADMIN_PORT || 3001);
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const UPLOADS = path.join(ROOT, 'public', 'uploads');
const SALT = '::eznine-admin';

let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf-8'));
} catch {}
const PASSWORD = process.env.ADMIN_PASSWORD || cfg.adminPassword || 'eznine';
const TOKEN = crypto.createHash('sha256').update(PASSWORD + SALT).digest('hex');

const TYPES = ['notes', 'research', 'projects'];

/* ---------------- 与 lib/content.ts 一致的 slug 规则 ---------------- */

function slugify(input) {
  const s = String(input)
    .replace(/\.mdx?$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return s || 'post';
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'out']);

function collectMd(abs, rel = '') {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...collectMd(path.join(abs, e.name), relPath));
    } else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) out.push(relPath);
  }
  return out.sort();
}

/** type → [{slug, file(绝对路径), relPath}] */
function listFiles(type) {
  const abs = path.join(CONTENT, type);
  return collectMd(abs).map((relPath) => ({
    slug: slugify(relPath),
    relPath,
    file: path.join(abs, relPath),
  }));
}

/* ---------------- 与 lib/content.ts 一致的目录推断 ---------------- */

/** 一级子目录名推断大类：中文原样保留，纯 ASCII 做 Title Case */
function folderCategory(dir) {
  const name = dir.replace(/^\d+[-_\s]*/, '');
  if (!name) return undefined;
  if (/[^\x00-\x7F]/.test(name)) return name;
  const label = name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return label || undefined;
}

/** 二级子目录名推断章节：去前导编号后原样 */
function folderChapter(dir) {
  const name = dir.replace(/^\d+[-_\s]*/, '');
  return name || undefined;
}

/** relPath → { category, chapter }（目录推断；frontmatter 优先在外层做） */
function inferFromPath(relPath) {
  const segments = relPath.split('/');
  const depth = segments.length - 1;
  return {
    category: depth >= 1 ? folderCategory(segments[0]) : undefined,
    chapter: depth >= 2 ? folderChapter(segments[1]) : undefined,
  };
}

/** 文章的生效分类/章节：frontmatter 优先，缺省回退目录推断 */
function effectiveTaxonomy(relPath, fm) {
  const inferred = inferFromPath(relPath);
  return {
    category: fm.category ?? inferred.category,
    chapter: fm.chapter ?? inferred.chapter,
  };
}

/* ---------------- frontmatter 解析 / 序列化 ---------------- */

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    const val = valRaw.trim();
    if (!val) continue;
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      if (!inner) {
        data[key] = [];
      } else {
        try {
          data[key] = JSON.parse(val);
        } catch {
          // YAML 流式数组（值可能无引号，如 [GIS, 遥感]）：JSON.parse 失败时按逗号拆
          data[key] = inner
            .split(',')
            .map((s) => {
              const t = s.trim();
              if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
                return t.slice(1, -1);
              return t;
            })
            .filter(Boolean);
        }
      }
    } else if (val.startsWith('{') && val.endsWith('}')) {
      try {
        data[key] = JSON.parse(val);
      } catch {
        data[key] = val;
      }
    } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      data[key] = val.slice(1, -1);
    } else {
      data[key] = val;
    }
  }
  return { data, content: m[2] };
}

const yamlStr = (v) => JSON.stringify(String(v));

/** 解析日期：支持 YYYY/MM/DD 与 YYYY-MM-DD（非法日期返回 null），规范化输出 YYYY-MM-DD */
function normalizeDate(v) {
  const m = String(v).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  lines.push(`title: ${yamlStr(meta.title || '未命名')}`);
  lines.push(`date: ${yamlStr(meta.date || new Date().toISOString().slice(0, 10))}`);
  if (meta.summary) lines.push(`summary: ${yamlStr(meta.summary)}`);
  if (meta.category) lines.push(`category: ${yamlStr(meta.category)}`);
  if (meta.chapter) lines.push(`chapter: ${yamlStr(meta.chapter)}`);
  if (meta.order !== undefined && meta.order !== null && meta.order !== '')
    lines.push(`order: ${Number(meta.order) || 0}`);
  if (meta.hidden === true || meta.hidden === 'true') lines.push('hidden: true');
  if (Array.isArray(meta.tags) && meta.tags.length) lines.push(`tags: ${JSON.stringify(meta.tags)}`);
  if (meta.status) lines.push(`status: ${yamlStr(meta.status)}`);
  if (Array.isArray(meta.tech) && meta.tech.length) lines.push(`tech: ${JSON.stringify(meta.tech)}`);
  if (meta.demo) lines.push(`demo: ${yamlStr(meta.demo)}`);
  if (meta.github) lines.push(`github: ${yamlStr(meta.github)}`);
  if (Array.isArray(meta.links) && meta.links.length)
    lines.push(`links: ${JSON.stringify(meta.links.map((l) => ({ label: l.label, url: l.url })))}`);
  lines.push('---', '');
  return lines.join('\n');
}

/* ---------------- 工具 ---------------- */

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const isAuthed = (req) => req.headers['x-admin-token'] === TOKEN;

/** 文章 meta（category/chapter）→ 子目录层级；章节依附大类，无大类则根目录 */
function taxonomyDirs(type, meta) {
  const cat = String(meta?.category || '').trim();
  const chap = cat && String(meta?.chapter || '').trim();
  if (!cat) return [];
  const typeRoot = path.join(CONTENT, type);
  // 优先复用已存在的分类文件夹（'02-web-basics' ←→ 'Web Basics'），没有才按大类名新建
  let catDir = cat;
  try {
    for (const e of fs.readdirSync(typeRoot, { withFileTypes: true })) {
      if (e.isDirectory() && folderCategory(e.name) === cat) {
        catDir = e.name;
        break;
      }
    }
  } catch {}
  if (!chap) return [catDir];
  // 章节同理：复用该大类下已有的章节文件夹（'01-环境配置' ←→ '环境配置'）
  let chapDir = chap;
  try {
    for (const e of fs.readdirSync(path.join(typeRoot, catDir), { withFileTypes: true })) {
      if (e.isDirectory() && folderChapter(e.name) === chap) {
        chapDir = e.name;
        break;
      }
    }
  } catch {}
  return [catDir, chapDir];
}

/**
 * 在大类/章节目录下放置文章文件：返回 { file, slug }。
 * slug 与前台一致——由完整 relPath 派生（目录名参与 slug）。
 * 文件名沿用清洗后的原名（中文文件名原样保留，与直接拖入一致）；
 * excludeFile 用于更新场景排除文章自身，避免原地保存时 slug 漂移。
 */
function placeFile(type, dirs, rawName, excludeFile) {
  const baseName =
    String(rawName || '')
      .trim()
      .replace(/\.mdx?$/, '')
      .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, '-')
      .slice(0, 64)
      .trim() || 'post-' + crypto.randomBytes(3).toString('hex');
  const taken = new Set(
    listFiles(type)
      .filter((f) => f.file !== excludeFile)
      .map((f) => f.slug),
  );
  for (let i = 0; ; i++) {
    const name = i === 0 ? baseName : `${baseName}-${i + 1}`;
    const rel = [...dirs, `${name}.md`].join('/');
    const slug = slugify(rel);
    const file = path.join(CONTENT, type, rel);
    if (file === excludeFile) return { file, slug };
    if (!taken.has(slug) && !fs.existsSync(file)) return { file, slug };
  }
}

/* ---------------- 路由 ---------------- */

async function handle(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;
  const type = url.searchParams.get('type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-admin-token',
    });
    return res.end();
  }

  /* ---- 登录（无需鉴权） ---- */
  if (p === '/api/login' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    if (body.password === PASSWORD) return json(res, 200, { ok: true, token: TOKEN });
    return json(res, 401, { error: '密码错误' });
  }

  /* ---- 其余全部需要鉴权 ---- */
  if (!isAuthed(req)) return json(res, 401, { error: '未登录或令牌失效' });

  /* ---- 文章列表 ---- */
  if (p === '/api/posts' && req.method === 'GET') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const items = listFiles(type)
      .map(({ slug, relPath, file }) => {
        const { data, content } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
        const stat = fs.statSync(file);
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const eff = effectiveTaxonomy(relPath, data);
        return {
          slug,
          title: data.title ?? titleMatch?.[1]?.trim() ?? slug,
          date: data.date ?? stat.mtime.toISOString().slice(0, 10),
          category: eff.category ?? '未分类',
          chapter: eff.chapter ?? '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          summary: data.summary ?? '',
          status: data.status ?? '',
          order: data.order !== undefined && data.order !== null && data.order !== '' ? Number(data.order) : undefined,
          hidden: data.hidden === true || data.hidden === 'true' || undefined,
        };
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return json(res, 200, { items });
  }

  /* ---- 单篇文章（原文） ---- */
  if (p === '/api/post' && req.method === 'GET') {
    const slug = url.searchParams.get('slug');
    if (!TYPES.includes(type) || !slug) return json(res, 400, { error: '参数不完整' });
    const found = listFiles(type).find((f) => f.slug === slug);
    if (!found) return json(res, 404, { error: '文章不存在' });
    const raw = fs.readFileSync(found.file, 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    return json(res, 200, { slug, relPath: found.relPath, meta: data, content });
  }

  /* ---- 新建：按大类/章节放入对应文件夹 ---- */
  if (p === '/api/posts' && req.method === 'POST') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const meta = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const dirs = taxonomyDirs(type, meta);
    const { file, slug } = placeFile(type, dirs, meta.slug || meta.title || '');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buildFrontmatter(meta) + '\n' + (meta.content || ''), 'utf-8');
    return json(res, 200, { ok: true, slug });
  }

  /* ---- 更新：目录跟随大类/章节变化（slug 由最终路径派生） ---- */
  if (p === '/api/posts' && req.method === 'PUT') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    if (body.hidden === false) delete body.hidden;
    const old = listFiles(type).find((f) => f.slug === body.slug);
    if (!old) return json(res, 404, { error: '文章不存在' });

    const dirs = taxonomyDirs(type, body);
    const oldName = path.basename(old.relPath).replace(/\.mdx?$/, '');
    const rawName =
      body.newSlug && body.newSlug !== body.slug ? body.newSlug : oldName;
    const { file: target, slug: newSlug } = placeFile(type, dirs, rawName, old.file);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buildFrontmatter(body) + '\n' + (body.content || ''), 'utf-8');
    if (target !== old.file) fs.unlinkSync(old.file);
    return json(res, 200, { ok: true, slug: newSlug });
  }

  /* ---- 列表快速修改（日期/分类）：只改 frontmatter、原地写回，不移动文件（slug 不变）。
        与编辑页的区别：编辑页改分类会搬文件；这里只改元数据，目录整理走编辑/批量修改 ---- */
  if (p === '/api/posts/meta' && req.method === 'PATCH') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    if (!body.slug) return json(res, 400, { error: '参数不完整' });
    const f = listFiles(type).find((x) => x.slug === body.slug);
    if (!f) return json(res, 404, { error: '文章不存在' });
    const raw = fs.readFileSync(f.file, 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    if (typeof body.date === 'string' && body.date.trim()) {
      const d = normalizeDate(body.date);
      if (!d) return json(res, 400, { error: '日期格式无效，支持 2026/09/01 或 2026-09-01' });
      data.date = d;
    }
    if (typeof body.category === 'string') {
      const c = body.category.trim();
      if (c) data.category = c;
      else delete data.category;
    }
    fs.writeFileSync(f.file, buildFrontmatter(data) + '\n' + (content || ''), 'utf-8');
    return json(res, 200, { ok: true, slug: f.slug, date: data.date, category: data.category });
  }

  /* ---- 同日排序：批量写入 order 字段（前台与预览按 date → order → 标题排序） ---- */
  if (p === '/api/posts/reorder' && req.method === 'POST') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const list = Array.isArray(body.list) ? body.list : [];
    if (!list.length) return json(res, 200, { ok: true, updated: 0 });
    const files = new Map(listFiles(type).map((f) => [f.slug, f]));
    let updated = 0;
    for (const it of list) {
      const f = files.get(it.slug);
      if (!f) continue;
      const raw = fs.readFileSync(f.file, 'utf-8');
      const { data, content } = parseFrontmatter(raw);
      data.order = Number(it.order) || 0;
      fs.writeFileSync(f.file, buildFrontmatter(data) + '\n' + (content || ''), 'utf-8');
      updated++;
    }
    return json(res, 200, { ok: true, updated });
  }

  /* ---- 删除（并清理变空的章节/大类目录） ---- */
  if (p === '/api/posts' && req.method === 'DELETE') {
    const slug = url.searchParams.get('slug');
    if (!TYPES.includes(type) || !slug) return json(res, 400, { error: '参数不完整' });
    const found = listFiles(type).find((f) => f.slug === slug);
    if (!found) return json(res, 404, { error: '文章不存在' });
    fs.unlinkSync(found.file);
    try {
      const typeRoot = path.join(CONTENT, type);
      const parent = path.dirname(found.file);
      if (parent !== typeRoot && !fs.readdirSync(parent).length) fs.rmdirSync(parent);
      const grand = path.dirname(parent);
      if (path.dirname(grand) === typeRoot && !fs.readdirSync(grand).length) fs.rmdirSync(grand);
    } catch {}
    return json(res, 200, { ok: true });
  }

  /* ---- 批量导入 MD：统一大类 + 章节 + 追加标签 ---- */
  if (p === '/api/posts/bulk' && req.method === 'POST') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const files = Array.isArray(body.files) ? body.files : [];
    const category = String(body.category || '').trim();
    const chapter = String(body.chapter || '').trim();
    const addTags = (Array.isArray(body.tags) ? body.tags : [])
      .map((t) => String(t).trim())
      .filter(Boolean);

    const items = [];
    const skipped = [];
    for (const f of files) {
      const name = String(f?.name || '').replace(/\.mdx?$/, '');
      const raw = String(f?.content || '');
      if (!name) {
        skipped.push({ name: '(未命名)', reason: '缺少文件名' });
        continue;
      }
      const { data, content } = parseFrontmatter(raw);
      const meta = { ...data };
      if (!meta.title) {
        const h1 = content.match(/^#\s+(.+)$/m);
        meta.title = h1 ? h1[1].trim() : name;
      }
      if (!meta.date) meta.date = new Date().toISOString().slice(0, 10);
      if (category) meta.category = category;
      if (chapter) meta.chapter = chapter;
      const baseTags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
      meta.tags = [...new Set([...baseTags, ...addTags])];

      // 沿用导入的原文件名，放进大类/章节文件夹（复用已有目录，与直接拖入一致）
      const dirs = taxonomyDirs(type, { category, chapter });
      const { file, slug } = placeFile(type, dirs, meta.slug || name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buildFrontmatter(meta) + '\n' + content, 'utf-8');
      items.push({ slug, title: meta.title });
    }
    return json(res, 200, { ok: true, imported: items.length, items, skipped });
  }

  /* ---- 批量操作：删除 / 修改（大类、章节、加标签、移除标签） ---- */
  if (p === '/api/posts/batch' && req.method === 'POST') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const slugs = Array.isArray(body.slugs) ? body.slugs.map(String).filter(Boolean) : [];
    if (!slugs.length) return json(res, 400, { error: '未选择文章' });
    const files = listFiles(type).filter((f) => slugs.includes(f.slug));
    if (!files.length) return json(res, 404, { error: '文章不存在' });

    // 删除文件后清理变空的章节/大类目录
    const cleanupEmpty = (file) => {
      try {
        const typeRoot = path.join(CONTENT, type);
        const parent = path.dirname(file);
        if (parent !== typeRoot && !fs.readdirSync(parent).length) fs.rmdirSync(parent);
        const grand = path.dirname(parent);
        if (path.dirname(grand) === typeRoot && !fs.readdirSync(grand).length) fs.rmdirSync(grand);
      } catch {}
    };

    if (body.action === 'delete') {
      for (const f of files) {
        fs.unlinkSync(f.file);
        cleanupEmpty(f.file);
      }
      return json(res, 200, { ok: true, deleted: files.length });
    }

    if (body.action === 'update') {
      const setCategory = !!body.setCategory;
      const category = String(body.category || '').trim();
      const setChapter = !!body.setChapter;
      const chapter = String(body.chapter || '').trim();
      const addTags = (Array.isArray(body.addTags) ? body.addTags : [])
        .map((t) => String(t).trim())
        .filter(Boolean);
      const removeTags = (Array.isArray(body.removeTags) ? body.removeTags : [])
        .map((t) => String(t).trim())
        .filter(Boolean);
      const hiddenAction = String(body.hiddenAction || '').trim(); // '' | 'hide' | 'show'
      if (!setCategory && !setChapter && !addTags.length && !removeTags.length && !hiddenAction)
        return json(res, 400, { error: '没有可应用的修改' });

      let updated = 0;
      const moved = [];
      for (const f of files) {
        const raw = fs.readFileSync(f.file, 'utf-8');
        const { data, content } = parseFrontmatter(raw);
        const eff = effectiveTaxonomy(f.relPath, data);
        const meta = { ...data };

        // 生效值物化：改分类/章节时目录推断值写进 frontmatter，保证落盘位置与显示一致
        if (setCategory) meta.category = category;
        if (setChapter) {
          const finalCat = setCategory ? category : String(meta.category ?? eff.category ?? '');
          meta.chapter = finalCat ? chapter : '';
        }

        let tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
        if (addTags.length) tags = [...new Set([...tags, ...addTags])];
        if (removeTags.length) tags = tags.filter((t) => !removeTags.includes(t));
        meta.tags = tags;

        // 隐藏 / 恢复显示
        if (hiddenAction === 'hide') meta.hidden = true;
        else if (hiddenAction === 'show') delete meta.hidden;

        if (!setCategory && !setChapter) {
          // 仅改标签：原地重写，不动文件位置与 slug
          fs.writeFileSync(f.file, buildFrontmatter(meta) + '\n' + content, 'utf-8');
        } else {
          const finalCat = String(meta.category ?? eff.category ?? '');
          const finalChap = String(meta.chapter ?? eff.chapter ?? '');
          meta.category = finalCat;
          meta.chapter = finalChap;
          const dirs = taxonomyDirs(type, { category: finalCat, chapter: finalChap });
          const oldName = path.basename(f.relPath).replace(/\.mdx?$/, '');
          const { file: target, slug: newSlug } = placeFile(type, dirs, oldName, f.file);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, buildFrontmatter(meta) + '\n' + content, 'utf-8');
          if (target !== f.file) {
            fs.unlinkSync(f.file);
            cleanupEmpty(f.file);
            moved.push({ slug: newSlug, from: f.relPath });
          }
        }
        updated += 1;
      }
      return json(res, 200, { ok: true, updated, moved });
    }

    return json(res, 400, { error: '未知操作' });
  }

  /* ---- 外观设置（字号/颜色） ---- */
  if (p === '/api/appearance' && (req.method === 'GET' || req.method === 'PUT')) {
    const file = path.join(CONTENT, 'appearance.json');
    const DEFAULT_APPEARANCE = {
      sizes: { body: 16, listTitle: 17.5, listSummary: 14.5, pageTitle: 44, nav: 15 },
      colors: {
        dark: { ink: '', inkSoft: '', inkFaint: '', accent: '' },
        light: { ink: '', inkSoft: '', inkFaint: '', accent: '' },
      },
    };
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) return json(res, 200, DEFAULT_APPEARANCE);
      return json(res, 200, JSON.parse(fs.readFileSync(file, 'utf-8')));
    }
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf-8');
    return json(res, 200, { ok: true });
  }

  /* ---- 分类 / 标签 / 章节管理 ---- */
  if (p === '/api/taxonomy' && (req.method === 'GET' || req.method === 'PUT')) {
    const file = path.join(CONTENT, 'taxonomy.json');
    const empty = { categories: { notes: [], research: [], projects: [] }, chapters: {}, tags: [] };
    if (req.method === 'GET') {
      let base = {};
      try {
        base = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {}
      const data = { ...empty, ...base, chapters: { ...(base.chapters || {}) } };
      // 聚合文章实际使用的大类/章节（frontmatter 优先、目录推断兜底），补充为候选
      for (const t of TYPES) {
        data.categories[t] = [...(data.categories[t] || [])];
        for (const { relPath, file: f } of listFiles(t)) {
          const { data: fm } = parseFrontmatter(fs.readFileSync(f, 'utf-8'));
          const eff = effectiveTaxonomy(relPath, fm);
          if (eff.category && !data.categories[t].includes(eff.category)) data.categories[t].push(eff.category);
          if (eff.category && eff.chapter) {
            const list = (data.chapters[eff.category] = data.chapters[eff.category] || []);
            if (!list.includes(eff.chapter)) list.push(eff.chapter);
          }
        }
      }
      // 章节顺序以 taxonomy.json 为准（后台可拖拽排序）；文章聚合只追加缺失项，不重新排序
      for (const key of Object.keys(data.chapters)) {
        data.chapters[key] = [...new Set(data.chapters[key])];
      }
      return json(res, 200, data);
    }
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf-8');
    return json(res, 200, { ok: true });
  }

  /* ---- 重命名大类 / 章节：级联更新该类型所有文章的 frontmatter 与 taxonomy ---- */
  if (p === '/api/taxonomy/rename' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const kind = body.kind === 'chapter' ? 'chapter' : 'category';
    const from = String(body.from || '').trim();
    const to = String(body.to || '').trim();
    const owner = String(body.category || '').trim(); // 章节重命名时所属大类
    if (!from || !to || from === to) return json(res, 400, { error: '参数不完整' });
    if (kind === 'chapter' && !owner) return json(res, 400, { error: '缺少所属分类' });

    let updated = 0;
    for (const { relPath, file } of listFiles(type)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const { data, content } = parseFrontmatter(raw);
      // 按生效值（frontmatter 优先、目录推断兜底）匹配；命中则显式写入
      // frontmatter 覆盖目录推断——目录与 slug 不动，前台/后台显示一致
      const eff = effectiveTaxonomy(relPath, data);
      let changed = false;
      if (kind === 'category' && eff.category === from) {
        data.category = to;
        changed = true;
      }
      if (kind === 'chapter' && eff.chapter === from && (!owner || eff.category === owner)) {
        data.chapter = to;
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(file, buildFrontmatter(data) + '\n' + content, 'utf-8');
        updated += 1;
      }
    }

    const taxFile = path.join(CONTENT, 'taxonomy.json');
    let tax = { categories: { notes: [], research: [], projects: [] }, chapters: {}, tags: [] };
    try {
      tax = { ...tax, ...JSON.parse(fs.readFileSync(taxFile, 'utf-8')) };
    } catch {}
    tax.chapters = tax.chapters || {};
    if (kind === 'category') {
      for (const key of Object.keys(tax.categories || {})) {
        tax.categories[key] = (tax.categories[key] || []).map((c) => (c === from ? to : c));
      }
      if (tax.chapters[from]) {
        tax.chapters[to] = tax.chapters[from];
        delete tax.chapters[from];
      }
    } else if (Array.isArray(tax.chapters[owner])) {
      tax.chapters[owner] = tax.chapters[owner].map((c) => (c === from ? to : c));
    }
    fs.writeFileSync(taxFile, JSON.stringify(tax, null, 2) + '\n', 'utf-8');
    return json(res, 200, { ok: true, updated });
  }

  /* ---- 图片上传（原始二进制 body，?name= 文件名） ---- */
  if (p === '/api/upload' && req.method === 'POST') {
    const name = (url.searchParams.get('name') || 'image').replace(/[^\w.-]+/g, '_');
    const ext = (path.extname(name) || '.png').toLowerCase();
    if (!/^(\.png|\.jpe?g|\.gif|\.webp|\.svg|\.avif)$/.test(ext)) {
      return json(res, 400, { error: '不支持的图片格式' });
    }
    const buf = await readBody(req);
    if (!buf.length) return json(res, 400, { error: '空文件' });
    fs.mkdirSync(UPLOADS, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const file = `${stamp}-${crypto.randomBytes(3).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOADS, file), buf);
    return json(res, 200, { ok: true, url: `/uploads/${file}`, name: file });
  }

  /* ---- 已上传图片列表 ---- */
  if (p === '/api/uploads' && req.method === 'GET') {
    let names = [];
    try {
      names = fs.readdirSync(UPLOADS).filter((f) => !f.startsWith('.')).sort().reverse();
    } catch {}
    return json(res, 200, { items: names.map((n) => ({ name: n, url: `/uploads/${n}` })) });
  }

  return json(res, 404, { error: '接口不存在' });
}

http
  .createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      json(res, 500, { error: String(err?.message || err) });
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`EZNINE 后台服务已启动: http://127.0.0.1:${PORT}`);
    console.log(`提示：站点页面在 http://localhost:3000/admin 打开后台界面`);
    console.log(`密码来源：ADMIN_PASSWORD 环境变量 > site.config.json adminPassword > 默认 "eznine"`);
  })
  .on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.log(`端口 ${PORT} 已被占用：后台服务可能已在运行（如 npm run admin），本次跳过启动。`);
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  });
