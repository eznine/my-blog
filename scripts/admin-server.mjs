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
import { spawn, execSync } from 'node:child_process';
import AdmZip from 'adm-zip';

const PORT = Number(process.env.ADMIN_PORT || 3001);
const SERVER_STARTED_AT = Date.now();
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const UPLOADS = path.join(ROOT, 'public', 'uploads');
const DEMOS = path.join(ROOT, 'public', 'demos');
const CODE = path.join(ROOT, 'public', 'code');
const CODE_EXT = new Set([
  '.py', '.sh', '.bash', '.zsh', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.css', '.scss', '.html', '.htm', '.md', '.txt', '.json', '.yaml', '.yml',
  '.toml', '.r', '.m', '.ipynb', '.bat', '.cmd', '.ps1', '.c', '.cpp', '.h',
  '.hpp', '.java', '.go', '.rs', '.rb', '.php', '.sql',
]);
const SALT = '::eznine-admin';

let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf-8'));
} catch {}
const PASSWORD = process.env.ADMIN_PASSWORD || cfg.adminPassword || 'eznine';
const TOKEN = crypto.createHash('sha256').update(PASSWORD + SALT).digest('hex');

/* ---- AI 接入配置（环境变量优先，兜底 site.config.json 的 ai 字段） ---- */
const AI = {
  baseURL: (process.env.ADMIN_AI_BASE_URL || cfg.ai?.baseURL || '').trim(),
  apiKey: (process.env.ADMIN_AI_API_KEY || cfg.ai?.apiKey || '').trim(),
  model: (process.env.ADMIN_AI_MODEL || cfg.ai?.model || 'deepseek-chat').trim(),
};

/* ---- 自动重建（服务器部署用，ADMIN_AUTO_REBUILD=1 时启用）：
      内容/外观/分类保存后防抖触发 npm run build（DIST_DIR=out.tmp），
      成功后原子切换 out/，前台立即生效、构建过程不闪断。 ---- */
const AUTO_REBUILD = process.env.ADMIN_AUTO_REBUILD === '1';
let rebuildTimer = null;
let rebuilding = false;
let pendingAgain = false;

function scheduleRebuild(delay = 2500) {
  if (!AUTO_REBUILD) return;
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(runRebuild, delay);
}

function runRebuild() {
  if (rebuilding) {
    pendingAgain = true;
    return;
  }
  rebuilding = true;
  const started = Date.now();
  const child = spawn('npm', ['run', 'build'], {
    cwd: ROOT,
    env: {
      ...process.env,
      DIST_DIR: 'out.tmp',
      NEXT_PUBLIC_ADMIN_API: process.env.NEXT_PUBLIC_ADMIN_API || '/api',
      NODE_OPTIONS: '--max-old-space-size=2048',
    },
    shell: true,
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    rebuilding = false;
    if (code === 0) {
      try {
        const outDir = path.join(ROOT, 'out');
        const tmpDir = path.join(ROOT, 'out.tmp');
        const oldDir = outDir + '.old';
        if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true, force: true });
        if (fs.existsSync(outDir)) fs.renameSync(outDir, oldDir);
        fs.renameSync(tmpDir, outDir);
        fs.rmSync(oldDir, { recursive: true, force: true });
        console.log(`[rebuild] OK ${Date.now() - started}ms, out/ 已切换`);
      } catch (e) {
        console.error('[rebuild] 切换 out/ 失败:', e.message);
      }
    } else {
      console.error(`[rebuild] build 失败 code=${code}`);
      fs.rmSync(path.join(ROOT, 'out.tmp'), { recursive: true, force: true });
    }
    if (pendingAgain) {
      pendingAgain = false;
      scheduleRebuild(500);
    }
  });
}

/* ---- AI 助手工具定义（OpenAI 兼容 function calling） ---- */
const TYPES_NAMES = ['notes', 'research', 'projects'];
const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_posts',
      description: '列出指定类型的所有文章（标题/日期/分类/章节/标签/摘要），可按关键词过滤，用于了解站点内容。',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: TYPES_NAMES, description: '文章类型' },
          keyword: { type: 'string', description: '标题/摘要/标签中的关键词，可省略' },
          category: { type: 'string', description: '按大类过滤' },
          chapter: { type: 'string', description: '按章节过滤' },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_post',
      description:
        '读取一篇文章的完整 Markdown 正文与元信息，仅用于润色/重写/扩写正文。注意：正文可能很长，如果只是改日期、分类、章节、标签、可见性这类元信息，不需要调用本工具——直接用 update_post 传要改的字段即可。',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: TYPES_NAMES, description: '文章类型' },
          slug: { type: 'string', description: '文章 slug（URL 标识）' },
        },
        required: ['type', 'slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_taxonomy',
      description: '查看站点现有的大类、章节与标签候选，用于给文章归类。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_post',
      description:
        '修改一篇文章的元信息或正文，字段级合并：只传需要修改的字段，其余字段（含正文）自动保留，因此无需先调用 get_post。改日期/分类/标签/可见性只传对应字段即可。注意：这是写操作，执行前必须先向用户说明将做的修改并征得确认。修改正文时 content 必须是完整 Markdown 全文，此时可先 get_post 取得原文。',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: TYPES_NAMES },
          slug: { type: 'string', description: '文章 slug' },
          date: { type: 'string', description: '修改日期（YYYY-MM-DD）' },
          title: { type: 'string' },
          summary: { type: 'string' },
          category: { type: 'string', description: '大类，留空字符串表示移出分类' },
          chapter: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, description: '完整标签列表' },
          status: { type: 'string' },
          hidden: { type: 'boolean', description: 'true=隐藏，false=显示' },
          content: { type: 'string', description: '新的完整 Markdown 正文' },
        },
        required: ['type', 'slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'batch_update',
      description:
        '批量修改多篇文章的分类/章节/标签/可见性。slugs 直接从 list_posts 的结果里取，不要逐篇 get_post。注意：这是写操作，执行前必须先向用户说明修改范围并征得确认。',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: TYPES_NAMES },
          slugs: {
            type: 'array',
            items: { type: 'string' },
            description: '要修改的文章 slug 列表，最多 50 篇',
            maxItems: 50,
          },
          setCategory: { type: 'boolean', description: '是否修改分类' },
          category: { type: 'string' },
          setChapter: { type: 'boolean', description: '是否修改章节' },
          chapter: { type: 'string' },
          addTags: { type: 'array', items: { type: 'string' }, description: '要追加的标签' },
          removeTags: { type: 'array', items: { type: 'string' }, description: '要移除的标签' },
          hide: { type: 'boolean', description: 'true=隐藏，false=显示' },
        },
        required: ['type', 'slugs'],
      },
    },
  },
];

/* ---- AI 工具执行（读工具直接执行；写工具只登记等前端确认） ---- */
function aiListPosts(args) {
  const t = TYPES.includes(args.type) ? args.type : 'notes';
  const q = String(args.keyword || '').trim().toLowerCase();
  const items = listFiles(t).map(({ slug, relPath, file }) => {
    const { data, content } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
    const eff = effectiveTaxonomy(relPath, data);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return {
      slug,
      title: data.title ?? titleMatch?.[1]?.trim() ?? slug,
      date: data.date ?? '',
      category: eff.category ?? '',
      chapter: eff.chapter ?? '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      summary: data.summary ?? '',
      status: data.status ?? '',
    };
  });
  const filtered = items.filter((p) => {
    if (args.category && p.category !== args.category) return false;
    if (args.chapter && p.chapter !== args.chapter) return false;
    if (q) {
      const hay = `${p.title} ${p.summary} ${p.category} ${p.chapter} ${p.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const LIMIT = 50;
  const list = filtered.slice(0, LIMIT);
  return { type: t, total: filtered.length, truncated: filtered.length > LIMIT, items: list };
}

async function aiGetPost(args) {
  const t = TYPES.includes(args.type) ? args.type : 'notes';
  const found = listFiles(t).find((f) => f.slug === args.slug);
  if (!found) return { error: `未找到文章 slug=${args.slug}（${t}）` };
  const { data, content } = parseFrontmatter(fs.readFileSync(found.file, 'utf-8'));
  return { type: t, slug: args.slug, meta: data, relPath: found.relPath, content };
}

function aiGetTaxonomy() {
  const taxFile = path.join(CONTENT, 'taxonomy.json');
  let tax = { categories: { notes: [], research: [], projects: [] }, chapters: {}, tags: [] };
  try {
    tax = { ...tax, ...JSON.parse(fs.readFileSync(taxFile, 'utf-8')) };
  } catch {}
  const usedCats = new Set();
  const usedChapters = new Set();
  const usedTags = new Set();
  for (const t of TYPES) {
    for (const { relPath, file } of listFiles(t)) {
      const { data } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
      const eff = effectiveTaxonomy(relPath, data);
      if (eff.category) usedCats.add(eff.category);
      if (eff.chapter) usedChapters.add(`${eff.category} / ${eff.chapter}`);
      for (const tag of Array.isArray(data.tags) ? data.tags : []) usedTags.add(tag);
    }
  }
  return { candidates: tax, used: { categories: [...usedCats], chapters: [...usedChapters], tags: [...usedTags] } };
}

function aiEndpoint() {
  const base = AI.baseURL.replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

async function aiComplete(msgs, { tools } = {}) {
  const body = { model: AI.model, messages: msgs, temperature: 0.5 };
  if (tools?.length) body.tools = tools;
  let r;
  try {
    r = await fetch(aiEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI.apiKey}` },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`无法连接 AI 服务：${err?.message || err}`);
  }
  const raw = await r.text().catch(() => '');
  if (!r.ok) {
    // 模型不支持 tools 时，去掉 tools 降级重试一次
    if (tools?.length && /tools|function/.test(raw) && r.status === 400) {
      return aiComplete(msgs, {});
    }
    throw new Error(`AI 服务返回 ${r.status}：${raw.slice(0, 300) || '无响应'}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('AI 返回无法解析');
  }
  return data.choices?.[0]?.message ?? null;
}

/* ---- 流式调用一次模型：逐 token 回调 onEvent（chunk / 内部累积） ---- */
async function aiStreamComplete(msgs, { tools } = {}, onEvent) {
  const body = { model: AI.model, messages: msgs, temperature: 0.5, stream: true };
  if (tools?.length) body.tools = tools;
  let r;
  try {
    r = await fetch(aiEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI.apiKey}` },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`无法连接 AI 服务：${err?.message || err}`);
  }
  if (!r.ok || !r.body) {
    const raw = await r.text().catch(() => '');
    if (tools?.length && /tools|function/.test(raw) && r.status === 400) {
      throw new Error('__NO_TOOLS__');
    }
    throw new Error(`AI 服务返回 ${r.status}：${raw.slice(0, 300) || '无响应'}`);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let msg = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        buf = '';
        break;
      }
      let j;
      try {
        j = JSON.parse(data);
      } catch {
        continue;
      }
      const d = j.choices?.[0]?.delta;
      if (!d) continue;
      if (d.role) {
        msg = msg || { role: d.role, content: '' };
      }
      if (d.content) {
        msg = msg || { role: 'assistant', content: '' };
        msg.content += d.content;
        onEvent?.({ type: 'chunk', text: d.content });
      }
      if (Array.isArray(d.tool_calls)) {
        msg = msg || { role: 'assistant', content: '' };
        msg.tool_calls = msg.tool_calls || [];
        for (const tc of d.tool_calls) {
          const i = tc.index ?? 0;
          while (msg.tool_calls.length <= i)
            msg.tool_calls.push({ id: '', type: 'function', function: { name: '', arguments: '' } });
          if (tc.id) msg.tool_calls[i].id = tc.id;
          if (tc.function?.name) msg.tool_calls[i].function.name += tc.function.name;
          if (tc.function?.arguments) msg.tool_calls[i].function.arguments += tc.function.arguments;
        }
      }
    }
  }
  return msg;
}

/* ---- Agent 循环（流式）：工具日志与最终正文实时发给前端 ---- */
async function runAgentStream(userMessages, context, onEvent) {
  const system =
    '你是「未完成的地图」博客后台的管理助手，站点作者是地理信息科学方向的研究生。你可以通过工具了解与修改后台内容：' +
    'list_posts / get_post / get_taxonomy 为只读，可以直接调用；' +
    'update_post / batch_update 是写操作：这两种工具的调用会被系统安全地放入「待用户确认」队列，而不会直接执行任何修改，' +
    '所以你应当放心直接调用它们（参数填具体），并在回复中向用户清楚说明准备做什么改动；用户在前端点击确认后修改才会真正落盘。不要只是口头描述改动而拒绝调用工具。' +
    '效率原则：改日期/分类/章节/标签/可见性等元信息时，直接调用 update_post 只传要改的字段即可，不要先 get_post 读全文（正文很长，会浪费大量时间与 token）；' +
    '批量修改（如把一批隐藏文章全部设为显示）时，先 list_posts 一次拿到 slug 列表，再直接调用一次 batch_update 完成，绝对不要逐篇 get_post。' +
    '只有润色/重写/扩写正文时才需要 get_post 读取全文，并在给出结果时直接输出完整的新 Markdown 正文。' +
    '文风朴素专业，少堆砌术语；回答用中文。' +
    (context ? `\n\n【当前界面上下文】\n${context}` : '');
  const msgs = [{ role: 'system', content: system }, ...userMessages];
  const pending = [];
  for (let round = 0; round < 6; round++) {
    let msg;
    try {
      msg = await aiStreamComplete(msgs, { tools: AI_TOOLS }, onEvent);
    } catch (err) {
      if (err?.message === '__NO_TOOLS__') {
        // 模型不支持 tools（去掉 tools 非流式重试一次）
        msg = await aiComplete(msgs, {});
        if (msg?.content) onEvent?.({ type: 'chunk', text: msg.content });
      } else {
        throw err;
      }
    }
    if (!msg) {
      onEvent?.({ type: 'done', pending, reply: '' });
      return;
    }
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    if (!calls.length) {
      onEvent?.({ type: 'done', pending, reply: msg.content ?? '' });
      return;
    }
    msgs.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const tc of calls) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {}
      const name = tc.function.name;
      let out;
      try {
        if (name === 'list_posts') out = aiListPosts(args);
        else if (name === 'get_post') out = await aiGetPost(args);
        else if (name === 'get_taxonomy') out = aiGetTaxonomy();
        else if (name === 'update_post' || name === 'batch_update') {
          out = { pending: true, note: '写操作待用户确认，前端确认后会执行，请先向用户说明改动内容并等待确认。' };
          pending.push({ name, args });
        } else out = { error: `未知工具：${name}` };
      } catch (err) {
        out = { error: `工具执行失败：${err?.message || err}` };
      }
      onEvent?.({ type: 'tool', log: aiToolFriendly(name, args) });
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out).slice(0, 20000) });
    }
  }
  onEvent?.({ type: 'done', pending, reply: '本次对话的工具调用次数已达上限，请把要求拆分后再试。' });
}

function aiToolFriendly(name, args) {
  if (name === 'list_posts') return `查询文章列表（${args.type || 'notes'}）`;
  if (name === 'get_post') return `读取文章《${args.slug}》全文`;
  if (name === 'get_taxonomy') return '查询分类标签';
  if (name === 'update_post') return `修改文章《${args.slug}》`;
  if (name === 'batch_update') return `批量修改 ${(args.slugs || []).length} 篇文章`;
  return name;
}

async function runAgent(userMessages, context) {
  const system =
    '你是「未完成的地图」博客后台的管理助手，站点作者是地理信息科学方向的研究生。你可以通过工具了解与修改后台内容：' +
    'list_posts / get_post / get_taxonomy 为只读，可以直接调用；' +
    'update_post / batch_update 是写操作：这两种工具的调用会被系统安全地放入「待用户确认」队列，而不会直接执行任何修改，' +
    '所以你应当放心直接调用它们（参数填具体），并在回复中向用户清楚说明准备做什么改动；用户在前端点击确认后修改才会真正落盘。不要只是口头描述改动而拒绝调用工具。' +
    '效率原则：改日期/分类/章节/标签/可见性等元信息时，直接调用 update_post 只传要改的字段即可，不要先 get_post 读全文（正文很长，会浪费大量时间与 token）；' +
    '批量修改（如把一批隐藏文章全部设为显示）时，先 list_posts 一次拿到 slug 列表，再直接调用一次 batch_update 完成，绝对不要逐篇 get_post。' +
    '只有润色/重写/扩写正文时才需要 get_post 读取全文，并在给出结果时直接输出完整的新 Markdown 正文。' +
    '文风朴素专业，少堆砌术语；回答用中文。' +
    (context ? `\n\n【当前界面上下文】\n${context}` : '');
  const msgs = [{ role: 'system', content: system }, ...userMessages];
  const pending = [];
  const toolLog = [];
  for (let round = 0; round < 6; round++) {
    const msg = await aiComplete(msgs, { tools: AI_TOOLS });
    if (!msg) return { reply: 'AI 没有返回内容', pending, toolLog };
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    if (!calls.length) return { reply: msg.content ?? '', pending, toolLog };
    msgs.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const tc of calls) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {}
      const name = tc.function.name;
      let out;
      try {
        if (name === 'list_posts') out = aiListPosts(args);
        else if (name === 'get_post') out = await aiGetPost(args);
        else if (name === 'get_taxonomy') out = aiGetTaxonomy();
        else if (name === 'update_post' || name === 'batch_update') {
          out = { pending: true, note: '写操作待用户确认，前端确认后会执行，请先向用户说明改动内容并等待确认。' };
          pending.push({ name, args });
        } else out = { error: `未知工具：${name}` };
      } catch (err) {
        out = { error: `工具执行失败：${err?.message || err}` };
      }
      toolLog.push({ name, args, friendly: aiToolFriendly(name, args) });
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out).slice(0, 20000) });
    }
  }
  return { reply: '本次对话的工具调用次数已达上限，请把要求拆分后再试。', pending, toolLog };
}
 
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
  if (meta.cover) lines.push(`cover: ${yamlStr(meta.cover)}`);
  if (Array.isArray(meta.tech) && meta.tech.length) lines.push(`tech: ${JSON.stringify(meta.tech)}`);
  if (meta.demo) lines.push(`demo: ${yamlStr(meta.demo)}`);
  if (meta.demoLabel) lines.push(`demoLabel: ${yamlStr(meta.demoLabel)}`);
  if (meta.demoHeight !== undefined && meta.demoHeight !== null && meta.demoHeight !== '')
    lines.push(`demoHeight: ${Number(meta.demoHeight) || 0}`);
  if (meta.code) lines.push(`code: ${yamlStr(meta.code)}`);
  if (meta.codeLabel) lines.push(`codeLabel: ${yamlStr(meta.codeLabel)}`);
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
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
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

  /* ---- 版本信息（无需鉴权）：最近一次 git 提交 + 服务启动时间 ---- */
  if (p === '/api/version' && req.method === 'GET') {
    let commit = '';
    let committedAt = '';
    let branch = '';
    try {
      commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
      committedAt = execSync('git log -1 --format=%cd --date=iso-strict', {
        cwd: ROOT,
        encoding: 'utf-8',
      }).trim();
      branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
    } catch {}
    return json(res, 200, {
      commit: commit || 'unknown',
      branch: branch || 'unknown',
      committedAt,
      serverStartedAt: new Date(SERVER_STARTED_AT).toISOString(),
    });
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
    scheduleRebuild();
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
    scheduleRebuild();
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
    scheduleRebuild();
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
    scheduleRebuild();
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
    scheduleRebuild();
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
    scheduleRebuild();
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
      scheduleRebuild();
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
      scheduleRebuild();
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
    scheduleRebuild();
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
    if (req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
      fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf-8');
      scheduleRebuild();
      return json(res, 200, { ok: true });
    }
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
    scheduleRebuild();
    return json(res, 200, { ok: true, updated });
  }

  /* ---- 工具页文案：content/copy/09-工具页.json（page/converter/dem/future + 工具点日期）。
        保留 "_说明" 注释字段不展示不覆盖；PUT 只更新传入的顶层区块，未传区块保持不变。 ---- */
  if (p === '/api/copy/tools' && (req.method === 'GET' || req.method === 'PUT')) {
    const file = path.join(CONTENT, 'copy', '09-工具页.json');
    const EMPTY = { page: {}, converter: {}, dem: {}, future: {}, date: '2026-09-03' };
    if (req.method === 'GET') {
      let base = {};
      try {
        base = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {}
      const out = { ...EMPTY };
      for (const k of Object.keys(EMPTY)) if (base[k] !== undefined) out[k] = base[k];
      return json(res, 200, out);
    }
    const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
    let base = {};
    try {
      base = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {}
    const next = { ...base };
    for (const k of Object.keys(EMPTY)) {
      if (body[k] !== undefined) next[k] = body[k];
    }
    fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf-8');
    scheduleRebuild();
    return json(res, 200, { ok: true });
  }

  /* ---- AI 代理：/api/ai/chat（OpenAI 兼容 /chat/completions，仅本地后台使用）
       两种请求格式：
       1) { text, mode:'polish' } —— 旧版一键润色
       2) { messages:[{role,content}...], context? } —— AI 助手多轮对话（Agent） ---- */
  if (p === '/api/ai/chat' && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)).toString('utf-8') || '{}');
      if (!AI.baseURL || !AI.apiKey)
        return json(res, 400, {
          error:
            '未配置 AI：请在 site.config.json 添加 ai 字段（baseURL / apiKey / model），或用环境变量 ADMIN_AI_BASE_URL / ADMIN_AI_API_KEY / ADMIN_AI_MODEL',
        });

      // 格式 2：Agent 多轮对话
      if (Array.isArray(body.messages)) {
        const msgs = body.messages
          .filter((m) => m && typeof m.content === 'string' && m.content.trim())
          .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
        if (!msgs.length) return json(res, 400, { error: '对话内容为空' });
        const context = String(body.context || '').slice(0, 6000);

        // 流式：NDJSON 逐事件输出（工具日志 + 文字增量）
        if (body.stream === true) {
          res.writeHead(200, {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          try {
            await runAgentStream(msgs, context, (ev) => res.write(JSON.stringify(ev) + '\n'));
          } catch (err) {
            res.write(JSON.stringify({ type: 'error', message: `AI 代理异常：${err?.message || err}` }) + '\n');
          }
          res.end();
          return;
        }

        const out = await runAgent(msgs, context);
        return json(res, 200, { ok: true, ...out });
      }

      // 格式 1：一键润色（保留旧行为）
      const text = String(body.text || '').trim();
      if (!text) return json(res, 400, { error: '正文为空，无法润色' });
      const system =
        '你是中文 GIS 技术博客（未完成的地图）的写作助手，作者是地理信息科学方向研究生，文风朴素专业、少堆砌术语。请润色用户提供的 Markdown 文章：修正错别字与语法、理顺句式与段落，保留原有结构、层级、代码块、图片、链接与列表，不新增虚假事实，不改变排版骨架，直接输出润色后的完整 Markdown。';
      const msg = await aiComplete([
        { role: 'system', content: system },
        { role: 'user', content: `请润色下面这篇 Markdown 文章，直接输出润色后的完整内容：\n\n${text}` },
      ]);
      if (!msg) return json(res, 502, { error: 'AI 返回内容为空，请检查 model 名称是否正确' });
      return json(res, 200, { ok: true, text: msg.content ?? '' });
    } catch (err) {
      return json(res, 500, { error: `AI 代理异常：${err?.message || err}` });
    }
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

  /* ---- Demo 上传：.zip（解压）或单 .html → public/demos/<name>/，返回 /demos/<name>/ ---- */
  if (p === '/api/demo-upload' && req.method === 'POST') {
    const want = (url.searchParams.get('name') || '').trim().toLowerCase();
    const fileName = url.searchParams.get('filename') || 'demo';
    const isZip = /\.zip$/i.test(fileName);
    const isHtml = /\.html?$/i.test(fileName);
    if (!isZip && !isHtml) return json(res, 400, { error: '只支持 .zip 或 .html' });

    const buf = await readBody(req);
    if (!buf.length) return json(res, 400, { error: '空文件' });

    // 目录名：优先用户给定，否则用文件名主干，再兜底随机；只允许小写字母数字连字符
    let dirName = (want || path.basename(fileName).replace(/\.(zip|html?)$/i, '') || 'demo')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    if (!dirName) dirName = 'demo-' + crypto.randomBytes(2).toString('hex');

    let target = path.join(DEMOS, dirName);
    // 已存在则加随机后缀，避免覆盖旧 demo
    let n = 1;
    while (fs.existsSync(target) && fs.statSync(target).isDirectory() && n < 100) {
      target = path.join(DEMOS, `${dirName}-${n++}`);
    }
    if (fs.existsSync(target)) return json(res, 409, { error: '该目录已存在，请换一个名字' });

    fs.mkdirSync(target, { recursive: true });

    if (isZip) {
      // 解压 zip → 过滤路径穿越（../）与绝对路径
      const zip = new AdmZip(buf);
      const names = zip.getEntries().filter((e) => !e.isDirectory);
      const safeNames = [];
      for (const e of names) {
        const raw = e.entryName.replace(/\\/g, '/');
        const parts = raw.split('/');
        if (parts.some((s) => s === '..') || raw.startsWith('/')) continue;
        safeNames.push(raw);
      }
      for (const raw of safeNames) {
        const dest = path.join(target, raw);
        if (!dest.startsWith(target)) continue;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, zip.readFile(zip.getEntry(raw)));
      }
      // zip 若是外层包了一级目录（xxx/index.html），把内容上移一层
      const topLevel = safeNames[0]?.split('/')[0];
      const nested = topLevel && safeNames.every((s) => s.startsWith(topLevel + '/'));
      if (nested && fs.existsSync(path.join(target, topLevel, 'index.html'))) {
        const inner = path.join(target, topLevel);
        for (const root of fs.readdirSync(inner)) {
          fs.renameSync(path.join(inner, root), path.join(target, root));
        }
        fs.rmdirSync(inner);
      }
      // 没有 index.html 的话，取第一个 .html 作为入口
      const idxH = path.join(target, 'index.html');
      if (!fs.existsSync(idxH)) {
        const firstHtml = safeNames.find((s) => /\.html?$/i.test(s));
        if (!firstHtml) {
          fs.rmSync(target, { recursive: true, force: true });
          return json(res, 400, { error: 'zip 里没有 .html 文件' });
        }
        fs.renameSync(path.join(target, firstHtml), idxH);
      }
    } else {
      // 单 html：直接写 index.html
      fs.writeFileSync(path.join(target, 'index.html'), buf);
    }

    return json(res, 200, { ok: true, url: `/demos/${path.basename(target)}/`, dir: path.basename(target) });
  }

  /* ---- 代码文件上传：单文件（.py/.sh/...）→ public/code/<name>，返回 /code/<name> ---- */
  if (p === '/api/code-upload' && req.method === 'POST') {
    const fileName = url.searchParams.get('filename') || 'code.txt';
    const ext = path.extname(fileName).toLowerCase();
    if (!CODE_EXT.has(ext)) return json(res, 400, { error: '不支持的文件类型' });
    const buf = await readBody(req);
    if (!buf.length) return json(res, 400, { error: '空文件' });

    let stem = path.basename(fileName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    if (!stem) stem = 'code-' + crypto.randomBytes(3).toString('hex');

    let name = `${stem}${ext}`;
    let target = path.join(CODE, name);
    let n = 1;
    while (fs.existsSync(target) && n < 100) {
      name = `${stem}-${n}${ext}`;
      target = path.join(CODE, name);
      n++;
    }
    if (fs.existsSync(target)) return json(res, 409, { error: '文件已存在，请换一个名字' });
    fs.mkdirSync(CODE, { recursive: true });
    fs.writeFileSync(target, buf);
    return json(res, 200, { ok: true, url: `/code/${name}`, file: name });
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
