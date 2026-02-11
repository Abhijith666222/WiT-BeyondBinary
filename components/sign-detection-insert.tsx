"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Scan, Loader2 } from "lucide-react";
import { detectSignFromVideo } from "@/lib/sign-detection";
import { meaningFromSign, meaningFromSpeech } from "@/lib/mesh/meaning";
import { renderText } from "@/lib/mesh/renderers";
import sgslSigns from "@/data/sgsl_signs.json";
import type { SgSLSign } from "@/lib/types";

const signs = sgslSigns as SgSLSign[];

const ASL_WORD_TO_SGSL: Record<string, string> = {
  "thank-you": "THANK",
  "thank you": "THANK",
  yes: "YES",
  no: "NO",
  help: "HELP",
  sorry: "SORRY",
  good: "GOOD",
  want: "WANT",
  can: "CAN",
  have: "HAVE",
  how: "HOW-MUCH",
  my: "MY",
  your: "YOUR",
  you: "YOU",
  like: "LIKE",
  love: "LOVE",
  get: "GET",
  apple: "FOOD",
};

export interface SignDetectionInsertProps {
  onInsert: (text: string) => void;
  label?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
  /** When true (default), runs detection every 2s while camera is on. */
  autoDetect?: boolean;
}

export function SignDetectionInsert({
  onInsert,
  label = "Detect sign",
  disabled,
  onError,
  autoDetect = true,
}: SignDetectionInsertProps) {
  const [cameraOn, setCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoDetectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraOn]);

  const startCamera = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("Camera not supported");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        setCameraOn(true);
      })
      .catch(() => {
        onError?.("Camera access denied");
      });
  }, [onError]);

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      if (!cameraOn) {
        startCamera();
        return;
      }
      onError?.("Camera not ready");
      return;
    }
    if (isDetecting) return;
    setIsDetecting(true);
    try {
      const result = await detectSignFromVideo(video);
      if (!result.detectedSign) {
        onError?.("No sign detected. Try again with your hand in frame.");
        return;
      }
      const label = result.detectedSign.trim();
      const normalizedGloss = label.toUpperCase().replace(/\s+/g, "-");
      const glossForMatch =
        ASL_WORD_TO_SGSL[label.toLowerCase().replace(/-/g, " ")] ?? normalizedGloss;
      const matchedSign = signs.find(
        (s) =>
          s.english_gloss === glossForMatch ||
          s.english_gloss === normalizedGloss ||
          s.english_gloss.replace(/-/g, " ") === label.toUpperCase()
      );
      const text = matchedSign
        ? renderText(meaningFromSign(matchedSign))
        : renderText(meaningFromSpeech(label));
      if (text) onInsert(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onError?.(msg.includes("not configured") ? "Set ROBOFLOW_API_KEY to enable sign detection." : msg);
    } finally {
      setIsDetecting(false);
    }
  }, [cameraOn, isDetecting, onInsert, onError, startCamera]);

  useEffect(() => {
    if (!cameraOn || !autoDetect) {
      if (autoDetectIntervalRef.current) {
        clearInterval(autoDetectIntervalRef.current);
        autoDetectIntervalRef.current = null;
      }
      return;
    }
    const id = setInterval(() => runDetection(), 2000);
    autoDetectIntervalRef.current = id;
    return () => {
      if (autoDetectIntervalRef.current) clearInterval(autoDetectIntervalRef.current);
      autoDetectIntervalRef.current = null;
    };
  }, [cameraOn, autoDetect, runDetection]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!cameraOn ? (
        <Button
          variant="outline"
          size="sm"
          onClick={startCamera}
          disabled={disabled}
          className="text-xs"
          data-voice-action="start-camera"
        >
          <Video className="h-3.5 w-3.5 mr-1" />
          Camera for sign
        </Button>
      ) : (
        <>
          <div className="relative w-24 h-20 rounded-lg overflow-hidden bg-black/40 border border-white/10">
            <video
              ref={videoRef}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runDetection}
            disabled={disabled || isDetecting}
            className="text-xs"
            data-voice-action="detect-sign"
          >
            {isDetecting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Scan className="h-3.5 w-3.5 mr-1" />
            )}
            {label}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopCamera}
            disabled={disabled}
            className="text-xs"
            aria-label="Turn off camera"
          >
            <VideoOff className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
