"use client";

import { useState, useEffect } from "react";

export type UrgencyLevel = "normal" | "warning" | "critical" | "danger" | "expired";

interface CountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  urgency: UrgencyLevel;
}

function getUrgency(totalSeconds: number): UrgencyLevel {
  if (totalSeconds <= 0) return "expired";
  if (totalSeconds < 300) return "danger"; // < 5 min
  if (totalSeconds < 1800) return "critical"; // < 30 min
  if (totalSeconds < 3600) return "warning"; // < 1 hour
  return "normal";
}

export function useCountdown(timerEnd: number): CountdownResult {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSeconds = Math.max(0, timerEnd - now);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const urgency = getUrgency(totalSeconds);

  return { hours, minutes, seconds, totalSeconds, urgency };
}
