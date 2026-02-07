"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import type { Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "@/lib/idl-types";
import type { OnChainGlobalConfig } from "@/lib/sdk/types";
import { fetchGlobalConfig } from "@/lib/sdk/accounts";
import { useAnchorProgram } from "./use-anchor-program";

interface UseAdminResult {
  isAdmin: boolean;
  config: OnChainGlobalConfig | null;
  program: Program<Fomolt3d> | null;
  isLoading: boolean;
}

/**
 * Fetches GlobalConfig and compares config.admin to the connected wallet.
 * Returns { isAdmin, config, program, isLoading }.
 */
export function useAdmin(): UseAdminResult {
  const { publicKey } = useWallet();
  const anchor = useAnchorProgram();

  const { data: config, isLoading } = useQuery({
    queryKey: ["globalConfig"],
    queryFn: () => fetchGlobalConfig(anchor!.program),
    enabled: !!anchor,
    refetchInterval: 10_000,
  });

  const isAdmin =
    !!publicKey &&
    !!config &&
    config.admin.toBase58() === publicKey.toBase58();

  return {
    isAdmin,
    config: config ?? null,
    program: anchor?.program ?? null,
    isLoading,
  };
}
