'use client';

/**
 * 站内导航状态（sessionStorage 持久化：同标签页内刷新/前进后退不丢，关闭标签页重置）。
 * 用于区分"首次进入首页"（播放等高线开场）与"站内返回首页"（直接定位到内容区）。
 * 首访直接打开首页 → 播放开场；一旦在别页停留过再回首页 → 直接展示内容区，不再重播。
 */
const KEY = 'ez-visited-non-home';

export function markVisitedNonHome() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export function hasVisitedNonHome(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}