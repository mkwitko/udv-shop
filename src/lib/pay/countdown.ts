import { useEffect, useState } from "react";

/** "04:37" a partir de um ISO de expiração; nunca fica negativo. */
export function formatRemaining(expiresAt: string, now: number): string {
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isExpired(expiresAt: string, now: number): boolean {
  return new Date(expiresAt).getTime() <= now;
}

/** Relógio de 1s para o contador do Pix. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
