// Root Layout: Header, Footer, Font, Providers
import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layouts/Header";
import Footer from "@/components/layouts/Footer";
import NextTopLoader from "nextjs-toploader";
import { env } from "@/lib/env";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// config-6 -  Base Metadata & OpenGraph
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_URL),
  title: {
    default: "Boilerplate Next.js 13", // Trang chủ sẽ có title này
    template: "%s | Boilerplate Next.js 13", // Khi trang con cài title "Khóa React", nó sẽ ra "Khóa React | Boilerplate Next.js 13"
  },
  description:
    "Boilerplate Next.js 13 with TypeScript, Tailwind CSS, React Query, and more.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: env.NEXT_PUBLIC_URL,
    siteName: "Boilerplate Next.js 13",
    images: [{ url: "/images/default-og-cover.jpg", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="bg-background text-foreground font-sans min-h-screen flex flex-col">
        <NextTopLoader
          color="#BA0027"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        {/* Sẽ bọc ReactQueryProvider ở đây trong thực tế */}
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
