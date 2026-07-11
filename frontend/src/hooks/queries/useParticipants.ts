import { useQuery } from "@tanstack/react-query";
import { fetchParticipants } from "@/api/meetings";
import type { ParticipantStatus } from "@/types/enums";

export function useParticipants(code?: string, status?: ParticipantStatus) {
  return useQuery({
    queryKey: ["participants", code, status],
    queryFn: () => fetchParticipants(code!, status),
    enabled: !!code,
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}
