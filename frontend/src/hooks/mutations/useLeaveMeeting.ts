"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { leaveMeeting } from "@/api/meetings";

interface LeaveMeetingArgs {
  code: string;
  participantId: number;
}

export function useLeaveMeeting() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, participantId }: LeaveMeetingArgs) =>
      leaveMeeting(code, participantId),
    onSuccess: (_data, { code }) => {
      queryClient.invalidateQueries({ queryKey: ["participants", code] });
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`participant_${code}`);
      }
      router.push("/dashboard");
    },
  });
}
