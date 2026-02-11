"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Adaptation rules
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Built-in rules power persona and output behaviour.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How adaptation works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            SignBridge applies <strong className="text-foreground">built-in rules</strong> based on your chosen persona and preferences:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-foreground">Deaf</strong> — primary output: text; secondary: speech, sign gloss, haptic</li>
            <li><strong className="text-foreground">Blind</strong> — primary: speech; secondary: text, haptic; Dictate and screen-reader friendly UI</li>
            <li><strong className="text-foreground">Helper</strong> — all outputs available to support the person you’re with</li>
          </ul>
          <p>
            The translation mesh (Meaning Layer + renderers) turns input (sign picker, speech, or text) into every output mode. No configurable rule editor in this release.
          </p>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Back to Universe Home <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
