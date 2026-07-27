import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import RekToaster from "@/components/ui/RekToaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeScript from "@/components/theme/ThemeScript";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_META } from "@/lib/i18n/config";
import { tServer } from "@/lib/i18n";
import "./globals.css";

const meta = LOCALE_META[DEFAULT_LOCALE];
const t = tServer.t.bind(tServer);

export const metadata: Metadata = {
  title: {
    default: BRAND.productName,
    template: `%s · ${BRAND.nameKu}`,
  },
  description: `${BRAND.productName} — ${BRAND.taglineKu}`,
  applicationName: BRAND.productName,
  keywords: [BRAND.nameKu, BRAND.nameEn, "ERP", "ئینڤێنتۆری", "فرۆشتن"],
  authors: [{ name: BRAND.nameKu }],
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
    <html lang={meta.htmlLang} dir={meta.dir} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="max-w-full overflow-x-clip bg-background text-foreground antialiased">
        <a href="#main-content" className="rek-skip-link">
          {t("common.skipToContent")}
        </a>
        <LocaleProvider locale={DEFAULT_LOCALE}>
          <ThemeProvider>
            {children}
            <RekToaster />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
