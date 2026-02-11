/** Simple mapping: character -> 3x2 braille dots (1-6). Used for display and haptic patterns. */
const BRAILLE_MAP: Record<string, number[]> = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5],
  h: [1, 2, 5], i: [2, 4], j: [2, 4, 5], k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5],
  o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5],
  u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6],
  " ": [], "1": [1], "2": [1, 2], "3": [1, 4], "4": [1, 4, 5], "5": [1, 5], "6": [1, 2, 4],
  "7": [1, 2, 4, 5], "8": [1, 2, 5], "9": [2, 4], "0": [2, 4, 5],
  ".": [2, 5, 6], ",": [2], "?": [2, 3, 6], "!": [2, 3, 5], "-": [3, 6],
};

/** Convert a character to 3x2 dot indices (1-6). */
export function charToBrailleDots(char: string): number[] {
  const lower = char.toLowerCase();
  return BRAILLE_MAP[lower] ?? [];
}

/** Convert string to array of 6-dot cells (each cell is array of 1-6). */
export function textToBrailleCells(text: string): number[][] {
  return text.split("").map((c) => charToBrailleDots(c));
}

/** Convert dot indices to vibration pattern (ms): short pulse per dot, gap between chars. */
export function dotsToVibrationPattern(dots: number[]): number[] {
  const arr: number[] = [];
  for (let i = 0; i < dots.length; i++) {
    if (i > 0) arr.push(40);
    arr.push(30);
  }
  return arr.length ? arr : [30];
}

/** Inverse: dots array (sorted) as key -> character. For send mode. */
const dotsToCharMap: Record<string, string> = {};
Object.entries(BRAILLE_MAP).forEach(([char, d]) => {
  const key = [...d].sort((a, b) => a - b).join("");
  if (key && !dotsToCharMap[key]) dotsToCharMap[key] = char;
});

export function brailleDotsToChar(dots: number[]): string {
  const key = [...dots].sort((a, b) => a - b).join("");
  return dotsToCharMap[key] ?? "";
}
