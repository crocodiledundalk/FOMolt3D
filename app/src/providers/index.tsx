"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { WalletProvider } from "./wallet-provider";
import { ModeProvider } from "./mode-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>
        <ModeProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "var(--color-bg-secondary)",
                border: "2px dashed var(--color-border)",
                color: "var(--color-text-primary)",
              },
            }}
          />
        </ModeProvider>
      </WalletProvider>
    </QueryProvider>
  );
}
