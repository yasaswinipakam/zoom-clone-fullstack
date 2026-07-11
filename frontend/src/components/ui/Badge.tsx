import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        primary: "bg-primary-100 text-primary",
        success: "bg-green-100 text-success",
        warning: "bg-yellow-100 text-warning",
        danger: "bg-red-100 text-danger",
        neutral: "bg-surface-100 text-[#0f172a]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  )
);

Badge.displayName = "Badge";
