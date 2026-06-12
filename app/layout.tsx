// Root Layout: Header, Footer, Font, Providers
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CustomCursor } from "@/src/components/CustomCursor";
import { Toaster } from "@/components/ui/sonner";
import { AppBootstrapper } from "@/src/components/AppBootstrapper";
import { QueryProvider } from "@/src/components/providers/QueryProvider";

export const dynamic = "force-dynamic";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// config-6 -  Base Metadata & OpenGraph
export const metadata: Metadata = {
  title: {
    default: "AeroTwin — Airport Digital Twin", // Trang chủ sẽ có title này
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
  return (
    <html
      lang="en"
      className={`h-full antialiased font-sans ${geist.variable}`}
    >
      <body className="h-full overflow-hidden">
        <CustomCursor />
        <Toaster />
        {/* 1. QueryProvider must wrap everything that uses React Query */}
        <QueryProvider>
          {/* 2. AppBootstrapper can now safely use useQuery! */}
          <AppBootstrapper>{children}</AppBootstrapper>
        </QueryProvider>
      </body>
    </html>
  );
}
