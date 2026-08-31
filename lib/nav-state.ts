'use client';

/**
 * 站内导航状态（内存级，刷新即重置）。
 * 用于区分"首次进入首页"（播放等高线开场）与"站内返回首页"（直接定位到内容区）。
 * 刷新页面会重置 → 开场动画重播；仅在客户端路由间跳转时保持。
 */
let visitedNonHome = false;

export function markVisitedNonHome() {
  visitedNonHome = true;
}

export function hasVisitedNonHome(): boolean {
  return visitedNonHome;
}
