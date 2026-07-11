import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
}) => (
  <div
    className="flex flex-col items-center justify-center py-12 px-4 text-center"
    role="alert"
    aria-live="assertive"
  >
    <AlertCircle
      className="w-12 h-12 text-danger mb-3"
      aria-hidden="true"
    />
    <h3 className="text-lg font-semibold text-[#0f172a] mb-1">{title}</h3>
    <p className="text-[#64748b] text-sm max-w-sm mb-4">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);
