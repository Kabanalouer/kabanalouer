"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/listings",
    label: "Mes chalets",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/subscription",
    label: "Abonnement",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export default function DashboardSidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="w-60 bg-white border-r border-[#ebebeb] flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#ebebeb]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">Kabanalouer</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-800"
              }`}
            >
              <span className={isActive ? "text-primary" : "text-charcoal-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}

        <div className="pt-3 border-t border-[#ebebeb] mt-3">
          <Link
            href="/dashboard/listings/new"
            className="flex items-center justify-center gap-2 w-full bg-primary text-white py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau chalet
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[#ebebeb]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-sm">
              {(userName[0] ?? "?").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-charcoal-800 truncate">{userName}</div>
            <div className="text-xs text-charcoal-400 capitalize">{userRole === "host" ? "Proprio" : "Voyageur"}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors"
        >
          Déconnexion →
        </button>
      </div>
    </aside>
  );
}
