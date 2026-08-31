/**
 * 品牌矢量 Logo：EZNINE。
 * 格式参考电路板字标——线框经纬地球置于字母后方，粗线电路走线字母横贯赤道，
 * 笔画端点/转角布红色焊点。米白线（--ink）+ 红节点（--accent），适配黑底制图风。
 */
const WORD = 'EZNINE';

const LETTER_W: Record<string, number> = { E: 15, Z: 14, N: 14, I: 9 };

function letterPath(ch: string, x: number): string | null {
  switch (ch) {
    case 'E':
      return `M ${x} 10 H ${x + 11.5} M ${x} 18 H ${x + 8.5} M ${x} 26 H ${x + 11.5} M ${x} 10 V 26`;
    case 'Z':
      return `M ${x} 10 H ${x + 11} L ${x} 26 H ${x + 11}`;
    case 'N':
      return `M ${x} 26 V 10 L ${x + 10.5} 26 V 10`;
    case 'I':
      return `M ${x + 4.5} 10 V 26`;
    default:
      return null;
  }
}

/** 红色焊点：挂在笔画端点与转角，像 PCB 上的过孔 */
function letterNodes(ch: string, x: number): { cx: number; cy: number }[] {
  switch (ch) {
    case 'E':
      return [
        { cx: x + 11.5, cy: 10 },
        { cx: x, cy: 26 },
      ];
    case 'Z':
      return [
        { cx: x + 11, cy: 10 },
        { cx: x + 11, cy: 26 },
      ];
    case 'N':
      return [
        { cx: x, cy: 10 },
        { cx: x + 10.5, cy: 26 },
      ];
    case 'I':
      return [
        { cx: x + 4.5, cy: 10 },
        { cx: x + 4.5, cy: 26 },
      ];
    default:
      return [];
  }
}

export function BrandLogo({ className = 'h-9' }: { className?: string }) {
  const startX = 10;
  const letters: { ch: string; x: number; d: string | null }[] = [];
  let x = startX;
  for (const ch of WORD) {
    letters.push({ ch, x, d: letterPath(ch, x) });
    x += LETTER_W[ch] ?? 12;
  }
  const last = letters[letters.length - 1];
  const rightEdge = last.x + (LETTER_W[last.ch] ?? 12);
  const wordCenter = (startX + rightEdge) / 2;
  const width = rightEdge + 10;

  return (
    <svg viewBox={`0 0 ${width} 36`} className={`${className} w-auto`} fill="none" aria-hidden="true">
      {/* 线框地球（置于字母后方，横贯赤道） */}
      <g stroke="var(--ink)" strokeLinecap="round">
        <circle cx={wordCenter} cy={18} r={15.5} strokeWidth={1.1} opacity={0.5} />
        <ellipse cx={wordCenter} cy={18} rx={6.8} ry={15.5} strokeWidth={0.9} opacity={0.3} />
        <ellipse cx={wordCenter} cy={18} rx={15.5} ry={5.6} strokeWidth={0.9} opacity={0.26} />
        <line x1={wordCenter - 15.5} y1={18} x2={startX - 2} y2={18} strokeWidth={0.9} opacity={0.22} />
        <line x1={rightEdge + 2} y1={18} x2={wordCenter + 15.5} y2={18} strokeWidth={0.9} opacity={0.22} />
      </g>
      {/* 地球上的红色坐标点（北极附近） */}
      <circle cx={wordCenter + 8} cy={7.5} r={1.9} fill="var(--accent)" />

      {/* 电路走线字母 */}
      <g stroke="var(--ink)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        {letters.map((l, i) => (l.d ? <path key={i} d={l.d} /> : null))}
      </g>

      {/* 端点焊点 */}
      {letters.flatMap((l, i) =>
        letterNodes(l.ch, l.x).map((n, j) => (
          <circle key={`${i}-${j}`} cx={n.cx} cy={n.cy} r={1.9} fill="var(--accent)" />
        )),
      )}
    </svg>
  );
}
