"use client";

import { useQuery } from "@tanstack/react-query";
import { API_ROUTES } from "@/lib/constants/routes";
import type { GameStateResponse } from "@/types/api";

export function useGameState() {
  return useQuery<GameStateResponse>({
    queryKey: ["gameState"],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.STATE);
      if (!res.ok) throw new Error("Failed to fetch game state");
      return res.json();
    },
    refetchInterval: 5000,
  });
}
