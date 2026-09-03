/**
 * 手工类型声明：本项目使用的第三方库缺少官方 TS 类型。
 * 只声明用到的 API，保证 tsc / next build 通过。
 */

declare module 'shpjs' {
  export function parseZip(buffer: ArrayBuffer | Uint8Array, whiteList?: string[]): Promise<any>;
  export function parseShp(buffer: ArrayBuffer | Uint8Array, prj?: Uint8Array): Promise<any>;
  export function parseDbf(buffer: ArrayBuffer | Uint8Array, cpg?: Uint8Array): Promise<any[]>;
  export default function getShapefile(base: string | ArrayBuffer, whiteList?: string[]): Promise<any>;
}

declare module 'topojson-client' {
  export function feature(topology: any, o?: any): any;
  export function mesh(topology: any, o?: any, filter?: any): any;
}

declare module 'topojson-server' {
  export function topology(objects: any, quantization?: number): any;
}