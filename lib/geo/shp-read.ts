import { parseZip, parseShp, parseDbf } from 'shpjs';
import { bytesToText } from './detect';
import type { GjFeatureCollection, SourceFile } from './types';

/**
 * Shapefile 读取：支持
 *  1) 单个 .zip（含 .shp/.dbf/.prj/.cpg）
 *  2) 多个文件选择（.shp + .dbf + .prj + .cpg）
 * shpjs 输出 GeoJSON（dbf 属性已并入）。旧 2D/3D 混合时 shpjs 会转 2D。
 * 注意：shpjs 的 parseShp 结果 geometry 可能带 bbox 等附加键，保持原样透传即可。
 */

function findFile(files: SourceFile[], ext: string): SourceFile | undefined {
  return files.find((f) => f.name.toLowerCase().endsWith(ext));
}

export async function readShapefile(files: SourceFile[]): Promise<{
  fc: GjFeatureCollection;
  crs: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const zip = findFile(files, '.zip');

  let fc: GjFeatureCollection;
  if (zip) {
    const r = await parseZip(await zip.content.slice(0));
    fc = normalizeShpResult(r);
  } else {
    const shpFile = findFile(files, '.shp');
    const dbfFile = findFile(files, '.dbf');
    if (!shpFile) throw new Error('缺少 .shp 文件');
    if (!dbfFile) throw new Error('缺少 .dbf 文件（属性表）——请同时选择 .shp/.dbf/.prj，或直接上传 .zip');
    const [geo, attrs] = await Promise.all([
      parseShp(await shpFile.content.slice(0)),
      dbfFile ? Promise.resolve(parseDbf(await dbfFile.content.slice(0))) : Promise.resolve([] as any[]),
    ]);
    const parsed = Array.isArray(geo) ? geo : [geo];
    const features = parsed.map((g, i) => ({
      type: 'Feature' as const,
      properties: (attrs && attrs[i]) || {},
      geometry: g,
    }));
    fc = { type: 'FeatureCollection', features } as GjFeatureCollection;
  }

  // 读取 .prj 推断 CRS
  let crs = 'EPSG:4326';
  const prj = findFile(files, '.prj') || (zip ? undefined : undefined);
  if (prj) {
    const wktTxt = bytesToText(prj.content);
    crs = crsFromPrj(wktTxt) || crs;
  } else if (zip) {
    // zip 里的 prj 已由 shpjs 处理（但它只返回 geojson），尝试从 zip 里找不到——不额外解压，保持默认
  }

  if (fc.features.length === 0) {
    warnings.push('未读取到任何要素（属性表可能为空）。');
  }
  return { fc, crs, warnings };
}

/** shpjs 返回值可能是 FC / Feature / 几何 / 数组（多图层 zip 返回 Record） */
function normalizeShpResult(r: any): GjFeatureCollection {
  if (!r) return { type: 'FeatureCollection', features: [] };
  // 多图层 zip：shpjs 返回 { layerName: geojson }
  if (!Array.isArray(r) && typeof r === 'object' && r.type !== 'FeatureCollection' && r.type !== 'Feature' && !r.geometry && !r.coordinates) {
    const layers = Object.values(r).filter(Boolean);
    if (layers.length === 0) return { type: 'FeatureCollection', features: [] };
    const merged: any[] = [];
    for (const layer of layers) merged.push(...normalizeShpResult(layer).features);
    return { type: 'FeatureCollection', features: merged };
  }
  const one = Array.isArray(r) ? r : [r];
  const features: any[] = [];
  for (const item of one) {
    if (!item) continue;
    if (item.type === 'FeatureCollection') features.push(...item.features);
    else if (item.type === 'Feature') features.push(item);
    else if (item.type && item.coordinates) features.push({ type: 'Feature', properties: {}, geometry: item });
    else if (item.geometry) features.push({ type: 'Feature', properties: item.properties || {}, geometry: item.geometry });
  }
  return { type: 'FeatureCollection', features };
}

/** 从 .prj WKT 里识别常用 CRS（精确匹配常见定义，命中不了回退 undefined）。 */
export function crsFromPrj(wkt: string): string | undefined {
  const s = wkt.trim();
  if (s.includes('WGS_1984') || /GEOGCS.*GCS_WGS_1984|DATUM.*WGS_1984/.test(s)) {
    if (/PROJCS|PROJECTION/.test(s)) return 'EPSG:3857'; // Web Mercator
    return 'EPSG:4326';
  }
  if (s.includes('GCS_China_Geographic_Coordinate_System_2000') || s.includes('China_2000')) {
    if (/PROJCS|PROJECTION/.test(s)) return 'EPSG:4490'; // CGCS2000 地理坐标系
    return 'EPSG:4490';
  }
  if (s.includes('WGS_1984_Web_Mercator') || s.includes('Web_Mercator')) return 'EPSG:3857';
  if (s.includes('Xian_1980')) return 'EPSG:4610';
  if (s.includes('Beijing_1954')) return 'EPSG:4214';
  // 其它授权码（EPSG:"xxxx" / AUTHORITY["EPSG","xxxx"]）
  const m = /AUTHORITY\s*\[\s*"EPSG"\s*,\s*"(\d+)"\s*\]/.exec(s);
  if (m) return `EPSG:${m[1]}`;
  return undefined;
}