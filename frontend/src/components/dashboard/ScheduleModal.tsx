"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Maximize2,
  Info,
  Plus,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format, addHours, parse, isAfter } from "date-fns";
import { createMeeting } from "@/api/meetings";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ApiError } from "@/types/api-error";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const scheduleSchema = z
  .object({
    title: z
      .string()
      .min(1, "Meeting name is required")
      .max(200, "Name too long"),
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    description: z.string().max(2000).optional(),
    generateId: z.boolean(),
    passcode: z.string().optional(),
    enablePasscode: z.boolean(),
  })
  .refine(
    (data) => {
      try {
        const start = parse(
          `${data.date} ${data.startTime}`,
          "yyyy-MM-dd HH:mm",
          new Date()
        );
        const end = parse(
          `${data.date} ${data.endTime}`,
          "yyyy-MM-dd HH:mm",
          new Date()
        );
        return isAfter(end, start);
      } catch {
        return true;
      }
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function nextHalfHour(): string {
  const now = new Date();
  const m = now.getMinutes();
  const roundedM = m < 30 ? 30 : 0;
  const h = m < 30 ? now.getHours() : now.getHours() + 1;
  return `${String(h % 24).padStart(2, "0")}:${String(roundedM).padStart(2, "0")}`;
}

function oneHourLater(time: string): string {
  try {
    const d = parse(time, "HH:mm", new Date());
    return format(addHours(d, 1), "HH:mm");
  } catch {
    return "09:00";
  }
}

function randomPasscode(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Pill Date/Time Input ─────────────────────────────────────────────────────
interface PillInputProps {
  type: "date" | "time";
  value: string;
  onChange: (v: string) => void;
  label: string;
  hasError?: boolean;
}

function PillInput({ type, value, onChange, label, hasError }: PillInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0b5cff] ${
        hasError
          ? "text-[#e3371e] border border-[#e3371e]"
          : "text-[#cccccc] border border-[#444444]"
      }`}
      aria-label={label}
      style={{ background: "#2a2a2c", minWidth: type === "date" ? "140px" : "118px", colorScheme: "dark" }}
    />
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────
interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TIMEZONE_LABEL = `(${
  new Date()
    .toLocaleString("en-US", { timeZoneName: "short" })
    .split(" ")
    .pop() ?? "Local"
}) ${TIMEZONE.replace(/_/g, " ")}`;

export function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
  const { hostId } = useCurrentUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const startDefault = nextHalfHour();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: "",
      date: todayStr(),
      startTime: startDefault,
      endTime: oneHourLater(startDefault),
      description: "",
      generateId: true,
      passcode: randomPasscode(),
      enablePasscode: true,
    },
  });

  const watchDate = watch("date");
  const watchStart = watch("startTime");
  const watchEnd = watch("endTime");
  const watchGenerateId = watch("generateId");
  const watchPasscode = watch("passcode");
  const watchEnablePasscode = watch("enablePasscode");

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const onSubmit = async (data: ScheduleFormValues) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const scheduledAt = new Date(
        `${data.date}T${data.startTime}:00`
      ).toISOString();

      // Compute duration in minutes from start→end times
      const startMs = parse(`${data.date} ${data.startTime}`, "yyyy-MM-dd HH:mm", new Date()).getTime();
      const endMs   = parse(`${data.date} ${data.endTime}`,   "yyyy-MM-dd HH:mm", new Date()).getTime();
      const durationMinutes = Math.max(5, Math.round((endMs - startMs) / 60000));

      await createMeeting({
        meeting_type: "SCHEDULED",        // ← backend field name
        host_id: hostId,
        title: data.title,
        description: data.description || undefined,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes, // ← required by backend for SCHEDULED
      });

      queryClient.invalidateQueries({ queryKey: ["meetings", "upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["meetings", "recent"] });
      reset();
      onClose();
      router.push("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const raw = apiErr?.message;
      // Backend returns validation array for 422
      const msg = Array.isArray(raw)
        ? (raw[0] as { msg?: string })?.msg ?? "Validation failed"
        : (raw as string) ?? "Failed to schedule meeting.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        <div
          className="w-full max-w-[560px] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "#252527",
            boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            maxHeight: "90vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top controls */}
          <div className="flex items-center justify-end gap-1 px-4 pt-3 pb-1 flex-shrink-0">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#666666] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors"
              aria-label="Expand"
            >
              <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#666666] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              aria-label="Close"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-y-auto"
          >
            <div className="px-5 pb-4 space-y-5">
              {/* Event name */}
              <div>
                <input
                  id="schedule-title"
                  {...register("title")}
                  placeholder="Event Name"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-[22px] font-light text-white placeholder-[#555555] focus-visible:outline-none transition-all"
                  style={{
                    background: "transparent",
                    border: `1px solid ${errors.title ? "#e3371e" : "#0b5cff"}`,
                  }}
                  aria-label="Event name"
                  aria-invalid={errors.title ? "true" : undefined}
                />
                {errors.title && (
                  <p className="mt-1 text-[12px] text-[#e3371e] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Host icon row (decorative — matches Zoom's person icon under title) */}
              <div className="flex items-center gap-2 -mt-2">
                <div className="w-7 h-7 rounded-full bg-[#0b5cff] flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-white">P</span>
                </div>
              </div>

              {/* Date + Time pills */}
              <div className="flex flex-wrap items-center gap-2">
                <PillInput
                  type="date"
                  value={watchDate}
                  onChange={(v) => setValue("date", v)}
                  label="Date"
                  hasError={!!errors.date}
                />
                <PillInput
                  type="time"
                  value={watchStart}
                  onChange={(v) => {
                    setValue("startTime", v);
                    setValue("endTime", oneHourLater(v));
                  }}
                  label="Start time"
                  hasError={!!errors.startTime}
                />
                <PillInput
                  type="time"
                  value={watchEnd}
                  onChange={(v) => setValue("endTime", v)}
                  label="End time"
                  hasError={!!errors.endTime}
                />
                <PillInput
                  type="date"
                  value={watchDate}
                  onChange={(v) => setValue("date", v)}
                  label="End date"
                />
              </div>
              {errors.endTime && (
                <p className="text-[12px] text-[#e3371e] flex items-center gap-1 -mt-3">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {errors.endTime.message}
                </p>
              )}

              {/* Timezone */}
              <div className="flex items-center gap-1 -mt-1">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[13px] text-[#aaaaaa] hover:text-white transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
                >
                  <span className="truncate max-w-[280px]">{TIMEZONE_LABEL}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#666666] flex-shrink-0" />
                </button>
              </div>

              {/* Repeat */}
              <div className="flex items-center gap-3">
                <span className="text-[14px] text-[#cccccc] font-medium">Repeat</span>
                <div className="relative inline-flex items-center">
                  <select
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-[13px] text-[#cccccc] focus-visible:outline-2 focus-visible:outline-[#0b5cff] cursor-pointer"
                    style={{
                      background: "#2a2a2c",
                      border: "1px solid #444444",
                    }}
                    aria-label="Repeat"
                  >
                    <option>Never</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-[#888888] absolute right-2.5 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div
                className="border-t"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              />

              {/* Invitees */}
              <div>
                <label
                  htmlFor="schedule-invitees"
                  className="block text-[14px] font-semibold text-white mb-2"
                >
                  Invitees
                </label>
                <input
                  id="schedule-invitees"
                  type="text"
                  placeholder="Add invitees"
                  className="w-full px-3 py-2 rounded-lg text-[14px] text-white placeholder-[#444444] focus-visible:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid #0b5cff"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
                />
              </div>

              {/* Meeting ID */}
              <div>
                <h3 className="text-[14px] font-semibold text-white mb-3">Meeting ID</h3>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: watchGenerateId ? "#0b5cff" : "#555555",
                        background: watchGenerateId ? "#0b5cff" : "transparent",
                      }}
                      aria-hidden="true"
                    >
                      {watchGenerateId && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <input
                      type="radio"
                      className="sr-only"
                      checked={watchGenerateId}
                      onChange={() => setValue("generateId", true)}
                      aria-label="Generate Automatically"
                    />
                    <span className="text-[14px] text-[#cccccc]">Generate Automatically</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: !watchGenerateId ? "#0b5cff" : "#555555",
                        background: !watchGenerateId ? "#0b5cff" : "transparent",
                      }}
                      aria-hidden="true"
                    >
                      {!watchGenerateId && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <input
                      type="radio"
                      className="sr-only"
                      checked={!watchGenerateId}
                      onChange={() => setValue("generateId", false)}
                      aria-label="Personal Meeting ID"
                    />
                    <span className="text-[14px] text-[#cccccc]">
                      Personal Meeting ID{" "}
                      <span className="text-[#888888]">
                        {hostId
                          ? `${String(hostId).padStart(3, "0")} ${hostId} ${hostId}`
                          : "—"}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Meeting agenda */}
              <div>
                <h3 className="text-[14px] font-semibold text-white mb-2">Meeting agenda</h3>
                <button
                  type="button"
                  className="text-[14px] text-[#0b5cff] hover:underline focus-visible:outline-2 focus-visible:outline-[#0b5cff] rounded"
                  onClick={() => {
                    const el = document.getElementById("schedule-description");
                    el?.focus();
                  }}
                >
                  Create agenda
                </button>
                <textarea
                  id="schedule-description"
                  {...register("description")}
                  placeholder="Add agenda, notes, or description…"
                  rows={3}
                  className="mt-2 w-full px-3 py-2 rounded-lg text-[14px] text-white placeholder-[#444444] resize-none focus-visible:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid #0b5cff"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
                />
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-[14px] font-semibold text-white">Attachments</h3>
                  <button
                    type="button"
                    className="text-[#666666] hover:text-[#aaaaaa] transition-colors"
                    aria-label="Attachments info"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-[#cccccc] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
                  style={{ background: "#2a2a2c", border: "1px solid #444444" }}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add attachments
                </button>
              </div>

              {/* Meeting Security */}
              <div>
                <h3 className="text-[14px] font-semibold text-white mb-3">Meeting Security</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => setValue("enablePasscode", !watchEnablePasscode)}
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] ${
                        watchEnablePasscode
                          ? "bg-[#0b5cff] border-[#0b5cff]"
                          : "border border-[#555555]"
                      }`}
                      aria-checked={watchEnablePasscode}
                      role="checkbox"
                      aria-label="Enable passcode"
                    >
                      {watchEnablePasscode && (
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span className="text-[14px] text-[#cccccc]">Passcode</span>
                    {watchEnablePasscode && (
                      <>
                        <input
                          {...register("passcode")}
                          className="px-2.5 py-1 rounded-lg text-[13px] text-[#cccccc] focus-visible:outline-2 focus-visible:outline-[#0b5cff] w-24"
                          style={{
                            background: "#2a2a2c",
                            border: "1px solid #444444",
                          }}
                          aria-label="Passcode"
                        />
                        <button
                          type="button"
                          className="text-[#666666] hover:text-[#aaaaaa] transition-colors"
                          aria-label="Passcode info"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  {watchEnablePasscode && (
                    <p className="text-[12px] text-[#666666] pl-7">
                      Only users who have the invite link or passcode can join the meeting
                    </p>
                  )}
                </div>
              </div>

              {/* Submit error */}
              {submitError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{
                    background: "rgba(227,55,30,0.12)",
                    border: "1px solid rgba(227,55,30,0.3)",
                  }}
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-[#e3371e] flex-shrink-0" />
                  <p className="text-[13px] text-[#e3371e]">{submitError}</p>
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0 mt-auto"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                type="button"
                className="text-[14px] text-[#0b5cff] hover:underline focus-visible:outline-2 focus-visible:outline-[#0b5cff] rounded"
              >
                More Options
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg text-[14px] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
                  style={{ background: "#3a3a3c" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="schedule-save-btn"
                  className="px-6 py-2 rounded-lg text-[14px] font-semibold text-white transition-all focus-visible:outline-2 focus-visible:outline-[#0b5cff] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#0b5cff" }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
