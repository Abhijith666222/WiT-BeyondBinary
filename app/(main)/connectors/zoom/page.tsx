"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export default function ZoomConnectorPage() {
  const [link, setLink] = useState("");
  const [connected, setConnected] = useState(false);

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Join as interpreter
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Enter meeting link to join.
      </p>
      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-brand-cyan" /> Meeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            placeholder="Meeting link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-brand-cyan/50 focus:outline-none"
          />
          <Button
            variant="default"
            onClick={() => setConnected(!connected)}
          >
            {connected ? "Leave" : "Join"}
          </Button>
          {connected && (
            <div className="rounded-xl bg-white/10 p-3 text-sm text-muted-foreground">
              Transcript panel.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
