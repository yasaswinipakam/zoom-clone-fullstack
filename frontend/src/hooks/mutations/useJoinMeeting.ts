"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { joinMeeting } from "@/api/meetings";
import type { ParticipantCreate } from "@/types/participant";

export function useJoinMeeting(code: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ParticipantCreate) => joinMeeting(code, payload),
    onSuccess: (participant) => {
      queryClient.invalidateQueries({ queryKey: ["participants", code] });
      // Store participantId in sessionStorage for leave/self-identity
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `participant_${code}`,
          String(participant.id)
        );
      }
      router.push(`/meeting/${code}`);
    },
  });
}
