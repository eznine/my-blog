/**
 * 极简 ZIP 打包器（STORE 模式，不压缩）。
 * 形状文件打包下载用：shp/shx/dbf/prj/cpg 五件套打进一个 .zip，
 * 避免「逐个下载漏掉 .shx/.prj 导致其他软件打不开」。
 *
 * 仅实现 ZIP 必需结构：本地文件头 + 中央目录 + EOCD，UTF-8 文件名（flag 0x0800）。
 */

/* ── CRC32（IEEE 802.3，多项式 0xEDB88320，查表法） ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { time, date };
}

export interface ZipEntry {
  fileName: string;
  content: Uint8Array;
}

/** 打包为 .zip（STORE 模式）。 */
export function zipFiles(entries: ZipEntry[]): Uint8Array {
  if (!entries.length) throw new Error('没有可打包的文件。');
  const { time, date } = dosDateTime(new Date());

  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v, true);
    return b;
  };
  const u32 = (v: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, true);
    return b;
  };
  const push = (b: Uint8Array) => chunks.push(b);

  for (const e of entries) {
    const nameB = new TextEncoder().encode(e.fileName);
    const crc = crc32(e.content);
    const size = e.content.length;
    const localOffset = offset;

    // 本地文件头（30B）
    push(u32(0x04034b50));
    push(u16(20));          // version needed
    push(u16(0x0800));      // flags: UTF-8 文件名
    push(u16(0));           // method: STORE
    push(u16(time));
    push(u16(date));
    push(u32(crc));
    push(u32(size));        // compressed size
    push(u32(size));        // uncompressed size
    push(u16(nameB.length));
    push(u16(0));           // extra len
    push(nameB);
    push(e.content);

    // 中央目录记录（46B + name）
    const c: Uint8Array[] = [];
    c.push(u32(0x02014b50));
    c.push(u16(20));        // version made by
    c.push(u16(20));        // version needed
    c.push(u16(0x0800));
    c.push(u16(0));
    c.push(u16(time));
    c.push(u16(date));
    c.push(u32(crc));
    c.push(u32(size));
    c.push(u32(size));
    c.push(u16(nameB.length));
    c.push(u16(0)); // extra
    c.push(u16(0)); // comment
    c.push(u16(0)); // disk start
    c.push(u16(0)); // internal attrs
    c.push(u32(0)); // external attrs
    c.push(u32(localOffset));
    c.push(nameB);
    central.push(...c);

    offset += 30 + nameB.length + size;
  }

  const cdSize = central.reduce((s, b) => s + b.length, 0);

  // EOCD
  const end: Uint8Array[] = [];
  end.push(u32(0x06054b50));
  end.push(u16(0));
  end.push(u16(0));
  end.push(u16(entries.length));
  end.push(u16(entries.length));
  end.push(u32(cdSize));
  end.push(u32(offset));
  end.push(u16(0));

  const total = offset + cdSize + end.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const b of [...chunks, ...central, ...end]) { out.set(b, p); p += b.length; }
  return out;
}
