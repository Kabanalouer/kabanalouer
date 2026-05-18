"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  name: string;
  role: string;
  avatar_url: string | null;
};

// ── Shared icon ──────────────────────────────────────────────────────────────
function CabinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L2 16h4v12h8v-8h4v8h8V16h4L16 4z" fill="currentColor" opacity="0.15" />
      <path d="M16 4L2 16h4v12h8v-8h4v8h8V16h4L16 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 28v-8h8v8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// ── Dropdown link helper ─────────────────────────────────────────────────────
function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {children}
    </Link>
  );
}

// ── Avatar circle ────────────────────────────────────────────────────────────
function Avatar({ profile, size = 32 }: { profile: Profile; size?: number }) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "?";
  if (profile.avatar_url) {
    return (
      <Image
        src={profile.avatar_url}
        alt={profile.name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Navbar() {
  const supabase = createClient();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [voyageurMode, setVoyageurMode] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load voyageur mode from localStorage (client-side only)
  useEffect(() => {
    setVoyageurMode(localStorage.getItem("kbl_voyageur") === "1");
  }, []);

  // Auto-exit voyageur mode when navigating to host pages
  useEffect(() => {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/messages")) {
      if (voyageurMode) {
        localStorage.removeItem("kbl_voyageur");
        document.cookie = "kbl_voyageur=; path=/; max-age=0";
        setVoyageurMode(false);
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const enterVoyageurMode = () => {
    localStorage.setItem("kbl_voyageur", "1");
    document.cookie = "kbl_voyageur=1; path=/; max-age=86400";
    window.location.href = "/";
  };

  const exitVoyageurMode = () => {
    localStorage.removeItem("kbl_voyageur");
    document.cookie = "kbl_voyageur=; path=/; max-age=0";
    window.location.href = "/dashboard/listings";
  };

  // Fetch profile
  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("name, role, avatar_url")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  // Fetch unread messages count
  const loadUnread = async (userId: string) => {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  };

  // Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        loadProfile(data.user.id);
        loadUnread(data.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { loadProfile(u.id); loadUnread(u.id); }
      else { setProfile(null); setUnreadCount(0); }
    });

    return () => listener.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: refresh unread count on any message change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`navbar-unread-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, () => loadUnread(user.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  // Close everything on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isHost = profile?.role === "host";

  // ── HOST NAVBAR ─────────────────────────────────────────────────────────────
  if (isHost && !voyageurMode && user && profile) {
    const tabCls = (pathPrefix: string, exact = false) => {
      const active = exact ? pathname === pathPrefix : pathname.startsWith(pathPrefix);
      return [
        "flex items-center gap-2 px-5 h-full text-sm font-semibold transition-colors border-b-2",
        active
          ? "border-gray-900 text-gray-900"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
      ].join(" ");
    };

    return (
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-stretch">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-6">
            <CabinIcon className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary hidden sm:block">Kabanalouer</span>
          </Link>

          {/* Central tabs */}
          <div className="flex-1 flex justify-center items-stretch">
            <Link href="/dashboard" className={tabCls("/dashboard", true)}>
              Tableau de bord
            </Link>
            <Link href="/dashboard/listings" className={tabCls("/dashboard/listings")}>
              Mes chalets
            </Link>
            <Link href="/messages" className={tabCls("/messages")}>
              Messages
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              )}
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-6">

            {/* Mode voyageur */}
            <button
              onClick={enterVoyageurMode}
              className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-full py-2 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mode voyageur
            </button>

            {/* Avatar + hamburger pill */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 border border-gray-200 rounded-full py-1 pl-3 pr-1 hover:shadow-md transition-all"
                aria-label="Menu"
              >
                <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <Avatar profile={profile} size={32} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Avatar profile={profile} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.name}</p>
                      <p className="text-xs text-primary font-medium">Hôte</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/profile">Mon profil</DropdownLink>
                    <DropdownLink href="/dashboard/subscription">Abonnement</DropdownLink>
                    <DropdownLink href="/dashboard/listings/new">Créer une annonce</DropdownLink>
                    <button
                      onClick={enterVoyageurMode}
                      className="flex sm:hidden items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                    >
                      Mode voyageur
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ── CONNECTED TRAVELER NAVBAR (traveler role OR host in voyageur mode) ───────
  if (user && profile) {
    return (
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <CabinIcon className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary hidden sm:block">Kabanalouer</span>
          </Link>

          {/* Center */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/chalets" className="text-gray-600 hover:text-primary transition-colors font-medium">
              Parcourir les chalets
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* Retourner en mode hôte — hôtes en mode voyageur seulement */}
            {isHost && voyageurMode && (
              <button
                onClick={exitVoyageurMode}
                className="hidden sm:flex items-center gap-2 border border-primary text-primary rounded-full py-2 px-4 text-sm font-medium hover:bg-primary-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Mode hôte
              </button>
            )}

            {/* Avatar + hamburger pill */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 border border-gray-200 rounded-full py-1 pl-3 pr-1 hover:shadow-md transition-all"
                aria-label="Menu"
              >
                <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <Avatar profile={profile} size={32} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Avatar profile={profile} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.name}</p>
                      <p className="text-xs text-gray-400 font-medium">Voyageur</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/profile">Mon profil</DropdownLink>
                    <Link
                      href="/messages"
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Messages
                      {unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      )}
                    </Link>
                    {isHost && voyageurMode && (
                      <button
                        onClick={exitVoyageurMode}
                        className="sm:hidden w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-gray-50 transition-colors"
                      >
                        Mode hôte
                      </button>
                    )}
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger (non-dropdown) */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu mobile"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 flex flex-col gap-3 pb-5 px-4 sm:px-6">
            <Link href="/chalets" className="text-gray-700 font-medium py-1">Parcourir les chalets</Link>
            <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-2">
              {isHost && voyageurMode && (
                <button onClick={exitVoyageurMode} className="text-left text-primary font-medium">
                  Mode hôte
                </button>
              )}
              <Link href="/dashboard/profile" className="text-gray-700 font-medium">Mon profil</Link>
              <Link href="/messages" className="text-gray-700 font-medium flex items-center gap-2">
                Messages
                {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
              </Link>
              <button onClick={handleSignOut} className="text-left text-gray-500">Déconnexion</button>
            </div>
          </div>
        )}
      </nav>
    );
  }

  // ── PUBLIC NAVBAR (non connecté) ─────────────────────────────────────────────
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <CabinIcon className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary">Kabanalouer</span>
          </Link>

          {/* Desktop center */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/chalets" className="text-gray-600 hover:text-primary transition-colors font-medium">
              Parcourir les chalets
            </Link>
            <Link href="/comment-ca-marche" className="text-gray-600 hover:text-primary transition-colors font-medium">
              Comment ça marche
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-gray-700 hover:text-primary font-medium text-sm transition-colors">
              Connexion
            </Link>
            <Link href="/signup" className="bg-primary text-white text-sm px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors font-semibold">
              Inscrire mon chalet
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 flex flex-col gap-3 pb-5">
            <Link href="/chalets" className="text-gray-700 font-medium py-1">Parcourir les chalets</Link>
            <Link href="/comment-ca-marche" className="text-gray-700 font-medium py-1">Comment ça marche</Link>
            <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-2">
              <Link href="/login" className="text-gray-700 font-medium">Connexion</Link>
              <Link href="/signup" className="bg-primary text-white text-center py-2.5 rounded-xl font-semibold">
                Inscrire mon chalet
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
