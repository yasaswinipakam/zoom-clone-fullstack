import React from "react";
import { Plus } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Plus className="w-12 h-12" aria-hidden="true" />,
  title = "No items yet",
  message,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="text-[#64748b] mb-3">{icon}</div>
    <h3 className="text-lg font-semibold text-[#0f172a] mb-1">{title}</h3>
    <p className="text-[#64748b] text-sm max-w-sm mb-4">{message}</p>
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
