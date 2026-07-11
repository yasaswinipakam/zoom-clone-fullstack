import { useQuery } from "@tanstack/react-query";
import { fetchRecentMeetings } from "@/api/meetings";

export function useRecentMeetings(hostId?: number) {
  return useQuery({
    queryKey: ["meetings", "recent", hostId],
    queryFn: () => fetchRecentMeetings(hostId),
    enabled: hostId !== undefined && hostId > 0,
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}
