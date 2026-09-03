import type { GjFeatureCollection, GjGeometry } from './types';
import { fcToWKT } from './wkt';

/**
 * KML 写出（OGC KML 2.2）。
 * 用 DOM 生成 Placemark；几何统一转坐标串。属性写入 ExtendedData。
 */

const coordStr = (c: number[]) => `${c[0]},${c[1]},${typeof c[2] === 'number' ? c[2] : 0}`;

function geometryKML(g: GjGeometry): string {
  const c: any = g.coordinates;
  switch (g.type) {
    case 'Point':
      return `<Point><coordinates>${coordStr(c)}</coordinates></Point>`;
    case 'LineString':
      return `<LineString><coordinates>${c.map(coordStr).join(' ')}</coordinates></LineString>`;
    case 'Polygon':
      return `<Polygon>${(c as number[][][]).map((ring: number[][], i: number) => `<${i === 0 ? 'outerBoundaryIs' : 'innerBoundaryIs'}><LinearRing><coordinates>${ring.map(coordStr).join(' ')}</coordinates></LinearRing></${i === 0 ? 'outerBoundaryIs' : 'innerBoundaryIs'}>`).join('')}</Polygon>`;
    case 'MultiPoint':
      return `<MultiGeometry>${(c as number[][]).map((cc: number[]) => `<Point><coordinates>${coordStr(cc)}</coordinates></Point>`).join('')}</MultiGeometry>`;
    case 'MultiLineString':
      return `<MultiGeometry>${(c as number[][][]).map((l: number[][]) => `<LineString><coordinates>${l.map(coordStr).join(' ')}</coordinates></LineString>`).join('')}</MultiGeometry>`;
    case 'MultiPolygon':
      return `<MultiGeometry>${(c as number[][][][]).map((p: number[][][]) => `<Polygon>${p
        .map((ring: number[][], i: number) => `<${i === 0 ? 'outerBoundaryIs' : 'innerBoundaryIs'}><LinearRing><coordinates>${ring.map(coordStr).join(' ')}</coordinates></LinearRing></${i === 0 ? 'outerBoundaryIs' : 'innerBoundaryIs'}>`)
        .join('')}</Polygon>`).join('')}</MultiGeometry>`;
    case 'GeometryCollection':
      return `<MultiGeometry>${(g.geometries as GjGeometry[]).map(geometryKML).join('')}</MultiGeometry>`;
    default:
      return '';
  }
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function fcToKML(fc: GjFeatureCollection): string {
  const placemarks = fc.features
    .map((f) => {
      if (!f.geometry) return '';
      const geom = geometryKML(f.geometry);
      if (!geom) return '';
      const props = f.properties || {};
      const ext = Object.entries(props).length
        ? `<ExtendedData>${Object.entries(props)
            .map(([k, v]) => `<Data name="${esc(k)}"><value>${esc(v)}</value></Data>`)
            .join('')}</ExtendedData>`
        : '';
      return `<Placemark><name>${esc(props['名称'] ?? props['name'] ?? '要素')}</name>${ext}${geom}</Placemark>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2">\n` +
    `<Document>\n` +
    `<name>${esc('导出的矢量')}</name>\n` +
    placemarks +
    `\n</Document>\n</kml>\n`
  );
}

/**
 * CSV 写出：点要素 → 经纬度表；非点 → 附属性 + WKT 列（便于 Excel/通用工具读几何）。
 */
export function fcToCSV(fc: GjFeatureCollection): { text: string; isPoints: boolean } {
  const isAllPoints = fc.features.every((f) => f.geometry?.type === 'Point');
  if (isAllPoints) {
    const header = buildHeader(fc);
    const rows = fc.features.map((f) => {
      const c = (f.geometry as any).coordinates;
      return header.map((h) => {
        if (h === 'lng') return fmtCell(c[0]);
        if (h === 'lat') return fmtCell(c[1]);
        return fmtCell((f.properties || {})[h]);
      });
    });
    return { text: toCsv([['lng', 'lat', ...header.filter((h) => h !== 'lng' && h !== 'lat')], ...rows.map((r) => r)]), isPoints: true };
  }
  // 非点：属性 + WKT
  const props = collectProps(fc);
  const header = [...props];
  const rows = fc.features.map((f) => {
    const row = header.map((h) => fmtCell((f.properties || {})[h]));
    let wkt = '';
    try { wkt = fcToWKT({ type: 'FeatureCollection', features: [f] }); } catch { wkt = ''; }
    return [...row, wkt];
  });
  return { text: toCsv([[...header, 'wkt'], ...rows]), isPoints: false };
}

function buildHeader(fc: GjFeatureCollection): string[] {
  const set = new Set<string>([...collectProps(fc)]);
  return [...set];
}

function collectProps(fc: GjFeatureCollection): string[] {
  const set = new Set<string>();
  for (const f of fc.features) for (const k of Object.keys(f.properties || {})) set.add(k);
  return [...set];
}

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function toCsv(rows: (string | number)[][]): string {
  const escCell = (v: string | number) => {
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return rows.map((r) => r.map(escCell).join(',')).join('\r\n');
}