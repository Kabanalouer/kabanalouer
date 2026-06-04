"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function DashboardBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const supabase = createClient();

  const [unreadCount, setUnreadCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    const loadCounts = async (uid: string) => {
      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", uid)
        .eq("is_read", false);
      setUnreadCount(unread ?? 0);

      const { data: listings } = await supabase
        .from("listings")
        .select("id")
        .eq("host_id", uid);
      if (listings && listings.length > 0) {
        const { count: unanswered } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listings.map((l) => l.id))
          .is("host_reply", null);
        setUnansweredCount(unanswered ?? 0);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        userId = data.user.id;
        loadCounts(userId);
      }
    });

    const channel = supabase
      .channel("dashboard-bottom-nav-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        if (userId) loadCounts(userId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const active = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const cls = (path: string, exact = false) =>
    [
      "flex flex-col items-center gap-0.5 flex-1 pt-2 pb-1 text-[10px] font-medium transition-colors",
      active(path, exact) ? "text-primary" : "text-charcoal-400",
    ].join(" ");

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="absolute -top-1 -right-2 bg-[#f04e45] text-white text-[9px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center leading-none">
        {count > 9 ? "9+" : count}
      </span>
    ) : null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#ebebeb] flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Tableau de bord */}
      <Link href="/dashboard" className={cls("/dashboard", true)}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        {t("dashboard")}
      </Link>

      {/* Mes chalets */}
      <Link href="/dashboard/listings" className={cls("/dashboard/listings")}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        {t("myListings")}
      </Link>

      {/* Messages */}
      <Link href="/messages" className={cls("/messages")}>
        <div className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <Badge count={unreadCount} />
        </div>
        {t("messages")}
      </Link>

      {/* Mes avis */}
      <Link href="/dashboard/avis" className={cls("/dashboard/avis")}>
        <div className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.499z" />
          </svg>
          <Badge count={unansweredCount} />
        </div>
        {t("myReviews")}
      </Link>
    </nav>
  );
}
