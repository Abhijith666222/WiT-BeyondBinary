"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Volume2, VideoOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import { meaningFromText } from "@/lib/mesh/meaning";
import { speakText } from "@/lib/mesh/renderers";
import { recognizeTextFromVideoFrame, textToLines } from "@/lib/ocr";

type OcrResult = { text: string; type: string };

export default function ShoppingAssistPage() {
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<OcrResult[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const startCamera = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast("Camera not supported", "error");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: 1280, height: 720 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        setCameraOn(true);
        addToast("Camera on — point at text then tap Scan", "default");
      })
      .catch(() => addToast("Camera access denied", "error"));
  }, [addToast]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const runOcr = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      if (!cameraOn) {
        startCamera();
        return;
      }
      addToast("Camera not ready", "error");
      return;
    }
    setScanning(true);
    addToast("Scanning…", "default");
    try {
      const text = await recognizeTextFromVideoFrame(video);
      const lines = textToLines(text);
      setResults(lines.length > 0 ? lines : [{ text: "(no text detected)", type: "menu" }]);
      addToast(lines.length > 0 ? "Scan complete" : "No text found", lines.length > 0 ? "success" : "default");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "OCR failed", "error");
      setResults(null);
    } finally {
      setScanning(false);
    }
  }, [cameraOn, startCamera, addToast]);

  const outputToMode = (text: string) => {
    const meaning = meaningFromText(text);
    speakText(meaning, { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset });
    addToast(`Speaking: ${text}`, "success");
  };

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Shopping assist
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Camera + OCR (Tesseract). Results delivered in your preferred mode.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-brand-cyan" /> Scan item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center relative">
              {cameraOn ? (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : scanning ? (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-muted-foreground"
                >
                  Scanning…
                </motion.div>
              ) : (
                <span className="text-muted-foreground text-sm">Start camera to scan</span>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {!cameraOn ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={startCamera}
                  disabled={scanning}
                  data-voice-action="start-camera"
                >
                  <Camera className="mr-2 h-4 w-4" /> Start camera
                </Button>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={runOcr}
                    disabled={scanning}
                    data-voice-action="scan-ocr"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Scan (OCR)
                  </Button>
                  <Button variant="secondary" size="sm" onClick={stopCamera} aria-label="Stop camera">
                    <VideoOff className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results → your mode</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {results ? (
                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  {results.map((r, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"
                    >
                      <span className="text-foreground">{r.text}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => outputToMode(r.text)}
                        aria-label={`Speak ${r.text}`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </motion.li>
                  ))}
                </motion.ul>
              ) : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground text-sm"
                >
                  Start camera and scan to see OCR results. Tap speaker to hear each line.
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
