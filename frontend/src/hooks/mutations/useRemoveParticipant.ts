"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeParticipant } from "@/api/meetings";

interface RemoveParticipantArgs {
  code: string;
  participantId: number;
}

/**
 * Host-only mutation — removes a participant from a meeting.
 * Automatically refetches the participant list for the given meeting code.
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, participantId }: RemoveParticipantArgs) =>
      removeParticipant(code, participantId),
    onSuccess: (_data, { code }) => {
      queryClient.invalidateQueries({ queryKey: ["participants", code] });
    },
  });
}
