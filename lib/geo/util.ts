import type { GjGeometry, GjGeometryType } from './types';

/** 对几何内所有坐标点应用映射函数（深度优先，含 GeometryCollection）。 */
export function mapCoords(geom: GjGeometry | null, fn: (c: number[]) => number[]): any {
  if (!geom) return geom;
  return mapRec(geom);
  function mapRec(node: any): any {
    if (!node) return node;
    if (node.type === 'GeometryCollection') {
      return { ...node, geometries: (node.geometries || []).map(mapRec) };
    }
    return { ...node, coordinates: walk(node.coordinates) };
  }
  function walk(coords: any): any {
    // 叶级坐标
    if (typeof coords[0] === 'number') return fn(coords);
    return coords.map(walk);
  }
}

/** 遍历几何的所有点。 */
export function eachCoord(geom: GjGeometry | null, fn: (c: number[]) => void): void {
  if (!geom) return;
  walk(geom.coordinates);
  if (geom.type === 'GeometryCollection') {
    (geom.geometries as GjGeometry[] || []).forEach((g) => eachCoord(g, fn));
  }
  function walk(coords: any): void {
    if (typeof coords[0] === 'number') {
      fn(coords);
      return;
    }
    coords.forEach(walk);
  }
}

/** 计算 GeoJSON 的大致边界框 [minX, minY, maxX, maxY]；空要素返回 null。 */
export function bboxOf(geom: GjGeometry | null): [number, number, number, number] | null {
  if (!geom) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let n = 0;
  eachCoord(geom, (c) => {
    if (!isFinite(c[0]) || !isFinite(c[1])) return;
    if (c[0] < minX) minX = c[0];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[1] > maxY) maxY = c[1];
    n++;
  });
  if (n === 0) return null;
  return [minX, minY, maxX, maxY];
}

/** 数值保留 n 位小数（去尾零），用于清理重投影后的浮点噪声。 */
export function roundCoord(c: number[], precision = 6): number[] {
  const p = Math.pow(10, precision);
  const out = c.slice();
  out[0] = Math.round(c[0] * p) / p;
  out[1] = Math.round(c[1] * p) / p;
  if (typeof out[2] === 'number' && isFinite(out[2])) {
    out[2] = Math.round(c[2] * p) / p;
  }
  return out;
}

/** 空 GeometryCollection 节点（用于统一中间表示）。 */
export function emptyCollection() {
  return { type: 'FeatureCollection', features: [] } as const;
}