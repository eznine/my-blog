import { topology } from 'topojson-server';
import { feature } from 'topojson-client';
import type { GjFeatureCollection } from './types';

/**
 * TopoJSON 读写。转出时按拓扑压缩，能显著减小共享边界数据体积
 * （工具面板会展示压缩比）。读入时还原为 GeoJSON。
 */

export function fcToTopoJSON(fc: GjFeatureCollection, quantization?: number): { text: string; note: string } {
  // topology() 需要 { name: GeoJSON } 形式；量化越高体积越小、精度越低
  const q = quantization ?? 1e4;
  const topo = topology({ collection: fc as any }, q);
  const text = JSON.stringify(topo);
  const orig = new TextEncoder().encode(JSON.stringify(fc)).length;
  const comp = new TextEncoder().encode(text).length;
  const pct = orig > 0 ? Math.round(((orig - comp) / orig) * 100) : 0;
  const note = `TopoJSON 压缩比 ${Math.max(0, pct)}% · 原 ${fmt(orig)} → ${fmt(comp)}`;
  return { text, note };
}

function fmt(n: number): string {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
}

export function topoJSONToFC(text: string): GjFeatureCollection {
  const topo = JSON.parse(text);
  if (!topo || (topo.type !== 'Topology' && topo.type !== 'topology') || !topo.objects) {
    throw new Error('文件不是有效的 TopoJSON。');
  }
  const objects = topo.objects || {};
  const features: GjFeatureCollection['features'] = [];
  for (const key of Object.keys(objects)) {
    const obj = objects[key];
    const f = feature(topo, obj);
    if (!f) continue;
    if (f.type === 'FeatureCollection') features.push(...f.features);
    else if (f.type === 'Feature') features.push(f);
  }
  return { type: 'FeatureCollection', features };
}