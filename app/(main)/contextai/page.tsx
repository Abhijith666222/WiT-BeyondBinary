"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, UtensilsCrossed, Train } from "lucide-react";
import { Button } from "@/components/ui/button";

const scenarios = [
  { id: "shopping", label: "Shopping assist", icon: ShoppingBag, href: "/contextai/shopping" },
  { id: "hawker", label: "Hawker center assist", icon: UtensilsCrossed, href: "/contextai/hawker" },
  { id: "mrt", label: "MRT assist", icon: Train, href: "/contextai/mrt" },
];

export default function ContextAIPage() {
  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[#2A2433] page-title"
      >
        ContextAI
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Daily assistant: OCR scan, safety alerts, navigation.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {scenarios.map((s) => (
          <Link key={s.id} href={s.href}>
            <Card className="hover:border-brand-rose/40 transition-all duration-250">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="icon-elevated flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pink/30 text-brand-rose">
                  <s.icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-lg">{s.label}</CardTitle>
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
