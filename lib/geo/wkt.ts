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
  const text = wkt.replace(/\r/g, '');
  const geoms: GjGeometry[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length > 1) {
    // 多行 WKT：每行一个几何，逐行解析为多要素
    for (const line of lines) {
      const g = wktToGeometry(line);
      if (!g) throw new Error(`无法解析 WKT 行：「${line.slice(0, 40)}${line.length > 40 ? '…' : ''}」`);
      pushGeom(g);
    }
  } else {
    const g = wktToGeometry(text);
    if (!g) throw new Error('无法解析 WKT —— 请确认是标准 WKT 文本（支持每行一个几何）。');
    pushGeom(g);
  }

  function pushGeom(g: GjGeometry) {
    // GeometryCollection 拆成多要素
    if (g.type === 'GeometryCollection') {
      for (const s of (g.geometries as GjGeometry[]) || []) geoms.push(s);
    } else geoms.push(g);
  }

  const features = geoms.map((g) => ({ type: 'Feature' as const, properties: {}, geometry: g }));
  return { fc: { type: 'FeatureCollection', features }, warnings };
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
  // 逐要素一行输出（通用 WKT 文本），兼容性远好于 GEOMETRYCOLLECTION 单值——
  // 很多软件（ArcGIS/QGIS/GDAL 文本导入）按行读取 WKT，单几何直接可用。
  // GeometryCollection 要素也拆开逐行输出。
  const lines: string[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'GeometryCollection') {
      for (const s of (g.geometries as GjGeometry[]) || []) lines.push(geometryToWKT(s));
    } else lines.push(geometryToWKT(g));
  }
  return lines.join('\n');
}