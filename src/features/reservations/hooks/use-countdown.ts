"use client";

import { useEffect, useState } from "react";

function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function secondsUntil(targetIso: string): number {
  return Math.round((new Date(targetIso).getTime() - Date.now()) / 1000);
}

export function useCountdown(targetIso: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(targetIso));

  useEffect(() => {
    // Recompute immediately on mount/target change, not just on the next tick —
    // otherwise a stale value from a prior render (e.g. a placeholder "now"
    // target used before real data loads) lingers for up to a full second.
    setSecondsLeft(secondsUntil(targetIso));
    const interval = setInterval(() => setSecondsLeft(secondsUntil(targetIso)), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  const clamped = Math.max(0, secondsLeft);
  return { secondsLeft: clamped, isExpired: secondsLeft <= 0, formatted: formatSeconds(clamped) };
}
