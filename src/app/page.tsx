"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { authClient, ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { langPref } from "@/components/preference-boot";

interface ListedRun {
  id: string;
  title: string;
  status: string;
  difficulty: string;
  caseId: string;
}

interface CaseCard {
  id: string;
  title: string;
  teaser: string;
  coverImage: string;
  genre: string;
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [runs, setRuns] = useState<ListedRun[]>([]);
  const [guest, setGuest] = useState(true);
  const [featured, setFeatured] = useState<CaseCard | null>(null);

  useEffect(() => {
    const chosen = langPref();
    setLang(chosen);
    document.documentElement.lang = chosen;
    ensureSession()
      .then(() =>
        Promise.all([
          fetch("/api/runs").then((response) => response.json()),
          fetch(`/api/cases?lang=${chosen}`).then((response) => response.json()),
          authClient.getSession(),
        ]),
      )
      .then(([runData, caseData, session]) => {
        setRuns(runData.runs ?? []);
        setFeatured((caseData.cases ?? [])[0] ?? null);
        setGuest(Boolean((session.data?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous ?? runData.guest));
      })
      .catch(() => setRuns([]));
  }, []);

  const active = runs.find((run) => run.status === "active");
  const openPath = featured
    ? guest
      ? `/auth?next=${encodeURIComponent(`/briefing/${featured.id}`)}`
      : `/briefing/${featured.id}`
    : "/library";

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main" className="hero">
        <div
          className="hero-bg"
          style={featured ? { backgroundImage: `url(${featured.coverImage})` } : undefined}
          aria-hidden="true"
        />
        <div className="hero-veil" aria-hidden="true" />
        <section className="hero-copy">
          <p className="kicker">{featured?.genre ?? "CASEFILE"}</p>
          <h1>CASEFILE</h1>
          <p className="lede">{t(lang, "homeLead")}</p>
          <p className="quiet">{t(lang, "homeBody")}</p>
          {featured ? <p className="quiet">{featured.title} — {featured.teaser}</p> : null}
          <div className="actions">
            {active ? (
              <Link className="btn solid" href={`/investigate/${active.id}`}>{t(lang, "continue")}</Link>
            ) : (
              <Link className="btn solid" href={openPath}>{t(lang, "start")}</Link>
            )}
            <Link className="btn ghost" href="/library">{t(lang, "library")}</Link>
            {guest ? <Link className="btn" href={`/auth?next=${encodeURIComponent(openPath)}`}>{t(lang, "signIn")}</Link> : null}
          </div>
        </section>
      </main>
    </>
  );
}
