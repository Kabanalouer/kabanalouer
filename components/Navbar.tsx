"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavSearchBar from "./NavSearchBar";
import type { User } from "@supabase/supabase-js";

type Profile = {
  name: string;
  role: string;
  avatar_url: string | null;
};

// ── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center shrink-0" aria-label="Kabanalouer — accueil">
      <Image
        src="/logo-wordmark.svg"
        alt="Kabanalouer"
        width={190}
        height={40}
        className="h-10 w-auto"
        priority
      />
    </Link>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
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
      className="rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

// ── Dropdown link ─────────────────────────────────────────────────────────────
function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 transition-colors"
    >
      {children}
    </Link>
  );
}

// ── Hamburger icon ────────────────────────────────────────────────────────────
function IconMenu({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// ── Unread dot ────────────────────────────────────────────────────────────────
function UnreadDot() {
  return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
}

// ── Main ──────────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    setVoyageurMode(localStorage.getItem("kbl_voyageur") === "1");
  }, []);

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

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("name, role, avatar_url")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const loadUnread = async (userId: string) => {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  };

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

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isHost = profile?.role === "host";
  const isHome = pathname === "/";

  // Shared nav wrapper classes
  const navWrap = "bg-white/95 backdrop-blur-md border-b border-[#ebebeb] sticky top-0 z-50";
  const navInner = "px-6 lg:px-8";

  // ── HOST NAVBAR ──────────────────────────────────────────────────────────────
  if (isHost && !voyageurMode && user && profile) {
    const tabCls = (pathPrefix: string, exact = false) => {
      const active = exact ? pathname === pathPrefix : pathname.startsWith(pathPrefix);
      return [
        "flex items-center gap-2 px-5 h-full text-[15px] font-semibold transition-colors border-b-2",
        active
          ? "border-charcoal-800 text-charcoal-800"
          : "border-transparent text-charcoal-400 hover:text-charcoal-700 hover:border-charcoal-200",
      ].join(" ");
    };

    return (
      <nav className={navWrap}>
        <div className={`${navInner} h-20 flex items-stretch`}>

          {/* Logo */}
          <div className="flex items-center mr-8 shrink-0">
            <Logo href="/dashboard" />
          </div>

          {/* Tabs */}
          <div className="flex-1 flex justify-center items-stretch">
            <Link href="/dashboard" className={tabCls("/dashboard", true)}>
              Tableau de bord
            </Link>
            <Link href="/dashboard/listings" className={tabCls("/dashboard/listings")}>
              Mes chalets
            </Link>
            <Link href="/messages" className={tabCls("/messages")}>
              Messages
              {unreadCount > 0 && <UnreadDot />}
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 ml-6">
            <button
              onClick={enterVoyageurMode}
              className="hidden sm:flex items-center gap-2 border border-[#dddddd] rounded-full py-2.5 px-5 text-[15px] font-medium text-charcoal-600 hover:shadow-sm hover:border-charcoal-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mode voyageur
            </button>

            {/* Avatar pill */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 border border-[#dddddd] rounded-full py-1 pl-3 pr-1 hover:shadow-md transition-all"
                aria-label="Menu utilisateur"
              >
                <IconMenu open={menuOpen} />
                <Avatar profile={profile} size={32} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#ebebeb] overflow-hidden z-50 py-1">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ebebeb]">
                    <Avatar profile={profile} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-charcoal-800 truncate">{profile.name}</p>
                      <p className="text-xs text-primary font-medium">Hôte</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/profile">Mon profil</DropdownLink>
                    <DropdownLink href="/dashboard/subscription">Abonnement</DropdownLink>
                    <DropdownLink href="/dashboard/listings/new">Créer une annonce</DropdownLink>
                    <button
                      onClick={enterVoyageurMode}
                      className="flex sm:hidden items-center gap-2 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 transition-colors w-full text-left"
                    >
                      Mode voyageur
                    </button>
                  </div>
                  <div className="border-t border-[#ebebeb] py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-charcoal-400 hover:bg-charcoal-50 transition-colors"
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

  // ── CONNECTED TRAVELER NAVBAR ─────────────────────────────────────────────────
  if (user && profile) {
    return (
      <nav className={navWrap}>
        <div className={`${navInner} h-20 flex items-center`}>

          {/* Left */}
          <div className="flex items-center flex-1">
            <Logo />
          </div>

          {/* Center */}
          {!isHome && <NavSearchBar />}

          {/* Right */}
          <div className="flex items-center justify-end gap-3 flex-1">

            {isHost && voyageurMode && (
              <button
                onClick={exitVoyageurMode}
                className="hidden sm:flex items-center gap-2 border border-primary text-primary rounded-full py-2.5 px-5 text-[15px] font-medium hover:bg-primary/5 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Mode hôte
              </button>
            )}

            {/* Avatar pill */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 border border-[#dddddd] rounded-full py-1 pl-3 pr-1 hover:shadow-md transition-all"
                aria-label="Menu utilisateur"
              >
                <IconMenu open={menuOpen} />
                <Avatar profile={profile} size={32} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#ebebeb] overflow-hidden z-50 py-1">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ebebeb]">
                    <Avatar profile={profile} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-charcoal-800 truncate">{profile.name}</p>
                      <p className="text-xs text-charcoal-400 font-medium">Voyageur</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/profile">Mon profil</DropdownLink>
                    <DropdownLink href="/favoris">Mes favoris</DropdownLink>
                    <Link
                      href="/messages"
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 transition-colors"
                    >
                      Messages
                      {unreadCount > 0 && <UnreadDot />}
                    </Link>
                    {isHost && voyageurMode && (
                      <button
                        onClick={exitVoyageurMode}
                        className="sm:hidden w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-charcoal-50 transition-colors"
                      >
                        Mode hôte
                      </button>
                    )}
                  </div>
                  <div className="border-t border-[#ebebeb] py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-charcoal-400 hover:bg-charcoal-50 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-charcoal-500 hover:text-charcoal-800 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu mobile"
            >
              <IconMenu open={mobileOpen} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#ebebeb] px-4 sm:px-6 py-4 flex flex-col gap-1 pb-5">
            <MobileLink href="/chalets">Parcourir les chalets</MobileLink>
            <MobileLink href="/devenir-hote">Devenir hôte</MobileLink>
            <div className="border-t border-[#ebebeb] pt-3 mt-2 flex flex-col gap-1">
              {isHost && voyageurMode && (
                <button onClick={exitVoyageurMode} className="text-left px-3 py-2 text-sm font-medium text-primary">
                  Mode hôte
                </button>
              )}
              <MobileLink href="/dashboard/profile">Mon profil</MobileLink>
              <MobileLink href="/favoris">Mes favoris</MobileLink>
              <Link href="/messages" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-charcoal-700 rounded-xl hover:bg-charcoal-50">
                Messages
                {unreadCount > 0 && <UnreadDot />}
              </Link>
              <button onClick={handleSignOut} className="text-left px-3 py-2 text-sm text-charcoal-400">
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </nav>
    );
  }

  // ── PUBLIC NAVBAR ─────────────────────────────────────────────────────────────
  return (
    <nav className={navWrap}>
      <div className={navInner}>
        <div className="flex items-center h-20">

          {/* Left */}
          <div className="flex items-center flex-1">
            <Logo />
          </div>

          {/* Center */}
          {!isHome && <NavSearchBar />}

          {/* Desktop right */}
          <div className="hidden md:flex items-center justify-end gap-2 flex-1">
            <Link
              href="/login"
              className="px-5 py-2.5 text-[15px] font-medium text-charcoal-700 hover:bg-charcoal-50 rounded-full transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-white text-[15px] px-6 py-3 rounded-full hover:bg-primary-dark transition-colors font-semibold"
            >
              Inscrire mon chalet
            </Link>
          </div>

          {/* Mobile right */}
          <div className="md:hidden flex items-center justify-end gap-1 flex-1">
            <button
              className="p-2 text-charcoal-500 hover:text-charcoal-800 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <IconMenu open={mobileOpen} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#ebebeb] py-4 flex flex-col gap-1 pb-5">
            <MobileLink href="/chalets">Parcourir les chalets</MobileLink>
            <MobileLink href="/comment-ca-marche">Comment ça marche</MobileLink>
            <MobileLink href="/devenir-hote">Devenir hôte</MobileLink>
            <div className="border-t border-[#ebebeb] pt-3 mt-2 flex flex-col gap-2">
              <MobileLink href="/login">Connexion</MobileLink>
              <Link
                href="/signup"
                className="bg-primary text-white text-center py-3 rounded-full font-semibold text-sm"
              >
                Inscrire mon chalet
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// ── Shared nav link helpers ───────────────────────────────────────────────────
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2.5 text-[15px] font-medium text-charcoal-700 hover:bg-charcoal-50 rounded-full transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-charcoal-700 rounded-xl hover:bg-charcoal-50 transition-colors"
    >
      {children}
    </Link>
  );
}
