import type { GjFeatureCollection, GjGeometry } from './types';

/** WKT 读写。标准 WKT 解析器（坐标可为 x y / x y z / x y z m）。 */
export function wktToGeometry(wkt: string): GjGeometry | null {
  const s = wkt.trim();
  const m = /^(\w+)\s*\((.*)\)\s*$/s.exec(s);
  if (!m) return null;
  const type = m[1].toUpperCase();
  const body = m[2];

  const nums = (t: string): number[] => {
    // 解析 "x y" / "x y z" / "x y z m" 的坐标组（带空格或逗号分隔的纯数字串）
    const parts = t.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    return parts;
  };

  // 通用坐标序列解析：把 "1 2, 3 4" 拆成 [[1,2],[3,4]]
  const coordSeq = (t: string): number[][] =>
    t
      .split('),(')
      .join(')(')
      .split(/\)\s*,\s*\(/)
      .map((part) => part.replace(/^\(|\)$/g, ''))
      .map(nums)
      .filter((a) => a.length >= 2);

  const ringList = (t: string): number[][][] =>
    // ((1 2,3 4),(5 6,7 8)) → 两个环
    t
      .split(/\)\s*,\s*\(/)
      .map((part) => part.replace(/^\(|\)$/g, ''))
      .map((part) =>
        part
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .map(nums)
          .filter((a) => a.length >= 2)
      )
      .filter((r) => r.length > 0);

  const strip = (t: string) => t.replace(/^\(|\)$/g, '').trim();

  switch (type) {
    case 'POINT': {
      const c = nums(strip(body));
      return c.length >= 2 ? { type: 'Point', coordinates: c } : null;
    }
    case 'MULTIPOINT': {
      // 两种写法：MULTIPOINT(1 2, 3 4) 或 MULTIPOINT((1 2),(3 4))
      const coords = body
        .split(',')
        .map((p) => p.replace(/[()]/g, '').trim())
        .map(nums)
        .filter((a) => a.length >= 2);
      return coords.length ? { type: 'MultiPoint', coordinates: coords } : null;
    }
    case 'LINESTRING': {
      const c = coordSeq(body);
      return c.length ? { type: 'LineString', coordinates: c } : null;
    }
    case 'MULTILINESTRING': {
      const parts = body.split(/\)\s*,\s*\(/);
      const lines = parts.map((p) => coordSeq(p.replace(/^\(|\)$/g, ''))).filter((c) => c.length);
      return lines.length ? { type: 'MultiLineString', coordinates: lines } : null;
    }
    case 'POLYGON': {
      const rings = ringList(body);
      return rings.length ? { type: 'Polygon', coordinates: rings } : null;
    }
    case 'MULTIPOLYGON': {
      // (((...)),((...))) 外层每个多边形一组
      const polys: number[][][][] = [];
      let depth = 0;
      let cur: string[] = [];
      for (const ch of body) {
        if (ch === '(') { depth++; if (depth === 2) cur = []; }
        else if (ch === ')') { depth--; if (depth === 1) polys.push([ringFromStr(cur.join(''))]); }
        else cur.push(ch);
      }
      return polys.length ? { type: 'MultiPolygon', coordinates: polys } : null;
    }
    default:
      return null;
  }

  function ringFromStr(t: string): number[][] {
    return t
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map(nums)
      .filter((a) => a.length >= 2);
  }
}

export function wktToFC(wkt: string): { fc: GjFeatureCollection; warnings: string[] } {
  const warnings: string[] = [];
  const geom = wktToGeometry(wkt);
  if (!geom) throw new Error('无法解析 WKT —— 请确认是标准 WKT 一行文本。');
  // GeometryCollection 拆成多要素，其余单要素
  if (geom.type === 'GeometryCollection') {
    const geoms = (geom.geometries as GjGeometry[]) || [];
    const features = geoms.map((g) => ({ type: 'Feature' as const, properties: {}, geometry: g }));
    return { fc: { type: 'FeatureCollection', features }, warnings };
  }
  return { fc: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geom }] }, warnings };
}

const num = (c: number[]) => c.map((v) => (typeof v === 'number' ? String(Math.round(v * 1e7) / 1e7) : String(v))).join(' ');

export function geometryToWKT(g: GjGeometry): string {
  const coords: any = g.coordinates;
  switch (g.type) {
    case 'Point':
      return `POINT (${num(coords)})`;
    case 'MultiPoint':
      return `MULTIPOINT (${coords.map((c: number[]) => `(${num(c)})`).join(', ')})`;
    case 'LineString':
      return `LINESTRING (${coords.map(num).join(', ')})`;
    case 'MultiLineString':
      return `MULTILINESTRING (${coords.map((l: number[][]) => `(${l.map(num).join(', ')})`).join(', ')})`;
    case 'Polygon':
      return `POLYGON (${coords.map((r: number[][]) => `(${r.map(num).join(', ')})`).join(', ')})`;
    case 'MultiPolygon':
      return `MULTIPOLYGON (${coords.map((p: number[][][]) => `(${p.map((r: number[][]) => `(${r.map(num).join(', ')})`).join(', ')})`).join(', ')})`;
    case 'GeometryCollection':
      return `GEOMETRYCOLLECTION (${(g.geometries as GjGeometry[]).map(geometryToWKT).join(', ')})`;
    default:
      throw new Error(`暂不支持导出几何类型 ${g.type}`);
  }
}

export function fcToWKT(fc: GjFeatureCollection): string {
  // 多要素导出为 GEOMETRYCOLLECTION（WKT 单值）
  if (fc.features.length === 1 && fc.features[0].geometry) {
    return geometryToWKT(fc.features[0].geometry);
  }
  const geoms = fc.features.map((f) => f.geometry).filter(Boolean) as GjGeometry[];
  return `GEOMETRYCOLLECTION (${geoms.map(geometryToWKT).join(', ')})`;
}