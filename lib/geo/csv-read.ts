import { bytesToText } from './detect';
import type { GjFeatureCollection } from './types';

/** 通用 CSV/TSV 解析（支持引号包裹、逗号/制表符/分号/竖线分隔）。 */
export function parseDelimited(text: string): string[][] {
  // 探测分隔符
  const firstLines = text.split(/\r?\n/).slice(0, 8).join('\n');
  const cands: [string, number][] = [',', '\t', ';', '|'].map((sep) => [
    sep,
    (firstLines.match(new RegExp(`\\${sep}`, 'g')) || []).length,
  ]);
  cands.sort((a, b) => b[1] - a[1]);
  const sep = cands[0][1] > 0 ? cands[0][0] : ',';

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === sep) {
      cur.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      rows.push(cur); cur = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return rows;
  // 去掉全空尾行
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) rows.pop();
  return rows;
}

const LON_KEYS = ['lng', 'lon', 'long', 'longitude', 'x', '经度', 'lon_dd', 'lon_x'];
const LAT_KEYS = ['lat', 'latitude', 'y', '纬度', 'lat_dd', 'lat_y'];

/** 从表头找到经纬度列索引；找不到返回 null。 */
export function findCoordCols(header: string[]): { lon: number; lat: number } | null {
  const norm = header.map((h) => h.trim().toLowerCase().replace(/[^a-z\u4e00-\u9fa5]/g, ''));
  let lon = -1, lat = -1;
  for (const k of LON_KEYS) {
    const i = norm.findIndex((h) => h === k);
    if (i >= 0) { lon = i; break; }
  }
  for (const k of LAT_KEYS) {
    const i = norm.findIndex((h) => h === k);
    if (i >= 0) { lat = i; break; }
  }
  if (lon < 0 && lat < 0) return null;
  // 允许缺一个就跳过
  if (lon >= 0 || lat >= 0) return { lon, lat };
  return null;
}

/**
 * 把 Excel 数字日期逻辑转通用，这里只处理纯坐标表。
 * 生成：默认点要素；若检测到若干行共用同一点下次行（group col），可扩展——暂不做。
 */
export function csvToGeoJSON(
  rows: string[][],
  opts?: { nameHint?: string }
): { fc: GjFeatureCollection; warnings: string[] } {
  const warnings: string[] = [];
  if (rows.length < 2) throw new Error('表格至少需要一行数据。');
  const header = rows[0];
  const dataRows = rows.slice(1);
  const cols = findCoordCols(header);

  if (!cols) {
    throw new Error(
      '未识别到经纬度列。请在表头使用 lng/lon/longitude/x（经度）与 lat/latitude/y（纬度），或用中文「经度/纬度」。'
    );
  }

  const features: GjFeatureCollection['features'] = [];
  let dropped = 0;
  dataRows.forEach((r, i) => {
    const lon = parseFloat((r[cols.lon] || '').toString());
    const lat = parseFloat((r[cols.lat] || '').toString());
    if (!isFinite(lon) || !isFinite(lat)) { dropped++; return; }
    const props: Record<string, unknown> = {};
    header.forEach((h, c) => {
      if (c === cols.lon || c === cols.lat) return;
      const v = r[c];
      if (v === undefined || v === null) return;
      const num = parseFloat(v);
      props[h.trim() || `col${c}`] = Number.isFinite(num) && String(num) === v.trim() ? num : v;
    });
    features.push({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lon, lat] } });
  });

  if (dropped > 0) warnings.push(`已跳过 ${dropped} 行坐标缺失或非法的记录。`);
  return { fc: { type: 'FeatureCollection', features }, warnings };
}

export function csvToGeoJSONFromText(text: string): { fc: GjFeatureCollection; warnings: string[] } {
  return csvToGeoJSON(parseDelimited(bytesToText(new TextEncoder().encode(text).buffer)));
}