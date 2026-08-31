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
    if (val.startsWith('[') || val.startsWith('{')) {
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

function buildFrontmatter(meta) {
  const lines = ['---'];
  lines.push(`title: ${yamlStr(meta.title || '未命名')}`);
  lines.push(`date: ${yamlStr(meta.date || new Date().toISOString().slice(0, 10))}`);
  if (meta.summary) lines.push(`summary: ${yamlStr(meta.summary)}`);
  if (meta.category) lines.push(`category: ${yamlStr(meta.category)}`);
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

function uniqueSlugFor(type, base) {
  const files = listFiles(type);
  let slug = base;
  if (slug === 'post' || !slug) slug = 'post-' + crypto.randomBytes(3).toString('hex');
  const taken = new Set(files.map((f) => f.slug));
  if (!taken.has(slug)) return slug;
  for (let i = 2; ; i++) {
    const s = `${slug}-${i}`;
    if (!taken.has(s)) return s;
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
      .map(({ slug, file }) => {
        const { data, content } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
        const stat = fs.statSync(file);
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return {
          slug,
          title: data.title ?? titleMatch?.[1]?.trim() ?? slug,
          date: data.date ?? stat.mtime.toISOString().slice(0, 10),
          category: data.category ?? '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          summary: data.summary ?? '',
          status: data.status ?? '',
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

  /* ---- 新建 ---- */
  if (p === '/api/posts' && req.method === 'POST') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const meta = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const slug = uniqueSlugFor(type, slugify(meta.slug || meta.title || ''));
    const file = path.join(CONTENT, type, `${slug}.md`);
    if (fs.existsSync(file)) return json(res, 409, { error: `slug "${slug}" 已存在` });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buildFrontmatter(meta) + '\n' + (meta.content || ''), 'utf-8');
    return json(res, 200, { ok: true, slug });
  }

  /* ---- 更新（可改 slug：改后移到该类型根目录） ---- */
  if (p === '/api/posts' && req.method === 'PUT') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const old = listFiles(type).find((f) => f.slug === body.slug);
    if (!old) return json(res, 404, { error: '文章不存在' });

    const newSlug = body.newSlug && body.newSlug !== body.slug ? uniqueSlugFor(type, slugify(body.newSlug)) : body.slug;
    const target =
      newSlug === body.slug
        ? old.file
        : path.join(CONTENT, type, `${newSlug}.md`);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buildFrontmatter(body) + '\n' + (body.content || ''), 'utf-8');
    if (target !== old.file) fs.unlinkSync(old.file);
    return json(res, 200, { ok: true, slug: newSlug });
  }

  /* ---- 删除 ---- */
  if (p === '/api/posts' && req.method === 'DELETE') {
    const slug = url.searchParams.get('slug');
    if (!TYPES.includes(type) || !slug) return json(res, 400, { error: '参数不完整' });
    const found = listFiles(type).find((f) => f.slug === slug);
    if (!found) return json(res, 404, { error: '文章不存在' });
    fs.unlinkSync(found.file);
    return json(res, 200, { ok: true });
  }

  /* ---- 批量导入 MD：统一分类 + 追加标签 ---- */
  if (p === '/api/posts/bulk' && req.method === 'POST') {
    if (!TYPES.includes(type)) return json(res, 400, { error: '无效的内容类型' });
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    const files = Array.isArray(body.files) ? body.files : [];
    const category = String(body.category || '').trim();
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
      const baseTags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
      meta.tags = [...new Set([...baseTags, ...addTags])];

      const slug = uniqueSlugFor(type, slugify(meta.slug || meta.title || name));
      const file = path.join(CONTENT, type, `${slug}.md`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buildFrontmatter(meta) + '\n' + content, 'utf-8');
      items.push({ slug, title: meta.title });
    }
    return json(res, 200, { ok: true, imported: items.length, items, skipped });
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

  /* ---- 分类 / 标签管理 ---- */
  if (p === '/api/taxonomy' && (req.method === 'GET' || req.method === 'PUT')) {
    const file = path.join(CONTENT, 'taxonomy.json');
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) {
        return json(res, 200, { categories: { notes: [], research: [], projects: [] }, tags: [] });
      }
      return json(res, 200, JSON.parse(fs.readFileSync(file, 'utf-8')));
    }
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf-8');
    return json(res, 200, { ok: true });
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
