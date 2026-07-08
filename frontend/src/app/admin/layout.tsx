"use client";

import { usePathname } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // /admin/login 页面不包裹 AdminLayout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
