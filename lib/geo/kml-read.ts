import { bytesToText } from './detect';
import type { GjFeature, GjFeatureCollection, GjGeometry } from './types';

/**
 * KML / GPX 读取（DOMParser）。
 * KML → 面/线/点/多点，属性来自 ExtendedData 与 name/description；
 * GPX → 轨迹段转 LineString，途经点转 Point。
 */

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('XML 解析失败，文件可能已损坏或不是有效的 KML/GPX。');
  }
  return doc;
}

function parseCoord(s: string | null | undefined, expect: 'point' | 'line'): number[][] | null {
  if (!s) return null;
  const pts = s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => tok.split(',').map(Number))
    .filter((c) => c.length >= 2 && isFinite(c[0]) && isFinite(c[1]));
  if (expect === 'point') return pts.length ? [pts[0]] : null;
  return pts.length ? pts : null;
}

function kmlPlacemark(el: Element): GjFeature | null {
  const ns = '*';
  const geomEl = el.querySelector(':scope > Placemark > Point, :scope > Point') ||
    el.querySelector(':scope > Placemark > LineString, :scope > LineString') ||
    el.querySelector(':scope > Placemark > Polygon, :scope > Polygon') ||
    el.querySelector(':scope > Placemark > MultiGeometry, :scope > MultiGeometry');
  const myGeom = (sel: string) => geomEl?.querySelector(sel) || geomEl?.querySelector(`:scope > ${sel}`);
  const get = (sel: string) => myGeom(sel)?.textContent ?? null;

  let geometry: GjGeometry | null = null;
  if (geomEl?.localName === 'Point' || myGeom('Point')) {
    const c = parseCoord(get('Point > coordinates'), 'point');
    if (c) geometry = { type: 'Point', coordinates: c[0] };
  } else if (geomEl?.localName === 'LineString' || myGeom('LineString')) {
    const c = parseCoord(get('LineString > coordinates'), 'line');
    if (c) geometry = { type: 'LineString', coordinates: c };
  } else if (geomEl?.localName === 'Polygon' || myGeom('Polygon')) {
    const rings: number[][][] = [];
    myGeom('Polygon')?.querySelectorAll('outerBoundaryIs, innerBoundaryIs').forEach((b) => {
      const c = parseCoord(b.querySelector('LinearRing > coordinates')?.textContent ?? null, 'line');
      if (c) rings.push(c);
    });
    if (rings.length) geometry = { type: 'Polygon', coordinates: rings };
  } else if (geomEl?.localName === 'MultiGeometry' || myGeom('MultiGeometry')) {
    const subs: GjGeometry[] = [];
    myGeom('MultiGeometry')?.querySelectorAll('MultiGeometry > Point, MultiGeometry > LineString, MultiGeometry > Polygon').forEach((sub) => {
      const fake = document.createElement('x');
      fake.innerHTML = sub.outerHTML;
      const tmp = { localName: sub.localName, querySelector: (sel: string) => sub.querySelector(sel) } as any;
      const c = parseCoord(sub.querySelector('coordinates')?.textContent ?? null, sub.localName === 'Point' ? 'point' : 'line');
      if (c) {
        if (sub.localName === 'Point') subs.push({ type: 'Point', coordinates: c[0] });
        else if (sub.localName === 'LineString') subs.push({ type: 'LineString', coordinates: c });
        else if (sub.localName === 'Polygon') {
          const rings2: number[][][] = [];
          sub.querySelectorAll('outerBoundaryIs, innerBoundaryIs').forEach((b) => {
            const cc = parseCoord(b.querySelector('LinearRing > coordinates')?.textContent ?? null, 'line');
            if (cc) rings2.push(cc);
          });
          if (rings2.length) subs.push({ type: 'Polygon', coordinates: rings2 });
        }
      }
      void tmp;
    });
    if (subs.length) geometry = subs.length === 1 ? subs[0] : { type: 'GeometryCollection', geometries: subs };
  }

  if (!geometry) return null;

  const props: Record<string, unknown> = {};
  const name = el.querySelector('Placemark > name, :scope > name')?.textContent?.trim();
  if (name) props['名称'] = name;
  const desc = el.querySelector('Placemark > description, :scope > description')?.textContent?.trim();
  if (desc) props['描述'] = desc;
  el.querySelectorAll('ExtendedData > Data').forEach((d) => {
    const k = d.getAttribute('name') || 'field';
    props[k] = d.querySelector('value')?.textContent?.trim() ?? null;
  });
  el.querySelectorAll('ExtendedData > SchemaData > SimpleData').forEach((d) => {
    props[d.getAttribute('name') || 'field'] = d.textContent?.trim() ?? null;
  });

  return { type: 'Feature', properties: props, geometry };
}

export function kmlToFC(buf: ArrayBuffer): { fc: GjFeatureCollection; warnings: string[] } {
  const warnings: string[] = [];
  const doc = parseXml(bytesToText(buf));
  const placemarks = doc.getElementsByTagName('Placemark');
  const features: GjFeature[] = [];
  for (const pm of Array.from(placemarks) as unknown as Element[]) {
    const f = kmlPlacemark(pm);
    if (f) features.push(f);
  }
  if (!features.length) warnings.push('KML 内未找到可解析的几何（仅支持点/线/面/多点组合）。');
  return { fc: { type: 'FeatureCollection', features }, warnings };
}

export function gpxToFC(buf: ArrayBuffer): { fc: GjFeatureCollection; warnings: string[] } {
  const warnings: string[] = [];
  const doc = parseXml(bytesToText(buf));
  const features: GjFeature[] = [];
  // 途经点
  doc.getElementsByTagName('wpt') && Array.from(doc.getElementsByTagName('wpt') as unknown as Element[]).forEach((w) => {
    const lat = parseFloat(w.getAttribute('lat') || '');
    const lon = parseFloat(w.getAttribute('lon') || '');
    if (isFinite(lat) && isFinite(lon)) {
      const props: Record<string, unknown> = {};
      const name = w.querySelector('name')?.textContent?.trim();
      if (name) props['名称'] = name;
      features.push({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lon, lat] } });
    }
  });
  // 轨迹
  Array.from(doc.getElementsByTagName('trk') as unknown as Element[]).forEach((trk) => {
    const trkName = trk.querySelector('trk > name')?.textContent?.trim();
    Array.from(trk.getElementsByTagName('trkseg') as unknown as Element[]).forEach((seg, i) => {
      const coords: number[][] = [];
      Array.from(seg.getElementsByTagName('trkpt') as unknown as Element[]).forEach((pt) => {
        const lat = parseFloat(pt.getAttribute('lat') || '');
        const lon = parseFloat(pt.getAttribute('lon') || '');
        if (isFinite(lat) && isFinite(lon)) coords.push([lon, lat]);
      });
      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { 名称: trkName || `轨迹 ${i + 1}` },
          geometry: { type: 'LineString', coordinates: coords },
        });
      }
    });
  });
  if (!features.length) warnings.push('GPX 内未找到途经点或轨迹。');
  return { fc: { type: 'FeatureCollection', features }, warnings };
}