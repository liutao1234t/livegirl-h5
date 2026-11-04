import { useEffect, useRef, useState, type RefObject } from "react";

const ARM = 56;
const MAX = 88;

export function usePullToRefresh(scroller: RefObject<HTMLElement | null>, onRefresh?: () => Promise<unknown>) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const enabled = Boolean(onRefresh);
  useEffect(() => {
    const el = scroller.current;
    const refresh = onRefreshRef.current;
    if (!el || !refresh) return;

    let distance = 0;
    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0]?.clientY ?? 0;
      distance = 0;
      pulling.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY.current;
      if (el.scrollTop > 0 || dy <= 0) {
        distance = 0;
        setPull(0);
        return;
      }
      e.preventDefault();
      distance = Math.min(dy * 0.42, MAX);
      setPull(distance);
    };

    const onEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (distance < ARM) {
        setPull(0);
        return;
      }
      setPull(ARM);
      setRefreshing(true);
      void refresh().finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scroller, refreshing, enabled]);

  return { pull, refreshing };
}
