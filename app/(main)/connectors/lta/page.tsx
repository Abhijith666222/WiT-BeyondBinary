"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Train } from "lucide-react";

const MOCK_ARRIVALS = [
  { line: "NS", dest: "Jurong East", min: 2 },
  { line: "EW", dest: "Pasir Ris", min: 5 },
];

export default function LTAConnectorPage() {
  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        LTA / MRT
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Real-time arrivals.
      </p>
      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Train className="h-5 w-5 text-brand-cyan" /> Next trains
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {MOCK_ARRIVALS.map((a, i) => (
              <li key={i}>{a.line} — {a.dest} — {a.min} min</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
