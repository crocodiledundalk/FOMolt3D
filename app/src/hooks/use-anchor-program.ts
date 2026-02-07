"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "@/lib/idl-types";
import idl from "@/lib/idl.json";

/**
 * Creates an AnchorProvider + Program from the connected wallet and connection.
 * Returns null when no wallet is connected.
 */
export function useAnchorProgram(): {
  program: Program<Fomolt3d>;
  provider: AnchorProvider;
} | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    const program = new Program<Fomolt3d>(
      idl as unknown as Fomolt3d,
      provider
    );
    return { program, provider };
  }, [connection, wallet]);
}
