"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Vue d'ensemble", href: "/admin", exact: true },
  { label: "Annonces", href: "/admin/listings" },
  { label: "Propriétaires", href: "/admin/hosts" },
  { label: "Voyageurs", href: "/admin/travelers" },
  { label: "Abonnements", href: "/admin/subscriptions" },
  { label: "Vedettes", href: "/admin/featured" },
  { label: "Messages de contact", href: "/admin/messages" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[#ebebeb] bg-white min-h-screen sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#ebebeb]">
        <Link href="/admin">
          <object
            type="image/svg+xml"
            data="/logo-wordmark.svg"
            aria-hidden="true"
            className="pointer-events-none"
            style={{ height: 32, width: "auto" }}
          />
        </Link>
        <p className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-widest mt-2">Administration</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#f5f6ec] text-primary font-semibold"
                  : "text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#ebebeb]">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour au site
        </Link>
      </div>
    </aside>
  );
}
