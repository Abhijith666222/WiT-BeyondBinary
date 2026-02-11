import { NextRequest, NextResponse } from "next/server";

/** ASL word-level model (18 words: apple, thank-you, yes, no, help, love, etc.) */
const DEFAULT_MODEL = "asl-dataset-p9yw8/1";
const MIN_CONFIDENCE = 0.3;

/** Roboflow object detection prediction */
interface RoboflowPrediction {
  class?: string;
  class_name?: string;
  confidence?: number;
  [key: string]: unknown;
}

interface RoboflowResponse {
  predictions?: RoboflowPrediction[];
  top?: string;
  confidence?: number;
  [key: string]: unknown;
}

/** Try V1 hosted API (detect.roboflow.com) - supports Universe public models */
async function inferV1(
  base64: string,
  apiKey: string,
  modelId: string
): Promise<{ res: Response; data?: RoboflowResponse }> {
  const params = new URLSearchParams({
    api_key: apiKey,
    confidence: String(MIN_CONFIDENCE),
    image_type: "base64",
  });
  const url = `https://detect.roboflow.com/${modelId}?${params.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: base64,
  });
  if (!res.ok) return { res };
  const data = (await res.json()) as RoboflowResponse;
  return { res, data };
}

/** Try Serverless API with JSON body (v2-style) */
async function inferServerless(
  base64: string,
  apiKey: string,
  modelId: string
): Promise<{ res: Response; data?: RoboflowResponse }> {
  const url = `https://serverless.roboflow.com/${modelId}?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: { type: "base64" as const, value: base64 },
      api_key: apiKey,
      confidence: MIN_CONFIDENCE,
    }),
  });
  if (!res.ok) return { res };
  const data = (await res.json()) as RoboflowResponse;
  return { res, data };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ROBOFLOW_API_KEY?.trim();
  const modelId = process.env.ROBOFLOW_MODEL_ID?.trim() ?? DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Sign detection is not configured",
        hint: "Set ROBOFLOW_API_KEY in .env.local. Get a free key at https://roboflow.com",
      },
      { status: 503 }
    );
  }

  let body: { image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { image: base64String }." },
      { status: 400 }
    );
  }

  const base64 = body.image?.replace(/^data:image\/\w+;base64,/, "")?.trim();
  if (!base64) {
    return NextResponse.json(
      { error: "Missing image. Send { image: base64String }." },
      { status: 400 }
    );
  }

  let data: RoboflowResponse | undefined;
  let lastRes: Response;
  let lastErrorBody: string | null = null;

  try {
    const v1 = await inferV1(base64, apiKey, modelId);
    lastRes = v1.res;
    if (v1.res.ok && v1.data) {
      data = v1.data;
    } else {
      lastErrorBody = await v1.res.text();
      const serverless = await inferServerless(base64, apiKey, modelId);
      lastRes = serverless.res;
      if (serverless.res.ok && serverless.data) {
        data = serverless.data;
      } else {
        lastErrorBody = await serverless.res.text();
      }
    }
    if (!data) {
      const detail =
        lastRes.status === 401
          ? "Invalid API key. Check ROBOFLOW_API_KEY at https://roboflow.com/settings/api"
          : lastRes.status === 404
            ? "Model not found. Try ROBOFLOW_MODEL_ID=asl-dataset/asl-dataset-p9yw8/1 or video-call-asl-signs/1 (letters)"
            : lastErrorBody?.slice(0, 300) || lastRes.statusText;
      return NextResponse.json(
        {
          error: "Sign detection service error",
          detail,
          status: lastRes.status,
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("Sign detection fetch error", err);
    return NextResponse.json(
      { error: "Sign detection request failed", detail: String(err) },
      { status: 502 }
    );
  }

  // Classification: top + confidence
  if (data.top != null && typeof data.top === "string") {
      const conf = typeof data.confidence === "number" ? data.confidence : 0;
      return NextResponse.json({
        detectedSign: conf >= MIN_CONFIDENCE ? data.top : null,
        confidence: conf,
        predictions: [{ class: data.top, confidence: conf }],
      });
    }

    // Object detection: predictions[] with class/class_name + confidence
    const predictions = Array.isArray(data.predictions) ? data.predictions : [];
    const best = predictions
      .filter(
        (p) =>
          (p.class ?? p.class_name) &&
          (typeof p.confidence === "number" ? p.confidence >= MIN_CONFIDENCE : true)
      )
      .sort(
        (a, b) =>
          (typeof b.confidence === "number" ? b.confidence : 0) -
          (typeof a.confidence === "number" ? a.confidence : 0)
      )[0];

    const detectedSign = best
      ? String(best.class ?? best.class_name ?? "").trim() || null
      : null;
    const confidence = typeof best?.confidence === "number" ? best.confidence : 0;

  return NextResponse.json({
    detectedSign,
    confidence,
    predictions: predictions.slice(0, 5).map((p) => ({
      class: p.class ?? p.class_name,
      confidence: p.confidence,
    })),
  });
}
