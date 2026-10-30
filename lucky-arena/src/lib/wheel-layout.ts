// How a wheel segment's label and icon are laid out. Kept as plain maths so tests can prove nothing spills out of its slice.

export interface SegmentLayout {
  lines: string[];
  fontSize: number;
  iconSize: number;
  textInner: number; // radial span (in a 300x300 viewBox, wheel radius 150) the text may use
  textOuter: number;
  iconRadius: number;
  textLength: number; // longest line, squeezed to fit when needed
  squeezed: boolean;
}

export const TEXT_OUTER = 100;

/** Splits a long label into at most two lines at the space nearest the middle. */
export function splitLabel(label: string): string[] {
  const t = label.trim();
  if (t.length <= 7 || !t.includes(" ")) return [t];
  const mid = t.length / 2;
  let best = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [t.slice(0, best), t.slice(best + 1)];
}

export function segmentLayout(label: string, sliceAngle: number): SegmentLayout {
  const big = sliceAngle >= 60;
  const lines = splitLabel(label);
  const fontSize = big ? 15 : lines.length > 1 ? 10 : 12;
  const iconSize = big ? 34 : 22;
  const textInner = big ? 40 : 48;
  const maxLen = TEXT_OUTER - textInner;
  const natural = Math.max(...lines.map((l) => l.length)) * fontSize * 0.68; // bold caps/digits are about 0.68em wide
  return {
    lines,
    fontSize,
    iconSize,
    textInner,
    textOuter: TEXT_OUTER,
    iconRadius: big ? 118 : 122,
    textLength: Math.min(natural, maxLen),
    squeezed: natural > maxLen,
  };
}

/** Width of a slice at a given radius. */
export const chordAt = (radius: number, sliceAngle: number) => 2 * radius * Math.tan((sliceAngle * Math.PI) / 360);

/** True when the laid-out label fits inside its slice (height across the slice, length along the radius). */
export function fits(label: string, sliceAngle: number): boolean {
  const l = segmentLayout(label, sliceAngle);
  const blockHeight = l.lines.length * l.fontSize * 1.15;
  const iconFits = l.iconSize <= chordAt(l.iconRadius - l.iconSize / 2, sliceAngle) && l.iconRadius + l.iconSize / 2 <= 140;
  return blockHeight <= chordAt(l.textInner, sliceAngle) && l.textLength <= l.textOuter - l.textInner + 0.001 && iconFits && l.iconRadius - l.iconSize / 2 > l.textOuter;
}
