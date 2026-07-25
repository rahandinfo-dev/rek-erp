"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  height?: number;
  displayValue?: boolean;
  className?: string;
};

export default function BarcodeSvg({
  value,
  height = 48,
  displayValue = true,
  className,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      if (!ref.current || !value) return;
      const JsBarcode = (await import("jsbarcode")).default;
      if (cancelled || !ref.current) return;
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          displayValue,
          fontSize: 12,
          height,
          margin: 4,
          background: "#ffffff",
          lineColor: "#1f1218",
        });
      } catch {
        // invalid content for Code128
      }
    }

    void draw();
    return () => {
      cancelled = true;
    };
  }, [value, height, displayValue]);

  if (!value) {
    return (
      <span className="text-xs text-slate-400">بارکۆد نییە</span>
    );
  }

  return <svg ref={ref} className={className} />;
}
