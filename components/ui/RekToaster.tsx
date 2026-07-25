"use client";

import { Toaster } from "sonner";

export default function RekToaster() {
  return (
    <Toaster
      position="top-center"
      duration={3800}
      gap={12}
      expand
      visibleToasts={4}
      richColors
      toastOptions={{
        classNames: {
          toast: "rek-sonner-fallback",
        },
      }}
    />
  );
}
