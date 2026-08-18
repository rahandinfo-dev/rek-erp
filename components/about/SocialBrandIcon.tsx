import type { ReactNode } from "react";
import { Globe2, Phone } from "lucide-react";

type Brand = "whatsapp" | "telegram" | "facebook" | "messenger" | "instagram" | "linkedin" | "portfolio" | "phone";

/** Small inline marks keep social links recognizable without adding a package. */
export function SocialBrandIcon({ brand, size = 20 }: { brand: Brand; size?: number }) {
  if (brand === "portfolio") return <Globe2 size={size} aria-hidden />;
  if (brand === "phone") return <Phone size={size} aria-hidden />;
  const paths: Record<Exclude<Brand, "portfolio" | "phone">, ReactNode> = {
    whatsapp: <path fill="currentColor" d="M12 2a10 10 0 0 0-8.66 15l-1.1 4 4.1-1.08A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.05-1.1l-.29-.17-2.43.64.65-2.36-.19-.31A8 8 0 1 1 12 20Zm4.39-5.98c-.24-.12-1.42-.7-1.64-.77-.22-.08-.38-.12-.54.12s-.62.77-.76.92-.28.17-.52.05a6.55 6.55 0 0 1-1.93-1.19 7.22 7.22 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49l.36-.42c.12-.14.16-.24.24-.4s.04-.3-.02-.42c-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.02.4 1.37.52.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />,
    telegram: <path fill="currentColor" d="M21.4 3.1 2.8 10.3c-1.27.5-1.26 1.2-.23 1.52l4.78 1.49 1.85 5.65c.23.63.12.88.78.88.5 0 .72-.23 1-.5l2.26-2.2 4.7 3.47c.86.48 1.48.23 1.7-.8L22.8 4.6c.32-1.27-.48-1.85-1.4-1.5ZM8.1 12.96l10.78-6.8c.54-.33 1.03-.15.62.21l-8.99 8.12-.35 3.74-1.7-5.27-4.52-1.4c-.98-.31-.99-.98.16-1.43l17.78-6.86-13.78 9.69Z" />,
    facebook: <path fill="currentColor" d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.87.25-1.46 1.5-1.46H17V3.96A23 23 0 0 0 15.05 3C12.9 3 11.4 4.3 11.4 6.7V10H8.8v3h2.6v8h2.4Z" />,
    messenger: <path fill="currentColor" d="M12 3C6.48 3 2 7.15 2 12.27c0 2.92 1.46 5.53 3.74 7.23V22l2.44-1.34c1.2.4 2.48.61 3.82.61 5.52 0 10-4.15 10-9.27S17.52 3 12 3Zm1 12.48-2.55-2.72-4.98 2.72 5.47-5.81 2.6 2.72 4.92-2.72L13 15.48Z" />,
    instagram: <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5ZM17.4 6.1a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z" />,
    linkedin: <path fill="currentColor" d="M6.5 8.4H3.2V21h3.3V8.4ZM4.85 3A1.93 1.93 0 1 0 4.9 6.86 1.93 1.93 0 0 0 4.85 3ZM21 13.8c0-3.8-2.03-5.57-4.73-5.57-2.18 0-3.16 1.2-3.7 2.04V8.4H9.28V21h3.29v-6.24c0-1.64.31-3.23 2.35-3.23 2.02 0 2.05 1.9 2.05 3.34V21H21v-7.2Z" />,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">{paths[brand]}</svg>;
}
