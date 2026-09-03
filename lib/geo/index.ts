import { bytesToText, detectFormat } from './detect';
import { readShapefile } from './shp-read';
import { kmlToFC, gpxToFC } from './kml-read';
import { wktToFC } from './wkt';
import { csvToGeoJSON, parseDelimited } from './csv-read';
import { fcToTopoJSON, topoJSONToFC } from './topojson';
import type { GjFeatureCollection, GjFeature, GjLike, InputFormat, ParseResult, SourceFile } from './types';

/**
 * 顶层入口：识别格式 → 解析为统一 GeoJSON。
 */

const textFor = (files: SourceFile[]) => files[0]?.content ? bytesToText(files[0].content) : '';

export async function parseFiles(files: SourceFile[]): Promise<ParseResult> {
  if (!files.length) throw new Error('未选择文件。');
  const format = detectFormat(files);
  const stem = stemOf(files[0].name);
  const warnings: string[] = [];
  let fc: GjFeatureCollection;
  let sourceCrs = 'EPSG:4326';

  switch (format) {
    case 'geojson': {
      const text = textFor(files);
      const parsed = JSON.parse(text) as GjLike;
      fc = normalizeGeoJSON(parsed);
      break;
    }
    case 'topojson': {
      const text = textFor(files);
      fc = topoJSONToFC(text);
      break;
    }
    case 'shapefile': {
      const r = await readShapefile(files);
      fc = r.fc;
      sourceCrs = r.crs;
      warnings.push(...r.warnings);
      break;
    }
    case 'kml': {
      const r = kmlToFC(files[0].content);
      fc = r.fc;
      warnings.push(...r.warnings);
      break;
    }
    case 'gpx': {
      const r = gpxToFC(files[0].content);
      fc = r.fc;
      warnings.push(...r.warnings);
      break;
    }
    case 'wkt': {
      const r = wktToFC(textFor(files));
      fc = r.fc;
      warnings.push(...r.warnings);
      break;
    }
    case 'csv': {
      const rows = parseDelimited(textFor(files));
      const r = csvToGeoJSON(rows);
      fc = r.fc;
      warnings.push(...r.warnings);
      break;
    }
    default:
      throw new Error('无法识别文件格式。支持：GeoJSON / Shapefile (.zip 或 .shp+.dbf) / TopoJSON / KML / GPX / WKT / CSV。');
  }

  // 归一保证是 FeatureCollection
  fc = normalizeGeoJSON(fc);
  return { fc, format, sourceCrs, stem, warnings };
}

/** 统一的几何统计描述（供展示）。 */
export function describeCount(fc: GjFeatureCollection): Record<string, number> {
  const count: Record<string, number> = {};
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'GeometryCollection') {
      (g.geometries as any[]).forEach((s) => { count[s.type] = (count[s.type] || 0) + 1; });
    } else count[g.type] = (count[g.type] || 0) + 1;
  }
  return count;
}

function stemOf(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() || 'data';
  return base.replace(/\.(zip|shp|dbf|prj|cpg|geojson|json|topojson|kml|gpx|wkt|csv|txt)$/i, '') || 'data';
}

/** 把任意接受的结构归一为 FeatureCollection。 */
export function normalizeGeoJSON(input: any): GjFeatureCollection {
  if (!input) return { type: 'FeatureCollection', features: [] };
  if (Array.isArray(input)) {
    // 几何数组或要素数组
    const features = input.map((item) => normalizeFeature(item)).filter(Boolean) as GjFeature[];
    return { type: 'FeatureCollection', features };
  }
  if (input.type === 'FeatureCollection') {
    const features = (input.features || []).map(normalizeFeature).filter(Boolean) as GjFeature[];
    return { type: 'FeatureCollection', features };
  }
  if (input.type === 'Feature') return { type: 'FeatureCollection', features: [normalizeFeature(input)] as GjFeature[] };
  if (input.type && typeof input.coordinates !== 'undefined') {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: input }] };
  }
  if (typeof input.geometry !== 'undefined') {
    return { type: 'FeatureCollection', features: [normalizeFeature(input)] as GjFeature[] };
  }
  // 兜底：当成空
  return { type: 'FeatureCollection', features: [] };
}

function normalizeFeature(f: any): GjFeature | null {
  if (!f) return null;
  const geometry = f.geometry && f.geometry.type === 'GeometryCollection'
    ? normalizeGC(f.geometry)
    : f.geometry;
  return {
    type: 'Feature',
    properties: f.properties || {},
    geometry: geometry || null,
    ...(f.id !== undefined ? { id: f.id } : {}),
  };
}

function normalizeGC(gc: any): any {
  return { ...gc, geometries: (gc.geometries || []).map((g: any) => (g.type === 'GeometryCollection' ? normalizeGC(g) : g)) };
}

export type { InputFormat, ParseResult, SourceFile, ExportResult, GjFeatureCollection, GjFeature, GjLike } from './types';
export { fcToTopoJSON, topoJSONToFC } from './topojson';
export { fcToKML, fcToCSV } from './writers';
export { geometryToWKT, fcToWKT, wktToFC } from './wkt';
export { writeShapefilePackage, inferDbfFields, prjFor } from './shapefile-write';
export { reprojectFC, crsLabel, registerCrs, utmEpsg } from './reproject';
export { crsFromPrj } from './shp-read';
export { bboxOf, eachCoord, mapCoords } from './util';