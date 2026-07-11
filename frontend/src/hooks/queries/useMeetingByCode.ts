import { useQuery } from "@tanstack/react-query";
import { getMeetingByCode } from "@/api/meetings";

export function useMeetingByCode(code?: string) {
  return useQuery({
    queryKey: ["meetings", "code", code],
    queryFn: () => getMeetingByCode(code!),
    enabled: !!code,
    staleTime: 10_000,
    retry: 1,
  });
}
