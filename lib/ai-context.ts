'use client';

/**
 * 后台各页面 → AI 助手 的上下文通道。
 * 列表页/编辑器把「当前页面看到了什么」写进来，助手请求时带上，
 * 让 AI 知道用户此刻正在看什么（当前筛选结果 / 正在编辑的文章）。
 */

type Listener = (ctx: string) => void;

let current = '';
const listeners = new Set<Listener>();

export function setAiContext(ctx: string) {
  const next = ctx || '';
  if (next === current) return;
  current = next;
  for (const l of listeners) l(current);
}

export function onAiContext(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getAiContext() {
  return current;
}

/** 广播「AI 已执行写操作」，后台列表等页面可监听后刷新数据 */
const dataListeners = new Set<() => void>();
export function notifyAiDataChanged() {
  for (const l of dataListeners) l();
}
export function onAiDataChanged(l: () => void): () => void {
  dataListeners.add(l);
  return () => dataListeners.delete(l);
}

/** 把一段文本插入当前编辑器正文（编辑器组件监听） */
export function notifyAiInsertContent(text: string) {
  window.dispatchEvent(new CustomEvent('ai-insert-content', { detail: text }));
}