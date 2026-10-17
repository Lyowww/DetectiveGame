"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { langPref } from "@/components/preference-boot";
import { SiteHeader } from "@/components/site-header";
import { authClient, ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";

interface CaseCard {
  id: string;
  version: string;
  title: string;
  genre: string;
  duration: string;
  durationMinutes: { min: number; max: number };
  teaser: string;
  coverImage: string;
  status: string;
}
interface ListedRun { id: string; caseId: string; status: string; difficulty: string; title: string }

export default function LibraryPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [cases, setCases] = useState<CaseCard[]>([]);
  const [runs, setRuns] = useState<ListedRun[]>([]);
  const [guest, setGuest] = useState(true);
  const [genre, setGenre] = useState("all");
  const [length, setLength] = useState("all");

  useEffect(() => {
    const chosen = langPref();
    setLang(chosen);
    ensureSession()
      .then(() =>
        Promise.all([
          fetch(`/api/cases?lang=${chosen}`).then((response) => response.json()),
          fetch("/api/runs").then((response) => response.json()),
          authClient.getSession(),
        ]),
      )
      .then(([caseData, runData, session]) => {
        setCases(caseData.cases ?? []);
        setRuns(runData.runs ?? []);
        setGuest(Boolean((session.data?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous ?? runData.guest));
      });
  }, []);

  const active = runs.find((run) => run.status === "active");
  const genres = useMemo(() => ["all", ...new Set(cases.map((item) => item.genre))], [cases]);
  const filtered = cases.filter((item) => {
    if (genre !== "all" && item.genre !== genre) return false;
    const mid = ((item.durationMinutes?.min ?? 20) + (item.durationMinutes?.max ?? 35)) / 2;
    if (length === "quick" && mid > 18) return false;
    if (length === "standard" && (mid <= 18 || mid > 35)) return false;
    if (length === "long" && mid <= 35) return false;
    return true;
  });

  function hrefFor(item: CaseCard) {
    const path = `/briefing/${item.id}`;
    return guest ? `/auth?next=${encodeURIComponent(path)}` : path;
  }

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main" className="library">
        <p className="kicker">{t(lang, "library")}</p>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: "clamp(2rem, 5vw, 3rem)", margin: "0.2rem 0 0.8rem" }}>
          {t(lang, "library")}
        </h1>
        {active ? (
          <p className="actions" style={{ marginTop: 0 }}>
            <Link className="btn solid" href={`/investigate/${active.id}`}>{t(lang, "continue")}</Link>
          </p>
        ) : null}
        {guest ? (
          <p className="quiet">
            <Link href="/auth?next=%2Flibrary">{t(lang, "signIn")}</Link>
            {lang === "hy" ? "՝ գործ բացելու համար։" : " to open a case."}
          </p>
        ) : null}
        <div className="filter-row" role="group" aria-label={lang === "hy" ? "Զտիչներ" : "Filters"}>
          <label>
            {lang === "hy" ? "Ժանր" : "Genre"}
            <select className="field" value={genre} onChange={(event) => setGenre(event.target.value)}>
              {genres.map((item) => (
                <option key={item} value={item}>{item === "all" ? t(lang, "filterAll") : item}</option>
              ))}
            </select>
          </label>
          <label>
            {t(lang, "duration")}
            <select className="field" value={length} onChange={(event) => setLength(event.target.value)}>
              <option value="all">{t(lang, "filterAll")}</option>
              <option value="quick">{lang === "hy" ? "Արագ" : "Quick"}</option>
              <option value="standard">{lang === "hy" ? "Ստանդարտ" : "Standard"}</option>
              <option value="long">{lang === "hy" ? "Երկար" : "Long"}</option>
            </select>
          </label>
        </div>
        <div className="case-grid">
          {filtered.map((item) => {
            const done = runs.some((run) => run.caseId === item.id && run.status === "completed");
            const open = runs.find((run) => run.caseId === item.id && run.status === "active");
            const state = done
              ? (lang === "hy" ? "Ավարտված" : "Completed")
              : open
                ? (lang === "hy" ? "Ընթացքում" : "In progress")
                : (lang === "hy" ? "Նոր" : "New");
            return (
              <Link key={item.id} href={hrefFor(item)} className="case-card">
                <div className="case-cover" style={{ backgroundImage: `url(${item.coverImage})` }} role="img" aria-label={item.title} />
                <div className="case-card-body">
                  <p className="kicker">{item.genre}</p>
                  <h2>{item.title}</h2>
                  <p className="quiet" style={{ margin: 0 }}>{item.teaser}</p>
                  <div className="meta">
                    <span className="chip">{item.duration}</span>
                    <span className={`chip ${open ? "amber" : ""}`}>{state}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
