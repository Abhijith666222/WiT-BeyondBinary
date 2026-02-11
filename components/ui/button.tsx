"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-rose focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF4F7] disabled:pointer-events-none disabled:opacity-50 active:shadow-button-press hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#F0BFCF] to-[#E8A3B5] text-[#2A2433] shadow-soft hover:shadow-button-glow active:translate-y-[1px]",
        secondary:
          "bg-[#FAF4F7]/90 text-foreground border border-[rgba(230,180,200,0.35)] hover:bg-[#F4EEF6] hover:border-brand-rose/50 backdrop-blur-sm",
        outline:
          "border border-brand-rose/50 bg-transparent text-foreground hover:bg-brand-pink/20 hover:border-brand-rose/60",
        ghost: "text-foreground hover:bg-brand-pink/20",
        link: "text-brand-rose underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-[44px] px-6 py-2",
        sm: "h-9 min-h-[36px] rounded-full px-4",
        lg: "h-12 min-h-[48px] rounded-full px-8 text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
