/**
 * Client-side OCR using Tesseract.js. Use from browser only.
 */

export async function recognizeTextFromVideoFrame(
  video: HTMLVideoElement,
  options?: { lang?: string }
): Promise<string> {
  const canvas = document.createElement("canvas");
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return "";
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

  const Tesseract = (await import("tesseract.js")).default;
  const {
    data: { text },
  } = await Tesseract.recognize(dataUrl, options?.lang ?? "eng");
  return (text ?? "").trim();
}

/** Split OCR text into lines (e.g. for menu items) */
export function textToLines(text: string): { text: string; type: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text, type: "menu" }));
}
