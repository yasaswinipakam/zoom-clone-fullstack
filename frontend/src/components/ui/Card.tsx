import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isClickable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, isClickable = false, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "rounded-lg bg-surface border border-[#e2e8f0] p-4 shadow-card transition-shadow",
        isClickable && "cursor-pointer hover:shadow-elevated",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardSectionProps> = ({
  children,
  className,
}) => (
  <div className={clsx("border-b border-[#e2e8f0] pb-3 mb-3", className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<CardSectionProps> = ({
  children,
  className,
}) => (
  <h3 className={clsx("text-lg font-semibold text-[#0f172a]", className)}>
    {children}
  </h3>
);

export const CardContent: React.FC<CardSectionProps> = ({
  children,
  className,
}) => <div className={clsx("text-[#0f172a]", className)}>{children}</div>;

export const CardFooter: React.FC<CardSectionProps> = ({
  children,
  className,
}) => (
  <div
    className={clsx(
      "border-t border-[#e2e8f0] pt-3 mt-3 flex gap-2 justify-end",
      className
    )}
  >
    {children}
  </div>
);
