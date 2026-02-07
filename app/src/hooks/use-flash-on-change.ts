"use client";

import { useRef, useState, useEffect } from "react";

/**
 * Returns true for `durationMs` after `value` changes.
 * Skips the initial render (no flash on mount).
 */
export function useFlashOnChange<T>(value: T, durationMs = 600): boolean {
  const prevRef = useRef(value);
  const mountedRef = useRef(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = value;
      return;
    }

    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), durationMs);
      return () => clearTimeout(timer);
    }
  }, [value, durationMs]);

  return flashing;
}
