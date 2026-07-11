import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingMeetings } from "@/api/meetings";

export function useUpcomingMeetings(hostId?: number) {
  return useQuery({
    queryKey: ["meetings", "upcoming", hostId],
    queryFn: () => fetchUpcomingMeetings(hostId),
    enabled: hostId !== undefined && hostId > 0,
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}
