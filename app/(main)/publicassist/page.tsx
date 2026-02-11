"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Train, FileCheck, ChevronRight, Pencil, Eraser, Volume2, Heart, Baby, Users, Briefcase } from "lucide-react";
import type { Meaning } from "@/lib/types";
import type { PersonaMode } from "@/lib/types";
import {
  renderText,
  speakText,
  renderSignGloss,
  getHapticPattern,
  triggerVibration,
  playHapticFallback,
} from "@/lib/mesh/renderers";
import { meaningFromText } from "@/lib/mesh/meaning";
import { useStore } from "@/lib/store";

type TaskId = "hospital" | "mrt" | "govt" | "womens_health" | "caregiving" | "meeting";

interface WorkflowStep {
  step: string;
  label: string;
}

const TASKS: Record<TaskId, { label: string; icon: typeof Building2; steps: WorkflowStep[] }> = {
  womens_health: {
    label: "Women's Health",
    icon: Heart,
    steps: [
      { step: "select", label: "Select: Prenatal visit, Postnatal care, or Well-woman checkup." },
      { step: "register", label: "Register at the counter with your NRIC." },
      { step: "wait", label: "Proceed to the waiting area. A nurse will call your name." },
      { step: "consult", label: "During your appointment, use the phrase panel if you need to communicate." },
    ],
  },
  caregiving: {
    label: "Caregiving Support",
    icon: Users,
    steps: [
      { step: "identify", label: "Inform staff: 'This person is my caregiver' or 'I am the carer.'" },
      { step: "explain", label: "Use the phrase panel to explain your needs." },
      { step: "follow", label: "Follow staff instructions. Ask for written notes if needed." },
    ],
  },
  meeting: {
    label: "Meeting Assist",
    icon: Briefcase,
    steps: [
      { step: "intro", label: "Use self-advocacy phrases when you need to be heard." },
      { step: "professional", label: "Use professional phrases for feedback and clarity." },
    ],
  },
  hospital: {
    label: "Hospital",
    icon: Building2,
    steps: [
      { step: "scan_id", label: "Scan your NRIC or passport at the reader." },
      { step: "confirm_name", label: "Confirm your name on screen." },
      { step: "take_number", label: "Take your queue number." },
      { step: "wait_area", label: "Proceed to the waiting area." },
    ],
  },
  mrt: {
    label: "MRT / Transport",
    icon: Train,
    steps: [
      { step: "select_destination", label: "Select your destination on the map." },
      { step: "tap_card", label: "Tap your travel card or buy a single trip ticket." },
      { step: "collect_ticket", label: "Collect your ticket from the slot." },
      { step: "proceed_gate", label: "Proceed to the fare gate." },
    ],
  },
  govt: {
    label: "Government / Public Service",
    icon: FileCheck,
    steps: [
      { step: "scan_id", label: "Scan your SingPass or NRIC." },
      { step: "select_service", label: "Select the service you need." },
      { step: "choose_slot", label: "Choose an available time slot." },
      { step: "confirm_booking", label: "Confirm your appointment. A slip will be printed." },
    ],
  },
};

const WOMENS_HEALTH_PHRASES = [
  "I would like a female doctor",
  "I need a sign language interpreter",
  "I have questions about my prescription",
  "I need more time to understand",
  "Please explain that again",
  "I would prefer a woman practitioner",
  "Can we discuss this privately?",
  "I have a hearing / visual impairment",
];

const CAREGIVING_PHRASES = [
  "My child needs assistance",
  "This person is my caregiver",
  "My parent needs help with medication",
  "We need to reschedule this appointment",
  "I am here to support this person",
  "Please speak to me, I am the carer",
  "We need a quiet space",
];

const MEETING_SELF_ADVOCACY = [
  "Could you repeat that?",
  "I'd like to finish my point.",
  "Can we go back to the previous slide?",
  "Please slow down.",
  "I didn't catch that.",
  "Let me complete my thought.",
];

const MEETING_PROFESSIONAL = [
  "I'd like to discuss compensation.",
  "Can I get feedback on my performance?",
  "I'd like clarification on expectations.",
  "I'd like to schedule a one-on-one.",
  "Can we revisit this in the next meeting?",
];

const COMMON_PHRASES: Record<TaskId, string[]> = {
  meeting: [...MEETING_SELF_ADVOCACY, ...MEETING_PROFESSIONAL],
  womens_health: WOMENS_HEALTH_PHRASES,
  caregiving: CAREGIVING_PHRASES,
  hospital: [
    "I need help",
    "Where is the registration counter?",
    "I have an appointment",
    "I don't speak much English",
    "Can you write that down?",
    "I am deaf / hard of hearing",
    "Please speak slowly",
    "Which floor is that?",
    "Where is the toilet?",
  ],
  mrt: [
    "I need help with the ticket machine",
    "Where is the nearest MRT station?",
    "How much to Orchard Road?",
    "I want a single trip ticket",
    "My card is not working",
    "Where do I tap in?",
    "Which platform?",
    "I am lost",
  ],
  govt: [
    "I have an appointment",
    "I need to collect a document",
    "Where do I queue?",
    "I don't speak much English",
    "Can someone help me?",
    "I am deaf / hard of hearing",
    "Please write it down",
  ],
};

const OBGYN_SUBFLOWS: Record<string, WorkflowStep[]> = {
  prenatal: [
    { step: "weigh", label: "Weigh yourself and note it on your chart." },
    { step: "urine", label: "Provide a urine sample if requested." },
    { step: "vitals", label: "Nurse will take your blood pressure and vitals." },
    { step: "consult", label: "Doctor will discuss your progress and answer questions." },
  ],
  postnatal: [
    { step: "check", label: "Check-in at reception for your postnatal appointment." },
    { step: "healing", label: "Doctor will check your healing and recovery." },
    { step: "questions", label: "Use the phrase panel for any questions about care." },
  ],
  wellwoman: [
    { step: "checkin", label: "Check in and complete any forms." },
    { step: "screen", label: "Screening may include Pap smear, breast check, or other tests." },
    { step: "discuss", label: "Discuss results and any follow-up with your doctor." },
  ],
};

function stepToMeaning(step: WorkflowStep): Meaning {
  return {
    intent: "service_instruction",
    entities: { step: step.step, raw: step.label },
    confidence: 1,
  };
}

function renderStepByPersona(
  meaning: Meaning,
  persona: PersonaMode,
  ttsRate: number,
  voicePreset?: "clear" | "neutral" | "soft"
) {
  const text = renderText(meaning);
  const pattern = getHapticPattern(meaning);
  if (text) speakText(meaning, { rate: ttsRate, voicePreset });
  if (persona === "deafblind") {
    if (!triggerVibration(pattern)) playHapticFallback();
  }
}

function DrawingBoard({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d"), []);

  const getPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const ev = "touches" in e ? e.touches[0] : e;
    return {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getCtx, getPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getPoint(e);
      ctx.strokeStyle = "#E8A3B5";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getCtx, getPoint]
  );

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCtx();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#FAF4F7";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }, [getCtx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#FAF4F7";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground mb-2">Draw something to show people:</p>
      <div className="relative rounded-xl overflow-hidden border border-[rgba(230,180,200,0.35)] bg-[#FAF4F7]">
        <canvas
          ref={canvasRef}
          className="w-full h-48 touch-none cursor-crosshair block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-2 right-2"
          onClick={clear}
          data-voice-action="clear-drawing"
        >
          <Eraser className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}

export default function PublicAssistPage() {
  const { preferences } = useStore();
  const persona = preferences.persona;
  const ttsRate = preferences.ttsRate ?? 1;

  const [task, setTask] = useState<TaskId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [obgynSubflow, setObgynSubflow] = useState<keyof typeof OBGYN_SUBFLOWS | null>(null);

  const baseSteps = task ? TASKS[task].steps : [];
  const steps =
    task === "womens_health"
      ? obgynSubflow
        ? OBGYN_SUBFLOWS[obgynSubflow]
        : []
      : baseSteps;
  const currentStep = steps[stepIndex];
  const meaning = currentStep ? stepToMeaning(currentStep) : null;
  const phrases = task ? COMMON_PHRASES[task] : [];

  const goNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else setStepIndex(steps.length);
  }, [stepIndex, steps.length]);

  useEffect(() => {
    if (meaning) renderStepByPersona(meaning, persona, ttsRate, preferences.ttsVoicePreset);
  }, [task, stepIndex, meaning, persona, ttsRate, preferences.ttsVoicePreset]);

  const showText = true;
  const showGloss = persona === "deaf" || persona === "helper";
  const useHaptic = persona === "deafblind";

  const speakPhrase = useCallback(
    (text: string) => {
      speakText(meaningFromText(text), { rate: ttsRate, voicePreset: preferences.ttsVoicePreset });
    },
    [ttsRate, preferences.ttsVoicePreset]
  );

  const [customMessage, setCustomMessage] = useState("");
  const speakCustom = useCallback(() => {
    const t = customMessage.trim();
    if (t) speakText(meaningFromText(t), { rate: ttsRate, voicePreset: preferences.ttsVoicePreset });
  }, [customMessage, ttsRate, preferences.ttsVoicePreset]);

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col px-4 py-8 md:px-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Public Assist</h1>
        <p className="mt-1 text-muted-foreground">
          Common phrases and workflows for hospital, transport, and government services. Tap to speak.
        </p>
      </motion.div>

      <Card className="mb-6 glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-5 w-5 text-brand-rose" />
            Type a message to speak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && speakCustom()}
              placeholder="Type your message here…"
              className="flex-1 min-h-[44px] rounded-xl border border-[rgba(230,180,200,0.35)] bg-[#FAF4F7] px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-rose/40"
              aria-label="Type a message to speak"
            />
            <Button
              onClick={speakCustom}
              disabled={!customMessage.trim()}
              className="min-h-[44px] shrink-0"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Speak
            </Button>
          </div>
        </CardContent>
      </Card>

      {!task ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-1 content-start">
          {(Object.entries(TASKS) as [TaskId, (typeof TASKS)[TaskId]][]).map(([id, t]) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (["hospital", "mrt", "govt"].indexOf(id) + 1) }}
            >
              <Card
                className="glass-card cursor-pointer hover:border-brand-cyan/40 transition-all h-full"
                data-voice-action={`task-${id.replace(/_/g, "-")}`}
                onClick={() => {
                  setTask(id);
                  setStepIndex(0);
                  setObgynSubflow(null);
                }}
              >
                <CardHeader>
                  <t.icon className="h-8 w-8 text-brand-rose" />
                  <CardTitle className="text-lg">{t.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.steps.length} steps + common phrases</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const TaskIcon = TASKS[task].icon;
                  return <TaskIcon className="h-6 w-6 text-brand-rose" />;
                })()}
                {TASKS[task].label}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setTask(null); setStepIndex(0); setObgynSubflow(null); }}>
                Change
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {task === "womens_health" && !obgynSubflow && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Choose visit type</p>
                  <div className="flex flex-wrap gap-2">
                    {(["prenatal", "postnatal", "wellwoman"] as const).map((sf) => (
                      <Button key={sf} variant="secondary" size="sm" onClick={() => { setObgynSubflow(sf); setStepIndex(0); }}>
                        {sf === "prenatal" ? "Prenatal visit" : sf === "postnatal" ? "Postnatal care" : "Well-woman checkup"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {task === "meeting" && (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Self-advocacy — tap to speak</p>
                    <div className="flex flex-wrap gap-2">
                      {MEETING_SELF_ADVOCACY.map((p) => (
                        <Button key={p} variant="secondary" size="sm" className="h-auto py-2 px-3 text-left whitespace-normal" onClick={() => speakPhrase(p)}>
                          <Volume2 className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5" />
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Professional & negotiation</p>
                    <div className="flex flex-wrap gap-2">
                      {MEETING_PROFESSIONAL.map((p) => (
                        <Button key={p} variant="secondary" size="sm" className="h-auto py-2 px-3 text-left whitespace-normal" onClick={() => speakPhrase(p)}>
                          <Volume2 className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5" />
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {task !== "meeting" && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Common phrases — tap to speak</p>
                <div className="flex flex-wrap gap-2">
                  {phrases.map((p) => (
                    <Button
                      key={p}
                      variant="secondary"
                      size="sm"
                      className="h-auto py-2 px-3 text-left whitespace-normal"
                      onClick={() => speakPhrase(p)}
                    >
                      <Volume2 className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5" />
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Step-by-step</p>
                <AnimatePresence mode="wait">
                  {currentStep && (
                    <motion.div
                      key={stepIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex flex-col gap-3"
                    >
                      <p className="text-lg text-foreground">{currentStep.label}</p>
                      {showGloss && (
                        <p className="text-sm font-mono text-brand-rose">
                          [Sign: {renderSignGloss(stepToMeaning(currentStep))}]
                        </p>
                      )}
                      {useHaptic && <p className="text-sm text-muted-foreground">Haptic played</p>}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => meaning && speakText(meaning, { rate: ttsRate, voicePreset: preferences.ttsVoicePreset })}>
                          Play speech
                        </Button>
                        {persona === "deafblind" && meaning && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const pattern = getHapticPattern(meaning);
                              if (!triggerVibration(pattern)) playHapticFallback();
                            }}
                          >
                            Replay haptic
                          </Button>
                        )}
                        <Button size="sm" onClick={goNext}>
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {stepIndex >= steps.length && steps.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <p className="text-muted-foreground">Done.</p>
                    <Button variant="secondary" size="sm" onClick={() => { setStepIndex(0); }}>
                      Restart steps
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pencil className="h-5 w-5 text-brand-rose" />
                Drawing board
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DrawingBoard />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
