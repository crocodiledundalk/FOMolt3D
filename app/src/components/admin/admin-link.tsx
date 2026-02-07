"use client";

import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";
import { PAGE_ROUTES } from "@/lib/constants/routes";

/**
 * Conditional admin link — only renders when the connected wallet is the program admin.
 * Designed to be dropped into the dashboard header nav.
 */
export function AdminLink() {
  const { isAdmin } = useAdmin();

  if (!isAdmin) return null;

  return (
    <Link
      href={PAGE_ROUTES.ADMIN}
      className="text-xs font-medium uppercase tracking-widest text-claw-orange hover:text-claw-orange/80 transition-colors"
    >
      Admin
    </Link>
  );
}
