import type { Metadata } from "next";
import "@fontsource/opendyslexic/latin-400.css";
import "@fontsource/opendyslexic/latin-700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { DemoTourProvider } from "@/components/demo-tour";
import { AccessibilityStyles } from "@/components/accessibility-styles";

export const metadata: Metadata = {
  title: "SignBridge Universe — Multimodal Assistive Communication",
  description: "Singapore-first multimodal communication ecosystem for Deaf, Blind, Deaf-blind, and Helpers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen text-foreground">
        <AccessibilityStyles />
        <DemoTourProvider>
          {children}
          <Toaster />
        </DemoTourProvider>
      </body>
    </html>
  );
}
