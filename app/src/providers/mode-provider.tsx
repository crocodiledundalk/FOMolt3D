"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Mode = "human" | "agent";

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isAgent: boolean;
  isHuman: boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

const STORAGE_KEY = "fomolt3d-mode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("human");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "agent" || stored === "human") {
      setModeState(stored);
    }
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        isAgent: mode === "agent",
        isHuman: mode === "human",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
