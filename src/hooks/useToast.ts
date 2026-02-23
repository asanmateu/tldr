import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3000;

export function useToast() {
  const [toast, setToast] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToast(undefined);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const clearToast = useCallback(() => {
    setToast(undefined);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { toast, showToast, clearToast } as const;
}
