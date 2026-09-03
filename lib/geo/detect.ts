import type { InputFormat, SourceFile } from './types';

/** 从文件名推断格式。 */
export function formatFromName(name: string): InputFormat {
  const n = name.toLowerCase().split('?')[0];
  if (n.endsWith('.geojson') || n.endsWith('.geojsonl')) return 'geojson';
  if (n.endsWith('.json')) return 'json'; // 内容判别 geojson / topojson
  if (n.endsWith('.zip') || n.endsWith('.shp') || n.endsWith('.dbf')) return 'shapefile';
  if (n.endsWith('.kml') || n.endsWith('.kmz')) return 'kml';
  if (n.endsWith('.gpx')) return 'gpx';
  if (n.endsWith('.wkt')) return 'wkt';
  if (n.endsWith('.csv') || n.endsWith('.tsv')) return 'csv';
  if (n.endsWith('.topojson') || n.endsWith('.topo.json')) return 'topojson';
  if (n.endsWith('.txt')) return 'txt';
  return 'unknown';
}

/** 按内容特征仲裁：返回识别的格式或 'unknown'。 */
export function sniffContent(
  ext: InputFormat,
  text: string,
  name: string
): InputFormat {
  const trimmed = text.trimStart();
  // JSON 系列：看顶层键
  if (ext === 'json' || ext === 'topojson' || ext === 'geojson' || ext === 'unknown') {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // 极简探测：找顶层键名（不丢入完整 JSON.parse，仅一次稳妥尝试）
      try {
        const obj = JSON.parse(trimmed.length > 2_000_000 ? trimmed.slice(0, 2_000_000) : trimmed);
        const keys = Array.isArray(obj) ? new Set(['array']) : new Set(Object.keys(obj));
        if (keys.has('arcs') && keys.has('type') && (keys.has('objects') || keys.has('transform'))) {
          return 'topojson';
        }
        if (keys.has('features') || keys.has('coordinates') || keys.has('geometry')) {
          return 'geojson';
        }
        if (Array.isArray(obj)) return 'geojson'; // [feature, ...] 或几何数组——按 GeoJSON 处理
        if (typeof obj?.type === 'string' && /^(Point|LineString|Polygon|MultiPoint|MultiLineString|MultiPolygon|GeometryCollection|Feature|FeatureCollection)$/.test(obj.type)) {
          return 'geojson';
        }
        // 无特征 → 猜测
        if (ext === 'topojson') return 'topojson';
      } catch {
        // 大文件解析失败则按扩展名回退
      }
      if (ext === 'json' || ext === 'geojson' || ext === 'topojson') return ext === 'json' ? 'unknown' : ext;
    }
  }
  // KML / GPX：XML 根元素
  if (ext === 'kml' || ext === 'unknown' || ext === 'txt') {
    const root = /<([a-zA-Z_][\w.-]*)(?:\s|>)/.exec(trimmed);
    const tag = root?.[1]?.toLowerCase();
    if (tag === 'kml') return 'kml';
    if (tag === 'gpx') return 'gpx';
  }
  if (ext === 'txt') {
    // WKT 开头特征
    if (/^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(/i.test(trimmed)) return 'wkt';
    // CSV
    if (trimmed.includes(',')) return 'csv';
  }
  if (ext === 'csv' || ext === 'unknown') {
    // 头行含经纬度关键词 → csv
    const head = trimmed.split('\n')[0]?.toLowerCase() ?? '';
    if (/(lng|lon|longitude|lat|latitude|经度|纬度|x\s*,|y\s*,)/.test(head)) return 'csv';
  }
  if (ext === 'wkt' && /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(/i.test(trimmed)) return 'wkt';
  if (ext !== 'unknown') return ext;
  return 'unknown';
}

/** 解析文件字节为 UTF-8 文本（带 BOM 剥离）。 */
export function bytesToText(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  if (u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) return new TextDecoder('utf-8').decode(u8.slice(3));
  return new TextDecoder('utf-8').decode(u8);
}

/** 最终判定：合并文件名与内容特征。 */
export function detectFormat(files: SourceFile[]): InputFormat {
  const first = files[0];
  if (!first) return 'unknown';
  const ext = formatFromName(first.name);
  if (ext === 'shapefile') return 'shapefile';
  if (ext === 'gpx' || ext === 'csv' || ext === 'wkt' || ext === 'kml') return ext;
  if (files.length > 1) {
    // 多个文件：.shp+.dbf(+.prj) 组合
    const names = files.map((f) => f.name.toLowerCase());
    if ((names.some((n) => n.endsWith('.shp')) && names.some((n) => n.endsWith('.dbf'))) || names.every((n) => n.endsWith('shp') || n.endsWith('dbf') || n.endsWith('prj'))) {
      return 'shapefile';
    }
  }
  if (ext === 'json' || ext === 'unknown' || ext === 'txt') {
    const text = bytesToText(first.content);
    return sniffContent(ext, text, first.name);
  }
  return ext;
}