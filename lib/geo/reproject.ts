import proj4 from 'proj4';
import { eachCoord, mapCoords, roundCoord } from './util';
import type { GjFeatureCollection } from './types';

/**
 * 坐标重投影（proj4）。
 * 预置常用坐标系：WGS84（EPSG:4326）、CGCS2000 地理坐标（EPSG:4490）、
 * Web Mercator（EPSG:3857）、UTM（自动按经度分带，EPSG:326xx/327xx）。
 * GCJ-02 需要专门的加密库，这里不做 WGS→GCJ（避免把转换搞错）；
 * 高德底图是 GCJ-02，叠加 WGS84 数据会有数百米偏移，组件层会给出提示。
 */

// proj4 内置 defs 已有 EPSG:4326 / EPSG:3857 / EPSG:4490？EPSG:4490 不一定内置，手动注册保稳。
proj4.defs(
  'EPSG:4490',
  '+proj=longlat +ellps=GRS80 +no_defs +type=crs'
);
proj4.defs(
  'EPSG:4526',
  '+proj=tmerc +lat_0=0 +lon_0=111 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs' // CGCS2000 3度带 111E 中央经线（西安/郑州一带示例）
);
proj4.defs(
  'EPSG:4528',
  '+proj=tmerc +lat_0=0 +lon_0=117 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs' // CGCS2000 3度带 117E
);

/** 未知 CRS 字符串的重投影直接抛错。 */
export function registerCrs(code: string, def: string): void {
  try {
    proj4.defs(code, def);
  } catch {
    /* ignore */
  }
}

/** 计算 UTM 分带 EPSG 号。 */
export function utmEpsg(lon: number, lat: number): string {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const hem = lat >= 0 ? 326 : 327;
  return `EPSG:${hem}${String(zone).padStart(2, '0')}`;
}

/** 某中心经度、纬度对应的 UTM proj4 定义（跨带数据多带时按首点分带简化）。 */
function utmDefFor(lon: number, lat: number): string {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const south = lat < 0 ? ' +south' : '';
  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`;
}

export type CrsKind = 'EPSG:4326' | 'EPSG:4490' | 'EPSG:3857' | 'EPSG:4526' | 'EPSG:4528' | 'utm' | 'custom';

/**
 * 重投影整个 FeatureCollection。
 * @param fc 输入数据（原地拷贝，不修改入参）
 * @param from 源 CRS：EPSG 码或 proj4 字符串
 * @param to  目标 CRS：CrsKind 或 EPSG 码/proj4 字符串
 * @param custom source epsg code（如 UTM 分带）
 */
export function reprojectFC(
  fc: GjFeatureCollection,
  from: string,
  to: Partial<{ kind: CrsKind; crs: string }>
): GjFeatureCollection {
  const toCode = resolveToCrs(to, from, fc);
  const out: GjFeatureCollection = JSON.parse(JSON.stringify(fc));
  const fn = (c: number[]) => {
    let outC: number[];
    try {
      outC = proj4(from, toCode, c).slice(0, 2);
    } catch {
      throw new Error(`重投影失败：无法从 ${from} 转换到 ${toCode}。请检查源数据坐标系与目标坐标系设置。`);
    }
    return roundCoord(outC, 7);
  };
  out.features.forEach((f) => {
    f.geometry = mapCoords(f.geometry as any, fn);
  });
  return out;
}

function resolveToCrs(to: Partial<{ kind: CrsKind; crs: string }>, from: string, fc: GjFeatureCollection): string {
  const kind = to.kind;
  if (kind === 'custom' && to.crs) return to.crs;
  if (kind === 'EPSG:4326') return 'EPSG:4326';
  if (kind === 'EPSG:4490') return 'EPSG:4490';
  if (kind === 'EPSG:3857') return 'EPSG:3857';
  if (kind === 'EPSG:4526') return 'EPSG:4526';
  if (kind === 'EPSG:4528') return 'EPSG:4528';
  if (kind === 'utm') {
    // 用数据首个点分带
    let seedLon = 114, seedLat = 30;
    for (const f of fc.features) {
      let s = 0;
      eachCoord(f.geometry as any, (c) => { if (s++ === 0 && isFinite(c[0])) { seedLon = c[0]; seedLat = c[1]; } });
      if (s > 0) break;
    }
    const epsg = utmEpsg(seedLon, seedLat);
    if (!proj4.defs(epsg)) proj4.defs(epsg, utmDefFor(seedLon, seedLat));
    return epsg;
  }
  return 'EPSG:4326';
}

/** 便捷：推断数据的经纬度范围（用于自动分带提示）。 */
export function crsLabel(code: string): string {
  const labels: Record<string, string> = {
    'EPSG:4326': 'WGS84 经纬度',
    'EPSG:4490': 'CGCS2000 经纬度',
    'EPSG:3857': 'Web Mercator 投影',
    'EPSG:4526': 'CGCS2000 / 3度带 111E',
    'EPSG:4528': 'CGCS2000 / 3度带 117E',
  };
  return labels[code] || code;
}