"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Vue d'ensemble", href: "/admin", exact: true },
  { label: "Annonces", href: "/admin/listings" },
  { label: "Propriétaires", href: "/admin/hosts" },
  { label: "Voyageurs", href: "/admin/travelers" },
  { label: "Abonnements", href: "/admin/subscriptions" },
  { label: "Boosts", href: "/admin/featured" },
  { label: "Messages de contact", href: "/admin/messages" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setDrawerOpen(false);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  const navLinks = (onClick?: () => void) =>
    NAV_ITEMS.map((item) => {
      const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive
              ? "bg-[#f5f6ec] text-primary font-semibold"
              : "text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-800"
          }`}
        >
          {item.label}
        </Link>
      );
    });

  const backLink = (onClick?: () => void) => (
    <Link
      href="/"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Retour au site
    </Link>
  );

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-[#ebebeb] bg-white min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-[#ebebeb]">
          <Link href="/admin">
            <img
              src="/logo-wordmark.svg"
              alt="Kabanalouer"
              className="pointer-events-none"
              style={{ height: 32, width: "auto" }}
            />
          </Link>
          <p className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-widest mt-2">Administration</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">{navLinks()}</nav>
        <div className="px-3 py-4 border-t border-[#ebebeb]">{backLink()}</div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#ebebeb] flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
          className="p-1.5 rounded-lg text-charcoal-600 hover:bg-charcoal-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-charcoal-800">Administration</span>
      </div>

      {/* ── Mobile drawer overlay ───────────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-50 w-64 bg-white flex flex-col h-full shadow-xl">
            <div className="px-5 py-5 border-b border-[#ebebeb] flex items-center justify-between">
              <div>
                <img
                  src="/logo-wordmark.svg"
                  alt="Kabanalouer"
                  className="pointer-events-none"
                  style={{ height: 28, width: "auto" }}
                />
                <p className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-widest mt-1.5">Administration</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-charcoal-400 hover:bg-charcoal-50 transition-colors"
                aria-label="Fermer le menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navLinks(() => setDrawerOpen(false))}
            </nav>
            <div className="px-3 py-4 border-t border-[#ebebeb]">
              {backLink(() => setDrawerOpen(false))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
