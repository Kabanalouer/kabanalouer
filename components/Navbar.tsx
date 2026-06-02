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
      {/* <object> loads the SVG as its own document so relative hrefs inside resolve correctly */}
      <object
        type="image/svg+xml"
        data="/logo-wordmark.svg"
        aria-hidden="true"
        className="h-[50px] w-auto pointer-events-none"
        style={{ width: 238, height: 50 }}
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
  const [unansweredReviewsCount, setUnansweredReviewsCount] = useState(0);
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

  const loadUnansweredReviews = async (userId: string) => {
    const { data: listings } = await supabase
      .from("listings")
      .select("id")
      .eq("host_id", userId);
    if (!listings || listings.length === 0) { setUnansweredReviewsCount(0); return; }
    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("listing_id", listings.map((l) => l.id))
      .is("host_reply", null);
    setUnansweredReviewsCount(count ?? 0);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        loadProfile(data.user.id);
        loadUnread(data.user.id);
        loadUnansweredReviews(data.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { loadProfile(u.id); loadUnread(u.id); loadUnansweredReviews(u.id); }
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

  const isHost = profile?.role === "host" || profile?.role === "admin";
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

          {/* Tabs — desktop only */}
          <div className="hidden md:flex flex-1 justify-center items-stretch">
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
            <Link href="/dashboard/avis" className={tabCls("/dashboard/avis")}>
              Mes avis
              {unansweredReviewsCount > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center leading-none">
                  {unansweredReviewsCount > 9 ? "9+" : unansweredReviewsCount}
                </span>
              )}
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={enterVoyageurMode}
              className="hidden sm:flex items-center border border-[#dddddd] rounded-full py-2.5 px-5 text-[15px] font-medium text-charcoal-600 hover:shadow-sm hover:border-charcoal-300 transition-all"
            >
              Mode voyageur
            </button>

            {/* Avatar pill — hamburger visible desktop seulement */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 border border-[#dddddd] rounded-full py-1 pl-1 md:pl-3 pr-1 hover:shadow-md transition-all"
                aria-label="Menu utilisateur"
              >
                <span className="hidden md:inline-flex"><IconMenu open={menuOpen} /></span>
                <Avatar profile={profile} size={32} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#ebebeb] overflow-hidden z-50 py-1">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ebebeb]">
                    <Avatar profile={profile} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-charcoal-800 truncate">{profile.name}</p>
                      <p className="text-xs text-primary font-medium">Proprio</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/profile">Mon profil</DropdownLink>
                    <DropdownLink href="/dashboard/subscription">Abonnement</DropdownLink>
                    <DropdownLink href="/dashboard/listings/new">Créer une annonce</DropdownLink>
                    <button
                      onClick={enterVoyageurMode}
                      className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-charcoal-50 transition-colors"
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
                className="hidden sm:flex items-center border border-primary text-primary rounded-full py-2.5 px-5 text-[15px] font-medium hover:bg-primary/5 transition-all"
              >
                Mode proprio
              </button>
            )}

            {/* Avatar — hamburger visible desktop seulement, avatar seul sur mobile */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 border border-[#dddddd] rounded-full py-1 pl-1 md:pl-3 pr-1 hover:shadow-md transition-all"
                aria-label="Menu utilisateur"
              >
                <span className="hidden md:inline-flex"><IconMenu open={menuOpen} /></span>
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
                    <DropdownLink href="/devenir-hote">Inscrire mon chalet</DropdownLink>
                    {isHost && voyageurMode && (
                      <button
                        onClick={exitVoyageurMode}
                        className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-charcoal-50 transition-colors"
                      >
                        Mode proprio
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
          </div>
        </div>
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
              href="/devenir-hote"
              className="px-5 py-2.5 text-[15px] font-medium text-charcoal-700 bg-white border border-[#ebebeb] hover:border-charcoal-200 rounded-full transition-colors"
            >
              Inscrire mon chalet
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-white text-[15px] px-6 py-3 rounded-full hover:bg-primary-dark transition-colors font-semibold"
            >
              Créer un compte
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

        {/* Mobile menu — 2 CTAs uniquement */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#ebebeb] px-4 py-4 flex flex-col gap-3 pb-5">
            <Link
              href="/devenir-hote"
              className="text-sm font-medium text-charcoal-700 px-3 py-2 rounded-xl hover:bg-charcoal-50 transition-colors"
            >
              Inscrire mon chalet
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-white text-center py-3 rounded-full font-semibold text-sm"
            >
              Créer un compte
            </Link>
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
