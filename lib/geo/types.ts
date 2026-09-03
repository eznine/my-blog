/**
 * 矢量地理数据格式转换工具的共享类型定义。
 * 全部基于 RFC 7946 GeoJSON 作为中间表示，所有输入格式先归一为
 * 标准 GeoJSON，再从 GeoJSON 导出目标格式。
 */

/** GeoJSON 几何类型（RFC 7946） */
export type GjGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection';

/** 简化版 GeoJSON 类型（只关心我们需要的几何结构，坐标统一 [x, y]（或带 z）） */
export type GjGeometry = {
  type: GjGeometryType;
  coordinates?: any;
  geometries?: GjGeometry[];
  [k: string]: unknown;
};

export type GjFeature = {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: GjGeometry | null;
  [k: string]: unknown;
};

export type GjFeatureCollection = {
  type: 'FeatureCollection';
  features: GjFeature[];
  [k: string]: unknown;
};

/** 可接受的顶层输入结构 */
export type GjLike = GjFeatureCollection | GjFeature | GjGeometry;

/** 文件来源：单个文件或一组相关文件（如 .zip，或 .shp+.dbf+.prj 多选） */
export interface SourceFile {
  name: string;
  content: ArrayBuffer;
}

/** 识别出的输入格式 */
export type InputFormat =
  | 'geojson'
  | 'topojson'
  | 'shapefile'
  | 'kml'
  | 'gpx'
  | 'wkt'
  | 'csv'
  | 'json' // 内部哨兵：文件名 .json 尚未判别内容
  | 'txt' // 内部哨兵：.txt 尚未判别（可能为 WKT/CSV）
  | 'unknown';

/** 解析结果：GeoJSON 中间态 + 元信息 */
export interface ParseResult {
  /** 归一化后的 FeatureCollection（始终为 collection 便于统一处理） */
  fc: GjFeatureCollection;
  /** 识别到的输入格式 */
  format: InputFormat;
  /** 源坐标系（若能识别，如 shapefile 的 .prj / 预设），否则 'EPSG:4326' */
  sourceCrs: string;
  /** 原始文件名主干（用于推导输出文件名） */
  stem: string;
  /** 解析过程中的提示/告警（如 CSV 缺列、GCJ 偏移提醒） */
  warnings: string[];
}

/** 可导出的输出格式 */
export type OutputFormat =
  | 'geojson'
  | 'shapefile'
  | 'topojson'
  | 'kml'
  | 'wkt'
  | 'csv';

/** 导出结果：字节数据 + 建议文件名 + 可选统计信息 */
export interface ExportResult {
  /** 文件字节内容 */
  content: ArrayBuffer;
  /** 建议保存的文件名（含扩展名） */
  fileName: string;
  /** MIME 提示（用于下载） */
  mime: string;
  /** 可选附加产物（如 shapefile 除 .shp 外的 .dbf/.prj，需逐个下载） */
  sidecars?: { fileName: string; content: Uint8Array; mime: string }[];
  /** 体积对比等说明文案 */
  note?: string;
}

/** 预置 CRS 定义 */
export type PresetCrs = 'EPSG:4326' | 'EPSG:4490' | 'EPSG:3857' | 'utm';

/** 字段统计（用于属性表面板） */
export interface FieldStat {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'empty' | 'mixed';
  count: number; // 非空
  min?: number;
  max?: number;
  sample: string;
}