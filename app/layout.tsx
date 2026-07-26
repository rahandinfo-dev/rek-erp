import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import RekToaster from "@/components/ui/RekToaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeScript from "@/components/theme/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: BRAND.productName,
    template: `%s · ${BRAND.nameEn}`,
  },
  description: `${BRAND.productName} — ${BRAND.taglineEn}. ${BRAND.taglineKu}`,
  applicationName: BRAND.productName,
  keywords: [BRAND.nameEn, BRAND.nameKu, "ERP", "ئینڤێنتۆری", "فرۆشتن"],
  authors: [{ name: BRAND.nameEn }],
  openGraph: {
    title: BRAND.productName,
    description: BRAND.taglineKu,
    siteName: BRAND.productName,
    locale: "ckb_IQ",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      {
        url: "/icons/apple-touch-icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.shortName,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFAE42" },
    { media: "(prefers-color-scheme: dark)", color: "#14100c" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ckb" dir="rtl" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="max-w-full overflow-x-clip bg-background text-foreground antialiased">
        <a href="#main-content" className="rek-skip-link">
          بازدان بۆ ناوەڕۆک
        </a>
        <ThemeProvider>
          {children}
          <RekToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
