"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";

export function SiteHeader({ lang }: { lang: Lang }) {
  const path = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    authClient.getSession().then((session) => {
      const user = session.data?.user as { isAnonymous?: boolean } | undefined;
      setSignedIn(Boolean(user && !user.isAnonymous));
    });
  }, [path]);

  const item = (href: string, label: string) => (
    <Link href={href} className="btn ghost" aria-current={path === href ? "page" : undefined}>{label}</Link>
  );

  return (
    <header className="site-header">
      <Link href="/" className="brand">CASEFILE</Link>
      <nav className="nav-row" aria-label="Primary">
        {item("/library", t(lang, "library"))}
        {item("/leaderboard", t(lang, "leaderboard"))}
        {signedIn ? item("/profile", t(lang, "profile")) : item("/auth", t(lang, "signIn"))}
        {item("/settings", t(lang, "settings"))}
      </nav>
    </header>
  );
}
