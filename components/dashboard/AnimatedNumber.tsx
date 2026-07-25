"use client";
import { formatNumber } from "@/lib/utils/format";

import { useEffect, useState } from "react";

type Props = {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
};

export default function AnimatedNumber({
  value,
  durationMs = 900,
  format = (n) => formatNumber(Math.round(n)),
  className,
}: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
