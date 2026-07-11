"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createMeeting, fetchParticipants } from "@/api/meetings";
import type { MeetingCreate } from "@/types/meeting";

export function useCreateMeeting() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MeetingCreate) => createMeeting(payload),
    onSuccess: async (meeting) => {
      // Invalidate both list caches so they refetch immediately
      queryClient.invalidateQueries({ queryKey: ["meetings", "upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["meetings", "recent"] });
      // The backend creates the host participant with the instant meeting.
      // Persist that participant ID only for the creator's browser session.
      try {
        const participants = await fetchParticipants(meeting.meeting_code);
        const hostParticipant = participants.find((participant) => participant.is_host);
        if (hostParticipant && typeof window !== "undefined") {
          sessionStorage.setItem(
            `participant_${meeting.meeting_code}`,
            String(hostParticipant.id)
          );
        }
      } catch {
        // The meeting itself was created successfully; navigation still works.
      } finally {
        // Navigate even if the follow-up identity lookup is interrupted.
        router.push(`/meeting/${meeting.meeting_code}`);
      }
    },
  });
}
