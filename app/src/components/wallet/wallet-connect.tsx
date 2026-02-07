"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((mod) => ({
      default: mod.WalletMultiButton,
    })),
  { ssr: false }
);

export function WalletConnect() {
  return <WalletMultiButton className="!bg-bg-tertiary !text-text-primary hover:!bg-border !rounded-lg !text-sm !font-medium !h-9" />;
}
