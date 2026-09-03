import type { GjFeatureCollection, GjGeometry } from './types';

/**
 * Shapefile 写出：生成 .shp + .dbf + .prj 三件套。
 *
 * .shp —— 标准二进制（文件头 100B 大端长度 + 记录头 8B + 几何小端）。
 * .dbf —— dBASE III（GBK 编码，中文属性安全）。
 * .prj —— ESRI WKT（按目标 CRS 预置模板）。
 *
 * 支持几何：Point / MultiPoint / LineString / MultiLineString / Polygon / MultiPolygon，
 * 以及 GeometryCollection（按最高维度归入对应 Shape Type）。
 */

const SHAPE_POINT = 1;
const SHAPE_POLYLINE = 3;
const SHAPE_POLYGON = 5;
const SHAPE_MULTIPOINT = 8;

/** 判断要素集的 Shape Type：面 > 线 > 点。 */
function shapeTypeOf(fc: GjFeatureCollection): number {
  let t = 0;
  const bump = (g: GjGeometry | null) => {
    if (!g) return;
    const s: number = SHAPE_TYPE_SCORE[g.type] ?? 0;
    if (s > t) t = s;
    if (g.type === 'GeometryCollection') (g.geometries as GjGeometry[]).forEach(bump);
  };
  fc.features.forEach((f) => bump(f.geometry));
  if (t === 0) throw new Error('没有可导出的几何要素。');
  return PROTO[t];
}
const SHAPE_TYPE_SCORE: Record<string, number> = {
  Point: 1, MultiPoint: 2, LineString: 3, MultiLineString: 3, Polygon: 4, MultiPolygon: 4,
};
const PROTO: Record<number, number> = {
  1: SHAPE_POINT, 2: SHAPE_MULTIPOINT, 3: SHAPE_POLYLINE, 4: SHAPE_POLYGON,
};

class ByteWriter {
  arr: number[] = [];
  pushI8(v: number) { this.arr.push(v & 0xff); }
  pushI16be(v: number) { this.arr.push((v >> 8) & 0xff, v & 0xff); }
  pushI32be(v: number) { this.arr.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff); }
  pushI32le(v: number) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, v, true);
    this.arr.push(...b);
  }
  pushF64le(v: number) {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, v, true);
    this.arr.push(...b);
  }
  toU8(): Uint8Array { return Uint8Array.from(this.arr); }
  get length() { return this.arr.length; }
}

function bboxOf(pts: number[][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let n = 0;
  for (const c of pts) {
    if (!isFinite(c[0]) || !isFinite(c[1])) continue;
    minX = Math.min(minX, c[0]); minY = Math.min(minY, c[1]);
    maxX = Math.max(maxX, c[0]); maxY = Math.max(maxY, c[1]);
    n++;
  }
  return n ? [minX, minY, maxX, maxY] : [0, 0, 0, 0];
}

/** 提取几何的全部落地点列表（用于 bbox 计算与点集导出）。 */
function allPoints(g: GjGeometry): number[][] {
  const out: number[][] = [];
  const walk = (n: any, isLeaf: boolean) => {
    if (!n) return;
    if (n.type === 'GeometryCollection') { (n.geometries as GjGeometry[]).forEach((s) => walk(s, false)); return; }
    if (!isLeaf && Array.isArray(n) && n.length && typeof n[0] === 'number') { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach((x) => walk(x, false)); return; }
    if (n.coordinates) walk(n.coordinates, false);
  };
  walk(g, false);
  return out;
}

function writePointGeom(w: ByteWriter, c: number[]): void {
  w.pushI32le(SHAPE_POINT);
  w.pushF64le(c[0]); w.pushF64le(c[1]);
}

function writeMultiPointGeom(w: ByteWriter, pts: number[][]): void {
  w.pushI32le(SHAPE_MULTIPOINT);
  const bb = bboxOf(pts);
  bb.forEach((v) => w.pushF64le(v));
  w.pushI32le(pts.length);
  pts.forEach((c) => { w.pushF64le(c[0]); w.pushF64le(c[1]); });
}

/** 线（PolyLine）或面（Polygon）：parts 数组。面时按环数组传入。 */
function writePartsGeom(w: ByteWriter, type: number, parts: number[][][]): void {
  w.pushI32le(type);
  const pts = parts.flat();
  const bb = bboxOf(pts);
  bb.forEach((v) => w.pushF64le(v));
  w.pushI32le(parts.length);
  w.pushI32le(pts.length);
  let acc = 0;
  parts.forEach((p) => { w.pushI32le(acc); acc += p.length; });
  pts.forEach((c) => { w.pushF64le(c[0]); w.pushF64le(c[1]); });
}

/** 几何 → 记录内容字节（不含记录头）。 */
function geomToContent(g: GjGeometry, shapeType: number): Uint8Array {
  const w = new ByteWriter();
  switch (shapeType) {
    case SHAPE_POINT: {
      const pts = allPoints(g);
      const c = pts[0] || [0, 0];
      writePointGeom(w, c);
      break;
    }
    case SHAPE_MULTIPOINT: {
      writeMultiPointGeom(w, allPoints(g));
      break;
    }
    case SHAPE_POLYLINE: {
      const parts = lineParts(g);
      writePartsGeom(w, SHAPE_POLYLINE, parts);
      break;
    }
    case SHAPE_POLYGON: {
      const rings = ringParts(g);
      writePartsGeom(w, SHAPE_POLYGON, rings);
      break;
    }
    default:
      throw new Error(`不支持的 Shape Type: ${shapeType}`);
  }
  return w.toU8();
}

function lineParts(g: GjGeometry): number[][][] {
  const out: number[][][] = [];
  const push = (ls: number[][]) => { if (ls.length && ls.length >= 2) out.push(ls); };
  switch (g.type) {
    case 'LineString': push(g.coordinates); break;
    case 'MultiLineString': (g.coordinates as number[][][]).forEach(push); break;
    default: {
      // 面退化为环
      for (const r of ringParts(g)) if (r.length) out.push(r);
    }
  }
  return out;
}

function ringParts(g: GjGeometry): number[][][] {
  const out: number[][][] = [];
  switch (g.type) {
    case 'Polygon': return g.coordinates;
    case 'MultiPolygon': return (g.coordinates as number[][][][]).flat();
    default: return out;
  }
}

/** 生成 .shp 完整文件。长度单位：16-bit words（规范，shpjs 的 <<1 即字节数）。 */
export function writeShp(fc: GjFeatureCollection): Uint8Array {
  const shapeType = shapeTypeOf(fc);
  // 收集每条记录的内容字节（4 字节对齐——几何结构天然如此）
  const contents: Uint8Array[] = [];
  const allBBoxes: number[][] = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const content = geomToContent(f.geometry, shapeType);
    contents.push(content);
    allBBoxes.push(...allPoints(f.geometry));
  }
  const bb = bboxOf(allBBoxes);

  // 文件头 100 字节
  const head = new ByteWriter();
  head.pushI32be(9994);                    // file code
  for (let i = 0; i < 5; i++) head.pushI32be(0);
  const fileLenWords = 50 + contents.reduce((s, c) => s + 4 + c.length / 2, 0);
  head.pushI32be(fileLenWords);            // 大端！文件总字长（单位 16-bit word）
  head.pushI32le(1000);                    // version
  head.pushI32le(shapeType);               // shape type
  head.pushF64le(bb[0]); head.pushF64le(bb[1]); head.pushF64le(bb[2]); head.pushF64le(bb[3]);
  head.pushF64le(0); head.pushF64le(0);    // Z range
  head.pushF64le(0); head.pushF64le(0);    // M range

  // 记录：8 字节头（记录号 + content length，均大端，单位 word=2字节）+ 几何内容
  const recs = new ByteWriter();
  contents.forEach((content, i) => {
    recs.pushI32be(i + 1);                            // record number
    recs.pushI32be(content.length / 2);               // content length (16-bit words)
    recs.arr.push(...content);
  });

  const out = new Uint8Array(head.length + recs.length);
  out.set(head.toU8(), 0);
  out.set(recs.toU8(), head.length);
  return out;
}

/* ═══════════════ .dbf（dBASE III） ═══════════════ */

/**
 * dbf 文本字段编码：走 UTF-8 字节 + 同时输出 `<name>.cpg`（内容 UTF-8）。
 * 现代 GIS（QGIS / ArcGIS Pro / GDAL）按 .cpg 语言驱动解码 dbf，中文属性完好。
 * 纯 ASCII 直通；中文等非 ASCII 原样 UTF-8 字节。
 */
function gbkBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export interface DbfField {
  name: string;
  /** 原始属性键（用于写记录时反查） */
  raw: string;
  len: number;
  dec: number;
  type: 'C' | 'N';
}

/** 统计属性字段并生成 dBASE 字段定义。 */
export function inferDbfFields(fc: GjFeatureCollection, maxFields = 128): DbfField[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const f of fc.features) {
    const p = f.properties || {};
    for (const k of Object.keys(p)) {
      if (!seen.has(k) && k !== '') {
        seen.add(k);
        names.push(k);
        if (names.length >= maxFields) break;
      }
    }
    if (names.length >= maxFields) break;
  }
  // 字段名：dBASE 字段名上限 10 字节。中文按字符保留（配合 .cpg=UTF-8 能被 QGIS/ArcGIS 正常显示），
  // 按字节截断时小心不要把汉字劈开；空名/纯符号兜底为 F。
  const used = new Set<string>();
  const fields: DbfField[] = names.map((raw) => {
    let name = raw;
    // 过长的字段名截断到 10 字节（UTF-8 边界对齐，避免截半）
    while (new TextEncoder().encode(name).length > 10 && name.length > 1) {
      name = name.slice(0, -1);
    }
    if (!name.trim() || new TextEncoder().encode(name).length === 0) name = 'F';
    // ASCII 兜底：全是非打印/符号时换成 F
    if (!/[\w\u4e00-\u9fa5]/.test(name)) name = 'F';
    // 去重后缀
    let finalName = name;
    let n = 1;
    while (used.has(finalName)) finalName = `${name.slice(0, 9)}_${n++}`;
    used.add(finalName);
    // 推断类型/宽度
    let isNum = true, maxLen = 0, dec = 0, hasDec = false;
    for (const f of fc.features) {
      const v = (f.properties || {})[raw];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'number') {
        const s = String(v);
        maxLen = Math.max(maxLen, s.length);
        if (Math.abs(v % 1) > 1e-9) { hasDec = true; dec = Math.max(dec, decimalsOf(v)); }
      } else {
        const s = String(v);
        if (/^-?\d+(\.\d+)?$/.test(s.trim())) {
          maxLen = Math.max(maxLen, s.trim().length);
          if (s.includes('.')) { hasDec = true; dec = Math.max(dec, s.split('.')[1].length); }
        } else {
          isNum = false;
          const byteLen = gbkBytes(s).length;
          maxLen = Math.max(maxLen, byteLen);
        }
      }
    }
    if (!isNum) return { name, raw, type: 'C', len: Math.min(Math.max(maxLen, 1), 254), dec: 0 };
    const len = Math.min(Math.max(Math.ceil(maxLen) + (hasDec ? 1 : 0), 8), 18);
    return { name, raw, type: 'N', len, dec: hasDec ? Math.min(dec, len - 2) : 0 };
  });
  return fields;
}

function decimalsOf(v: number): number {
  const s = String(v);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** 生成 .dbf 文件。 */
export function writeDbf(fc: GjFeatureCollection, fields: DbfField[]): Uint8Array {
  const now = new Date();
  const numRecs = fc.features.length;
  const headerLen = 32 + fields.length * 32 + 1;
  const recLen = 1 + fields.reduce((s, f) => s + f.len, 0);

  const w = new ByteWriter();
  w.pushI8(0x03);                                  // dBASE III
  w.pushI8(now.getFullYear() - 1900);
  w.pushI8(now.getMonth() + 1);
  w.pushI8(now.getDate());
  const rb = new Uint8Array(4);
  new DataView(rb.buffer).setUint32(0, numRecs, true);
  w.arr.push(...rb);
  const hb = new Uint8Array(2);
  new DataView(hb.buffer).setUint16(0, headerLen, true);
  w.arr.push(...hb);
  const lb = new Uint8Array(2);
  new DataView(lb.buffer).setUint16(0, recLen, true);
  w.arr.push(...lb);
  for (let i = 0; i < 20; i++) w.pushI8(0);

  // 字段描述符
  for (const f of fields) {
    const nameB = new TextEncoder().encode(f.name);
    for (let i = 0; i < 11; i++) w.pushI8(i < nameB.length ? nameB[i] : 0);
    w.pushI8(f.type.charCodeAt(0));
    for (let i = 0; i < 4; i++) w.pushI8(0);
    w.pushI8(f.len);
    w.pushI8(f.dec);
    for (let i = 0; i < 14; i++) w.pushI8(0);
  }
  w.pushI8(0x0d); // 字段描述结束

  // 记录
  for (const f of fc.features) {
    w.pushI8(0x20); // 删除标记：空格
    const p = f.properties || {};
    for (const fd of fields) {
      const val = p[fd.raw];
      if (fd.type === 'N') {
        const s = val === null || val === undefined || val === '' ? '' : String(val);
        const num = (a: string) => a.length <= fd.len ? a.padStart(fd.len) : a.slice(0, fd.len);
        w.arr.push(...gbkBytes(num(s)));
      } else {
        const s = val === null || val === undefined ? '' : String(val);
        const b = gbkBytes(s).slice(0, fd.len);
        for (let i = 0; i < fd.len; i++) w.pushI8(i < b.length ? b[i] : 0x20);
      }
    }
  }
  w.pushI8(0x1a); // EOF

  return w.toU8();
}

/* ═══════════════ .prj（ESRI WKT） ═══════════════ */

export function prjFor(crs: string): string {
  const map: Record<string, string> = {
    'EPSG:4326':
      'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
    'EPSG:4490':
      'GEOGCS["China Geodetic Coordinate System 2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
    'EPSG:3857':
      'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["central_meridian",0],PARAMETER["standard_parallel_1",0],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1]]',
    'EPSG:4526':
      'PROJCS["CGCS2000_3_Degree_GK_CM_111E",GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Gauss_Kruger"],PARAMETER["False_Easting",500000],PARAMETER["False_Northing",0],PARAMETER["Central_Meridian",111],PARAMETER["Scale_Factor",1],PARAMETER["Latitude_Of_Origin",0],UNIT["metre",1]]',
    'EPSG:4528':
      'PROJCS["CGCS2000_3_Degree_GK_CM_117E",GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Gauss_Kruger"],PARAMETER["False_Easting",500000],PARAMETER["False_Northing",0],PARAMETER["Central_Meridian",117],PARAMETER["Scale_Factor",1],PARAMETER["Latitude_Of_Origin",0],UNIT["metre",1]]',
  };
  const hit = map[crs];
  if (hit) return hit;
  // UTM：动态生成
  const m = /^EPSG:(326|327)(\d{2})$/.exec(crs);
  if (m) {
    const zone = Number(m[2]);
    const south = m[1] === '327';
    const datum = 'WGS_1984';
    const lat0 = 0;
    return (
      `PROJCS["WGS_1984_UTM_Zone_${zone}${south ? 'S' : 'N'}",GEOGCS["GCS_WGS_1984",DATUM["D_${datum}",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000],PARAMETER["False_Northing",${south ? 10000000 : 0}],PARAMETER["Central_Meridian",${zone * 6 - 183}],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",${lat0}],UNIT["metre",1]]`
    );
  }
  return map['EPSG:4326'];
}

/** 完整导出：返回三个文件与建议主文件名。 */
export function writeShapefilePackage(
  fc: GjFeatureCollection,
  crs: string,
  stem: string
): { files: { fileName: string; content: Uint8Array }[] } {
  const fields = inferDbfFields(fc);
  return {
    files: [
      { fileName: `${stem}.shp`, content: writeShp(fc) },
      { fileName: `${stem}.dbf`, content: writeDbf(fc, fields) },
      { fileName: `${stem}.prj`, content: new TextEncoder().encode(prjFor(crs)) },
      { fileName: `${stem}.cpg`, content: new TextEncoder().encode('UTF-8') },
    ],
  };
}