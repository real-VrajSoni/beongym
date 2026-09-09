"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--brand)] text-[var(--brand-foreground)] shadow-sm hover:bg-[var(--brand-hover)]",
        secondary:
          "border border-[var(--border-strong)] bg-[var(--surface)] text-foreground shadow-[var(--shadow-card)] hover:bg-[var(--surface-hover)]",
        ghost: "text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground",
        soft: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)] hover:brightness-[0.97]",
        danger: "bg-[var(--danger)] text-white shadow-sm hover:brightness-95",
        outlineDanger:
          "border border-[var(--danger)]/35 text-[var(--danger)] hover:bg-[var(--danger-soft)]",
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-9 px-3.5 [&_svg]:size-4",
        lg: "h-10 px-4 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        iconSm: "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
