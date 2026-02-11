"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Train, Shield } from "lucide-react";

const connectors = [
  { id: "zoom", label: "Zoom / Teams / Meet", icon: Video, href: "/connectors/zoom" },
  { id: "lta", label: "LTA / MRT", icon: Train, href: "/connectors/lta" },
  { id: "gov", label: "Government / SingPass", icon: Shield, href: "/connectors/gov" },
];

export default function ConnectorsPage() {
  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Connectors
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Integrations for Zoom, LTA, and Government services.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {connectors.map((c) => (
          <Link key={c.id} href={c.href}>
            <Card className="hover:border-brand-cyan/30 transition-all">
              <CardHeader>
                <c.icon className="h-8 w-8 text-brand-cyan" />
                <CardTitle>{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="sm">Open</Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
