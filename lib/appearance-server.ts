import fs from 'node:fs';
import path from 'node:path';
import { appearanceCssFrom, DEFAULT_APPEARANCE } from './appearance';
import type { AppearanceConfig } from './appearance';

/**
 * 全站外观「动态版」：server 专用（RootLayout）。
 * 每次请求实时读取 content/appearance.json + 3 秒 TTL 缓存，
 * 后台「外观设置」保存后最快 3 秒内前台生效，无需重启服务。
 */

let _app: AppearanceConfig | null = null;
let _appAt = 0;
const APP_TTL = 3000;

function getAppearance(): AppearanceConfig {
  const now = Date.now();
  if (!_app || now - _appAt > APP_TTL) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'content', 'appearance.json'), 'utf-8')
      );
      _app = { ...DEFAULT_APPEARANCE, ...raw } as AppearanceConfig;
    } catch {
      _app = DEFAULT_APPEARANCE;
    }
    _appAt = now;
  }
  return _app;
}

/** 生成注入 layout 的样式片段（动态读取 content/appearance.json） */
export function buildAppearanceCss(): string {
  return appearanceCssFrom(getAppearance());
}