// components/layout/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
// import { ShoppingCart } from "lucide-react";

// Kỹ thuật Import Động (Dynamic Import) tắt SSR
// Tránh hoàn toàn lỗi Hydration và lỗi Cascading Renders của React
// const CartButtonDynamic = dynamic(() => import("../buttons/CartButton"), {
//   ssr: false,
//   // Hiển thị một icon giỏ hàng trống trong lúc chờ load dữ liệu từ localStorage
//   loading: () => (
//     <div className="relative p-2 text-muted-foreground">
//       <ShoppingCart className="w-5 h-5 opacity-50" />
//     </div>
//   ),
// });

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Trang chủ", href: "/" },
    { name: "Khóa học", href: "/courses" },
    { name: "Giới thiệu", href: "/about" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-tech-subheader font-bold text-primary">
          BoilerPlate
        </Link>

        {/* Dynamic Navigation Tabs */}
        <nav className="flex gap-6">
          {navLinks.map((link) => {
            // Kiểm tra xem URL hiện tại có khớp với Link không
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-body-inter font-medium transition-colors hover:text-primary",
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground",
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Giỏ hàng (Dynamic Sync qua Zustand) */}
        <div className="flex items-center gap-4">
          {/* Nút Giỏ hàng đã được xử lý chống lỗi */}
          {/* <CartButtonDynamic /> */}

          {/* Nút Đăng nhập */}
          <Link
            href="/login"
            className="bg-foreground text-background px-4 py-2 rounded-md text-normal font-semibold hover:bg-muted-foreground transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
