'use client';

/** 后台 API 客户端：目标是本地 admin-server（127.0.0.1:3001） */

// 本地开发默认直连 127.0.0.1:3001；服务器部署时构建命令注入
// NEXT_PUBLIC_ADMIN_API=/api 走同源相对路径（由 Nginx 反代到后台服务）
export const API_BASE = (process.env.NEXT_PUBLIC_ADMIN_API as string) || 'http://127.0.0.1:3001';
const TOKEN_KEY = 'ez-admin-token';

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': getToken(),
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new ApiError('无法连接后台服务：请运行 npm run dev（会自动带上后台），或单独运行 npm run admin', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || '请求失败', res.status);
  return data as T;
}

export async function uploadImage(file: File): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/upload?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'x-admin-token': getToken() },
      body: file,
    });
  } catch {
    throw new ApiError('无法连接后台服务：请运行 npm run dev（会自动带上后台），或单独运行 npm run admin', 0);
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new ApiError(data.error || '上传失败', res.status);
  return data.url || '';
}

/* ---------------- 类型 ---------------- */

export type PostType = 'notes' | 'research' | 'projects';

export const TYPE_LABELS: Record<PostType, string> = {
  notes: '笔记',
  research: '研究',
  projects: '项目',
};

export interface PostMeta {
  title: string;
  date: string;
  summary?: string;
  category?: string;
  chapter?: string;
  tags?: string[];
  status?: string;
  tech?: string[];
  demo?: string;
  github?: string;
  links?: { label: string; url: string }[];
}

export interface PostListItem extends PostMeta {
  slug: string;
  /** 同一天内手动排序序号（前端预览拖拽生成） */
  order?: number;
  /** 已隐藏（前台不显示） */
  hidden?: boolean;
}

export interface Taxonomy {
  categories: Record<PostType, string[]>;
  chapters?: Record<string, string[]>;
  tags: string[];
}

/** 轻量 frontmatter 解析（与 admin-server 的解析规则一致） */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data: Record<string, unknown> = {};
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
