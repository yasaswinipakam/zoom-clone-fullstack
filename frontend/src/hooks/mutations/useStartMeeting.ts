"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { startMeeting } from "@/api/meetings";

export function useStartMeeting() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => startMeeting(code),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ["meetings", "upcoming"] });
      queryClient.invalidateQueries({
        queryKey: ["meetings", "code", meeting.meeting_code],
      });
      router.push(`/meeting/${meeting.meeting_code}`);
    },
  });
}
