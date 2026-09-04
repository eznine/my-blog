'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { SiteConfig } from '@/lib/site';

/**
 * 封面右侧「勘测路线」（仅桌面 xl+，无外框，直接画在等高线背景上）：
 * 全站内容按时间自上而下排成一条弯曲路线。滚动驱动——hero-scroll 把开场
 * 进度写入 routeState（与 topoState 同款模块级解耦），本组件 rAF 读取：
 *   - wrap 随开场文字一起淡入（p 0.06→0.20，封面静止态不可见）
 *   - 路线随滚动向下延伸（p 0.12→0.86，双向可逆，同开场文字）
 *   - 线画到哪，点与月份就地浮现
 * 点形：笔记=圆（按分类着色）/研究=三角/工具=菱形/项目=方；每点微弱呼吸（错峰）。
 * 月份：变化才标一个 YYYY-MM，同月不重复。末端虚线 +「未完待续」。
 */

export interface RoutePoint {
  kind: 'note' | 'research' | 'tool' | 'project';
  title: string;
  date: string;
  href: string;
  /** 仅笔记：分类决定颜色 */
  category?: string;
}

type RouteCopy = NonNullable<SiteConfig['hero']['route']>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- 颜色 ---------- */

const KIND_COLORS: Record<RoutePoint['kind'], string> = {
  note: 'var(--accent)',
  research: '#8f7ab8',
  tool: '#46a3a3',
  project: '#a87e4f',
};

/* ---------- 几何：路线骨架 → Catmull-Rom 平滑 ---------- */
/* 相对坐标（0~1 × 包围盒）。最终形状 = 用户在 ?route-edit 编辑模式手捏
   （2026-09-03 经 route-anchors.json 导出固化）；再要调形状进编辑模式拖即可 */

const clampR = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const REL_ANCHORS: [number, number][] = [
  [0.9703, 0.0261], [0.8545, 0.1506], [0.8517, 0.2102], [0.7025, 0.2016],
  [0.6607, 0.2769], [0.6413, 0.143], [0.6413, 0.0259], [0.429, 0.0606],
  [0.4735, 0.3124], [0.4503, 0.3647], [0.4105, 0.3835], [0.4513, 0.418],
  [0.3196, 0.4494], [0.2038, 0.4264], [0.1741, 0.509], [0.2418, 0.508],
  [0.3604, 0.5916], [0.2974, 0.5958], [0.0555, 0.5289], [0.0545, 0.7484],
  [0.1417, 0.6732], [0.2594, 0.8739], [0.3243, 0.8436], [0.3437, 0.9147],
  [0.4077, 0.8833], [0.467, 0.7809], [0.6014, 0.7495], [0.657, 0.5937],
  [0.7989, 0.6073], [0.9778, 0.4902], [0.9147, 0.6826], [0.8044, 0.8292],
  [0.7293, 0.9044],
];

/** 末端虚线：沿最后一个锚点的行进方向（左下）继续延伸渐隐——路线没有终点 */
const lastAnchor = REL_ANCHORS[REL_ANCHORS.length - 1];
const REL_TAIL: [number, number][] = [
  lastAnchor,
  [clampR(lastAnchor[0] - 0.09, 0.05, 0.95), clampR(lastAnchor[1] + 0.048, 0.9, 0.98)],
  [clampR(lastAnchor[0] - 0.2, 0.05, 0.95), 0.958],
];

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

interface Placed extends RoutePoint {
  x: number;
  y: number;
  /** 沿线弧长比例 0~1 */
  t: number;
  /** 年份变化才标（每年只留一个），同月不再标 */
  showYear: boolean;
  year: string;
  /** 年份标注的【局部偏移】（text 在 station translate g 内，坐标相对点本身；居中于点正下方） */
  lx: number;
  ly: number;
}

/** 滚动窗口（与开场文字窗口对齐）：wrap 淡入 / 路线绘制 */
const VIS = [0.06, 0.2];
const DRAW = [0.12, 0.86];

/**
 * 把开场滚动进度应用到路线（hero-scroll 的 update() 每帧调用，DOM 直写无 React）。
 * 与 data-hs 文字同款驱动：双向可逆；编辑模式（.is-edit）跳过——编辑态强制全显。
 */
export function applyRouteProgress(root: ParentNode, p: number) {
  const wrap = root.querySelector<HTMLElement>('.hero-route-wrap');
  const path = root.querySelector<SVGPathElement>('.hero-route-path');
  if (!wrap || !path || wrap.classList.contains('is-edit')) return;
  const vis = clamp01((p - VIS[0]) / (VIS[1] - VIS[0]));
  const draw = clamp01((p - DRAW[0]) / (DRAW[1] - DRAW[0]));
  wrap.style.opacity = String(vis);
  path.style.strokeDashoffset = String(1000 * (1 - draw));
  wrap.classList.toggle('is-done', draw > 0.965);
  for (const st of wrap.querySelectorAll<SVGGElement>('.hero-route-station')) {
    st.classList.toggle('is-on', draw >= Number(st.dataset.t) - 0.015);
  }
}

export function HeroRouteMap({ points, copy }: { points: RoutePoint[]; copy?: RouteCopy }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [placed, setPlaced] = useState<Placed[] | null>(null);
  const router = useRouter();

  /* 编辑模式（?route-edit）：拖动骨架手柄自定义形状，自动暂存 localStorage，
     「复制 JSON」导出给 AI 固化进代码 */
  const editRef = useRef(false);
  const dragIdxRef = useRef<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editAnchors, setEditAnchors] = useState<[number, number][] | null>(null);
  const [copied, setCopied] = useState(false);

  /** 实际生效的相对锚点：编辑模式用拖出来的，平时用生成的 */
  const relAnchors: [number, number][] = editMode && editAnchors ? editAnchors : (REL_ANCHORS as [number, number][]);

  useEffect(() => {
    const edit = new URLSearchParams(window.location.search).has('route-edit');
    editRef.current = edit;
    setEditMode(edit);
    if (edit) {
      try {
        const saved = localStorage.getItem('route-anchors');
        if (saved) {
          const parsed = JSON.parse(saved) as [number, number][];
          if (Array.isArray(parsed) && parsed.length > 4) setEditAnchors(parsed);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (editMode && editAnchors) {
      try {
        localStorage.setItem('route-anchors', JSON.stringify(editAnchors));
      } catch {}
    }
  }, [editAnchors, editMode]);

  /* 1) 量 SVG 真实包围盒（ResizeObserver）：viewBox 跟着像素走，路线真正填满右侧且点不变形 */
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const r = svg.getBoundingClientRect();
      if (r.width > 40 && r.height > 40) {
        setBox((prev) => (prev && prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  /* 2) 沿真实路径弧长布点（时间旧→新，自上而下） */
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!box || !path || points.length === 0) return;
    let total = 0;
    try {
      total = path.getTotalLength();
    } catch {
      return;
    }
    if (!total) return;
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const out: Placed[] = [];
    const midX = (box?.w ?? 600) / 2;
    let lastYear = '';
    sorted.forEach((p, i) => {
      // 首点只留 2% 空段（约 0.04~0.06 画布高度）：起点稍后一点直接是第一个内容；
      // 终点贴到 95%，尾部虚线再向外延伸
      const t = sorted.length === 1 ? 0.5 : 0.02 + (i * 0.93) / (sorted.length - 1);
      const pt = path.getPointAtLength(t * total);
      const year = p.date.slice(0, 4);
      const showYear = year !== lastYear; // 年份变化才标，每年只留一个
      if (showYear) lastYear = year;
      // 年份标注：统一居中放在点正下方（不随点左右换边）
      out.push({
        ...p,
        x: pt.x,
        y: pt.y,
        t,
        showYear,
        year,
        lx: 0,
        ly: 21,
      });
    });
    setPlaced(out);
  }, [box, points, relAnchors]);

  /* 3) 编辑模式：强制全画全现（滚动驱动由 hero-scroll 调 applyRouteProgress，此处反向接管） */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.classList.toggle('is-edit', editMode);
    if (!editMode) return;
    wrap.style.opacity = '1';
    wrap.classList.add('is-done');
    const path = pathRef.current;
    if (path) path.style.strokeDashoffset = '0';
    for (const st of wrap.querySelectorAll<SVGGElement>('.hero-route-station')) {
      st.classList.add('is-on');
    }
  }, [editMode, placed]);

  if (!copy || points.length === 0) return null;

  const W = box?.w ?? 600;
  const H = box?.h ?? 800;
  const anchors: [number, number][] = relAnchors.map(([x, y]) => [x * W, y * H]);
  const tailPts: [number, number][] = REL_TAIL.map(([x, y]) => [x * W, y * H]);
  const routeD = smoothPath(anchors);
  const tailD = smoothPath(tailPts);
  const [tailX, tailY] = tailPts[tailPts.length - 1];
  const [originX, originY] = anchors[0];

  /* 编辑模式拖拽：手柄捕获指针，把指针位置换算回相对坐标写入对应锚点 */
  const onHandleDown = (i: number) => (e: ReactPointerEvent<SVGCircleElement>) => {
    e.preventDefault();
    dragIdxRef.current = i;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: ReactPointerEvent<SVGCircleElement>) => {
    const i = dragIdxRef.current;
    const svg = svgRef.current;
    if (i === null || !svg) return;
    const r = svg.getBoundingClientRect();
    const nx = clampR((e.clientX - r.left) / r.width, 0.02, 0.98);
    const ny = clampR((e.clientY - r.top) / r.height, 0.005, 0.995);
    setEditAnchors((prev) => {
      const base = (prev ?? (REL_ANCHORS as [number, number][])).slice();
      base[i] = [nx, ny];
      return base;
    });
  };
  const onHandleUp = (e: ReactPointerEvent<SVGCircleElement>) => {
    dragIdxRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const copyAnchors = () => {
    const data = JSON.stringify(relAnchors.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]));
    navigator.clipboard
      .writeText(data)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 4000);
      })
      .catch(() => {
        window.prompt('复制失败，请手动复制：', data);
      });
    // 同时下载为文件：不同浏览器窗口的暂存互不相通，下载文件交给 AI 直读
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route-anchors.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const resetAnchors = () => {
    try {
      localStorage.removeItem('route-anchors');
    } catch {}
    setEditAnchors(null);
  };

  return (
    <>
      <div ref={wrapRef} className="hero-route-wrap">
      <div className="hero-route-legend">
        <RouteLegendShape kind="note" color="var(--accent)" label={copy.legend.note} />
        <RouteLegendShape kind="research" color={KIND_COLORS.research} label={copy.legend.research} />
        <RouteLegendShape kind="tool" color={KIND_COLORS.tool} label={copy.legend.tool} />
        <RouteLegendShape kind="project" color={KIND_COLORS.project} label={copy.legend.project} />
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
        className="hero-route-svg"
        role="img"
        aria-label={copy.tail}
      >
        {/* 路线：随滚动延伸（pathLength=1000 归一化，dashoffset 由滚动进度直写） */}
        <path
          ref={pathRef}
          d={routeD}
          fill="none"
          pathLength={1000}
          className="hero-route-path"
          stroke="var(--ink)"
          strokeOpacity={0.6}
          strokeWidth={1.7}
          strokeLinecap="round"
        />

        {/* 末端：虚线沿行进方向延伸渐隐，绘制收尾时浮现；标注挂在虚线终点正下方 */}
        <path d={tailD} fill="none" className="hero-route-tail" stroke="var(--ink-faint)" strokeWidth={1.3} strokeLinecap="round" strokeDasharray="1.5 7" />
        <text x={tailX} y={tailY + 15} textAnchor="middle" className="hero-route-tail-label">
          {copy.tail}
        </text>

        {/* 起点：测量基准点 + 起始年份 */}
        <g className="hero-route-origin" transform={`translate(${originX.toFixed(1)},${originY.toFixed(1)})`}>
          <path d="M-6.5 5.5 L0 -7 L6.5 5.5 Z" fill="none" stroke="var(--ink)" strokeOpacity={0.6} strokeWidth={1.2} />
          <circle r={1.7} fill="var(--ink)" />
          <text x={-10} y={-4} textAnchor="end" className="hero-route-month" fill="var(--ink-soft)">
            {copy.start}
          </text>
        </g>

        {/* 站点：每篇文章一个点，线画到时浮现。
            外层 g 用属性 translate 定位（CSS transform 会覆盖 SVG transform 属性——
            station 的 CSS scale 会吃掉 translate，所有点会堆到 SVG 原点）。
            图标 = 统一圆点（细环呼吸脉冲），按内容类型着色区分 */}
        {placed?.map((p, i) => {
          const color = KIND_COLORS[p.kind];
          return (
            <g key={`${p.kind}-${p.href}`} transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}>
              <g
                className="hero-route-station"
                data-t={p.t.toFixed(4)}
              >
                <g className="hero-route-node" onClick={() => router.push(p.href)}>
                  <title>{`${p.title} · ${p.date}`}</title>
                  {/* 隐形命中区：点本体只有 10px，放大点击范围 */}
                  <circle r={11} fill="transparent" />
                  <circle
                    className="hero-route-ring"
                    r={8}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.9}
                    strokeWidth={1}
                    style={{ animationDelay: `${(i % 7) * 540}ms`, color } as CSSProperties}
                  />
                  <circle className="hero-route-mark" r={4} fill="currentColor" style={{ color } as CSSProperties} />
                </g>
                {p.showYear && (
                  <text x={p.lx.toFixed(1)} y={p.ly.toFixed(1)} textAnchor="middle" className="hero-route-month">
                    {p.year}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* 编辑模式：骨架手柄，拖动捏形状 */}
        {editMode &&
          relAnchors.map(([ax, ay], i) => (
            <circle
              key={`handle-${i}`}
              className="hero-route-handle"
              cx={(ax * W).toFixed(1)}
              cy={(ay * H).toFixed(1)}
              r={9}
              onPointerDown={onHandleDown(i)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
            />
          ))}
      </svg>
      </div>

      {/* 编辑模式工具条：portal 挂 body——page-enter 动画的 transform 祖先会劫持
          position:fixed（本页已知坑，同 Demo 面板），不挂 body 会跑到文档最底端 */}
      {editMode &&
        createPortal(
          <div className="route-edit-bar">
            <span>拖动圆点捏路线 · 自动暂存本机</span>
            <button type="button" onClick={copyAnchors}>
              复制 JSON
            </button>
            <button type="button" onClick={resetAnchors}>
              重置
            </button>
            {copied && <span className="route-edit-ok">已复制 ✓ 发给 AI 固化</span>}
          </div>,
          document.body
        )}
    </>
  );
}

function RouteLegendShape({ kind, color, label }: { kind: RoutePoint['kind']; color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-soft">
      <svg viewBox="-9 -9 18 18" className="h-[13px] w-[13px] shrink-0" aria-hidden="true">
        <circle r={6.2} fill="none" stroke={color} strokeOpacity={0.35} />
        <circle r={3.2} fill={color} />
      </svg>
      {label}
    </span>
  );
}
