// Root Layout: Header, Footer, Font, Providers
import type { Metadata } from "next";
import { preconnect, prefetchDNS } from "react-dom";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppBootstrapper } from "@/src/components/AppBootstrapper";
import { QueryProvider } from "@/src/components/providers/QueryProvider";

export const dynamic = "force-dynamic";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// config-6 -  Base Metadata & OpenGraph
export const metadata: Metadata = {
  title: {
    default: "AeroTwin — Airport Digital Twin",
    template: "%s |  ", // Khi trang con cài title "Khóa React", nó sẽ ra "Khóa React | Boilerplate Next.js 13"
  },
  description: "Real-time 3D digital twin dashboard for airport operations.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Airport Digital Twin",
    images: [{ url: "/images/default-og-cover.jpg", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Warm up connections to the ArcGIS CDN (SDK assets/workers) and basemap tiles
  // before the lazily loaded map requests them.
  preconnect("https://js.arcgis.com", { crossOrigin: "anonymous" });
  preconnect("https://basemaps-api.arcgis.com", { crossOrigin: "anonymous" });
  prefetchDNS("https://static.arcgis.com");
  prefetchDNS("https://tiles.arcgis.com");
  prefetchDNS("https://wsrv.nl");

  return (
    <html
      lang="en"
      className={`h-full antialiased font-sans ${geist.variable}`}
    >
      <body className="h-full overflow-hidden">
        <Toaster position="bottom-right" />
        {/* 1. QueryProvider must wrap everything that uses React Query */}
        <QueryProvider>
          {/* 2. AppBootstrapper can now safely use useQuery! */}
          <AppBootstrapper>{children}</AppBootstrapper>
        </QueryProvider>
      </body>
    </html>
  );
}
