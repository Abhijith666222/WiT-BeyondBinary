/**
 * Capture a frame from a video element as JPEG base64 and call the sign-detection API.
 * Used for camera-based sign language recognition (e.g. Roboflow ASL model).
 */

export interface SignDetectionResult {
  detectedSign: string | null;
  confidence: number;
  predictions?: { class?: string; confidence?: number }[];
}

export async function detectSignFromVideo(
  video: HTMLVideoElement,
  options?: { quality?: number; maxWidth?: number }
): Promise<SignDetectionResult> {
  const canvas = document.createElement("canvas");
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) {
    throw new Error("Video not ready");
  }
  const maxW = options?.maxWidth ?? 640;
  const scale = Math.min(1, maxW / videoWidth);
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const quality = options?.quality ?? 0.85;
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

  const res = await fetch("/api/sign-detection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message = err.detail
      ? `${err.error || "Sign detection error"}: ${err.detail}`
      : err.error || err.hint || `Sign detection failed (${res.status})`;
    throw new Error(message);
  }

  return res.json() as Promise<SignDetectionResult>;
}
