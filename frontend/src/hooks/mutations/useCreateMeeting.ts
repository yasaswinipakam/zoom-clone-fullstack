"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createMeeting } from "@/api/meetings";
import type { MeetingCreate } from "@/types/meeting";

export function useCreateMeeting() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MeetingCreate) => createMeeting(payload),
    onSuccess: (meeting) => {
      // Invalidate both list caches so they refetch immediately
      queryClient.invalidateQueries({ queryKey: ["meetings", "upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["meetings", "recent"] });
      // Navigate to the meeting room
      router.push(`/meeting/${meeting.meeting_code}`);
    },
  });
}
