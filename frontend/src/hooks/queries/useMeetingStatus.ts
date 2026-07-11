import { useQuery } from "@tanstack/react-query";
import { getMeetingStatus } from "@/api/meetings";

export function useMeetingStatus(code?: string) {
  return useQuery({
    queryKey: ["meetings", "status", code],
    queryFn: () => getMeetingStatus(code!),
    enabled: !!code,
    refetchInterval: 5_000,
    staleTime: 3_000,
    retry: 1,
  });
}
