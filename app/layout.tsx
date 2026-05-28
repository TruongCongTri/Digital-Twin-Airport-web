// Root Layout: Header, Footer, Font, Providers
import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { CustomCursor } from "@/src/components/CustomCursor";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// config-6 -  Base Metadata & OpenGraph
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_URL),
  title: {
    default: "AeroTwin — Airport Digital Twin", // Trang chủ sẽ có title này
    template: "%s |  ", // Khi trang con cài title "Khóa React", nó sẽ ra "Khóa React | Boilerplate Next.js 13"
  },
  description: "Real-time 3D digital twin dashboard for airport operations.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: env.NEXT_PUBLIC_URL,
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
      className={cn("h-full", "antialiased", "font-sans", geist.variable)}
    >
      <body className="h-full overflow-hidden">
        <CustomCursor />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
