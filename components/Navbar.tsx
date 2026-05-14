"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <CabinIcon className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary">Kabanalouer</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/chalets"
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Parcourir les chalets
            </Link>
            <Link
              href="/comment-ca-marche"
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Comment ça marche
            </Link>
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-primary font-medium text-sm transition-colors"
                >
                  Mon espace
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary font-medium text-sm transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary text-white text-sm px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors font-semibold"
                >
                  Inscrire mon chalet
                </Link>
              </>
            )}
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
              {user ? (
                <>
                  <Link href="/dashboard" className="text-gray-700 font-medium">Mon espace</Link>
                  <button onClick={handleSignOut} className="text-left text-gray-500">Déconnexion</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 font-medium">Connexion</Link>
                  <Link
                    href="/signup"
                    className="bg-primary text-white text-center py-2.5 rounded-xl font-semibold"
                  >
                    Inscrire mon chalet
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function CabinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L2 16h4v12h8v-8h4v8h8V16h4L16 4z" fill="currentColor" opacity="0.15" />
      <path d="M16 4L2 16h4v12h8v-8h4v8h8V16h4L16 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 28v-8h8v8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
