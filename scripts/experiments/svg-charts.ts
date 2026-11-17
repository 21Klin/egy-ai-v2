/**
 * Minimal, dependency-free SVG chart primitives for the EXPERIMENTS.md
 * deliverables: 1600x1000, white background, readable printed in black and
 * white. Palette + validation per the dataviz skill (references/palette.md):
 * categorical slots 1-3 (blue/orange/aqua) for the three mutation rates,
 * used consistently across every chart; neutral greys for the two
 * baseline comparators (gen-1 champion, buy & hold) that aren't part of
 * the mutation-rate family. Lines additionally carry a dash-pattern
 * secondary encoding so grayscale printing never relies on hue alone.
 */

export const WIDTH = 1600;
export const HEIGHT = 1000;

export const COLORS = {
  surface: "#ffffff",
  ink: "#0b0b0b",
  inkSecondary: "#52514e",
  inkMuted: "#898781",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
  rateLow: "#2a78d6", // categorical slot 1 (blue)
  rateModerate: "#eb6834", // slot 2 (orange)
  rateHigh: "#1baf7a", // slot 3 (aqua)
  gen1: "#c3c2b7", // light grey — baseline comparator, not a mutation rate
  buyHold: "#52514e", // dark grey — baseline comparator, not a mutation rate
} as const;

export const RATE_DASH: Record<"low" | "moderate" | "high", string | undefined> = {
  low: undefined, // solid
  moderate: "10 6",
  high: "2 6",
};

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

type Margin = { top: number; right: number; bottom: number; left: number };

export function svgHeader(title: string, subtitle?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.surface}" />
<text x="48" y="48" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="26" font-weight="700" fill="${COLORS.ink}">${esc(title)}</text>
${subtitle ? `<text x="48" y="76" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="15" fill="${COLORS.inkSecondary}">${esc(subtitle)}</text>` : ""}
`;
}

export const SVG_FOOTER = `</svg>\n`;

/** Y-axis gridlines + ticks + an optional axis title (rotated). */
export function yAxis(
  margin: Margin,
  plotHeight: number,
  domain: [number, number],
  unit: string,
  ticks = 5,
  axisTitle?: string
): string {
  const scaleY = linearScale(domain, [plotHeight, 0]);
  // Pick enough decimals that adjacent ticks render as distinct labels (e.g. a
  // 0-0.015 domain needs 4 decimals, not the 2 that's right for a 0-100% domain).
  const step = (domain[1] - domain[0]) / ticks || 1;
  const neededDecimals = step === 0 ? 0 : 1 - Math.floor(Math.log10(Math.abs(step)));
  const decimals = Math.max(2, Math.min(6, neededDecimals));
  let out = "";
  for (let i = 0; i <= ticks; i++) {
    const v = domain[0] + ((domain[1] - domain[0]) * i) / ticks;
    const y = margin.top + scaleY(v);
    out += `<line x1="${margin.left}" y1="${y.toFixed(1)}" x2="${WIDTH - margin.right}" y2="${y.toFixed(1)}" stroke="${COLORS.grid}" stroke-width="1" />`;
    out += `<text x="${margin.left - 10}" y="${(y + 4).toFixed(1)}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.inkMuted}" text-anchor="end">${v.toFixed(
      decimals
    )}${unit}</text>`;
  }
  if (axisTitle) {
    out += `<text x="${18}" y="${margin.top + plotHeight / 2}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.inkSecondary}" text-anchor="middle" transform="rotate(-90 18 ${
      margin.top + plotHeight / 2
    })">${esc(axisTitle)}</text>`;
  }
  return out;
}

export function xAxisLabels(margin: Margin, plotWidth: number, plotHeight: number, labels: { x: number; text: string }[], axisTitle?: string): string {
  let out = `<line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${WIDTH - margin.right}" y2="${margin.top + plotHeight}" stroke="${COLORS.baseline}" stroke-width="1.5" />`;
  for (const l of labels) {
    out += `<text x="${l.x.toFixed(1)}" y="${margin.top + plotHeight + 24}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.inkMuted}" text-anchor="middle">${esc(
      l.text
    )}</text>`;
  }
  if (axisTitle) {
    out += `<text x="${margin.left + plotWidth / 2}" y="${margin.top + plotHeight + 56}" font-family="system-ui, sans-serif" font-size="14" fill="${COLORS.inkSecondary}" text-anchor="middle">${esc(
      axisTitle
    )}</text>`;
  }
  return out;
}

export function legendItem(x: number, y: number, color: string, label: string, dash?: string): string {
  const lineOrSwatch = dash !== undefined || dash === undefined
    ? `<line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" stroke="${color}" stroke-width="3" stroke-dasharray="${dash ?? ""}" />`
    : `<rect x="${x}" y="${y - 7}" width="20" height="14" fill="${color}" />`;
  return `${lineOrSwatch}<text x="${x + 36}" y="${y + 4}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.ink}">${esc(label)}</text>`;
}

export function legendSwatch(x: number, y: number, color: string, label: string): string {
  return `<rect x="${x}" y="${y - 10}" width="18" height="14" fill="${color}" /><text x="${x + 26}" y="${y + 1}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.ink}">${esc(
    label
  )}</text>`;
}

/** Multi-series line, with an optional shaded +/-1 std band per series. */
export function linePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function bandPath(upper: { x: number; y: number }[], lower: { x: number; y: number }[]): string {
  const up = upper.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const down = [...lower].reverse().map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return `${up} ${down} Z`;
}

export type { Margin };
