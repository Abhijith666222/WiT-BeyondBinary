"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function GovConnectorPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Government / SingPass
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        No real auth. Secure modal placeholder.
      </p>
      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-cyan" /> Sign in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="default" onClick={() => setShowModal(true)}>
            SingPass login
          </Button>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card max-w-sm p-6"
              >
                <h3 className="font-semibold text-foreground">Secure login</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  No real SingPass. This is a demo placeholder.
                </p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
