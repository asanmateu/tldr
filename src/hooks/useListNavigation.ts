import { useCallback, useState } from "react";

interface UseListNavigationOptions {
  itemCount: number;
  initialIndex?: number;
}

interface UseListNavigationResult {
  index: number;
  setIndex: (index: number | ((prev: number) => number)) => void;
  handleUp: () => void;
  handleDown: () => void;
}

export function useListNavigation({
  itemCount,
  initialIndex = 0,
}: UseListNavigationOptions): UseListNavigationResult {
  const [index, setIndex] = useState(initialIndex);

  const handleUp = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleDown = useCallback(() => {
    setIndex((i) => Math.min(itemCount - 1, i + 1));
  }, [itemCount]);

  return { index, setIndex, handleUp, handleDown };
}
