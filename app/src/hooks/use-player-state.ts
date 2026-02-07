"use client";

import { useQuery } from "@tanstack/react-query";
import { API_ROUTES } from "@/lib/constants/routes";
import type { PlayerStateResponse } from "@/types/api";

export function usePlayerState(address: string | null | undefined) {
  return useQuery<PlayerStateResponse>({
    queryKey: ["playerState", address],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.PLAYER(address!));
      if (!res.ok) throw new Error("Failed to fetch player state");
      return res.json();
    },
    enabled: !!address,
    refetchInterval: 10000,
  });
}
