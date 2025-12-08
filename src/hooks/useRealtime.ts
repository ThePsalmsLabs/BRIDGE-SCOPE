"use client";

import { useEffect, useState } from "react";

type UseRealtimeOptions<T> = {
  initialValue: T;
  onMessage?: (value: T) => void;
};

export function useRealtime<T = unknown>({ initialValue, onMessage }: UseRealtimeOptions<T>) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((prev) => {
        onMessage?.(prev);
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [onMessage]);

  return value;
}

