import React from "react";
import clsx from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string;
  width?: string;
  circle?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      height = "h-4",
      width = "w-full",
      circle = false,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={clsx(
        "bg-surface-100 animate-pulse",
        height,
        width,
        circle ? "rounded-full" : "rounded-md",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
);

Skeleton.displayName = "Skeleton";

// Pre-built skeleton for meeting cards
export const CardSkeleton: React.FC = () => (
  <div className="space-y-3 p-4 rounded-lg border border-[#e2e8f0]">
    <Skeleton height="h-5" width="w-2/3" />
    <Skeleton height="h-4" width="w-full" />
    <Skeleton height="h-4" width="w-4/5" />
    <div className="flex gap-2 pt-1">
      <Skeleton height="h-8" width="w-24" />
    </div>
  </div>
);

// Pre-built skeleton for participant tiles in meeting room
export const ParticipantTileSkeleton: React.FC = () => (
  <div className="flex flex-col items-center gap-2">
    <Skeleton height="h-16" width="w-16" circle />
    <Skeleton height="h-3" width="w-20" />
  </div>
);
