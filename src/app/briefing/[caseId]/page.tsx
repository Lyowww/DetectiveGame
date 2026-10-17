"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crosshair, Lightbulb, Target, iconProps } from "@/components/ui/icons";
import { langPref } from "@/components/preference-boot";
import { SiteHeader } from "@/components/site-header";
import { authClient, ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import type { Difficulty } from "@/lib/types";

interface CaseCard {
  id: string;
  title: string;
  teaser: string;
  briefing: string;
  firstLead?: string;
  objective?: string;
  duration: string;
  genre: string;
  coverImage: string;
}

export default function BriefingPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [file, setFile] = useState<CaseCard | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [daily, setDaily] = useState(false);

  useEffect(() => {
    const chosen = langPref();
    setLang(chosen);
    setDaily(new URLSearchParams(window.location.search).get("challenge") === "daily");
    ensureSession().then(async () => {
      const session = await authClient.getSession();
      const guest = Boolean((session.data?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous);
      if (guest) {
        router.replace(`/auth?next=${encodeURIComponent(`/briefing/${params.caseId}${window.location.search}`)}`);
        return;
      }
      const [cases, status] = await Promise.all([
        fetch(`/api/cases?lang=${chosen}`).then((response) => response.json()),
        fetch("/api/status").then((response) => response.json()),
      ]);
      setFile((cases.cases ?? []).find((item: CaseCard) => item.id === params.caseId) ?? null);
      setAi(Boolean(status.ai));
    });
  }, [params.caseId, router]);

  async function start() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caseId: params.caseId,
        language: lang,
        difficulty,
        mode: ai && mode === "live" ? "live" : "demo",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? t(lang, "errorGeneric"));
      setBusy(false);
      if (response.status === 403) router.push(`/auth?next=${encodeURIComponent(`/briefing/${params.caseId}`)}`);
      return;
    }
    localStorage.setItem(`cf-tutorial:${data.run.id}`, "interview");
    router.push(`/investigate/${data.run.id}`);
  }

  const premise = file?.teaser || file?.briefing?.split(/(?<=\.)\s+/).slice(0, 2).join(" ") || "";
  const objective = file?.objective || (lang === "hy" ? "Գտեք անհետ կորածին։" : "Find the missing person.");
  const firstLead = file?.firstLead || (lang === "hy" ? "Խոսեք առաջին վկայի հետ։" : "Speak to the first witness.");

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main">
        <article className="mission">
          {file?.coverImage ? (
            <div className="mission-cover" style={{ backgroundImage: `url(${file.coverImage})` }} role="img" aria-label={file.title} />
          ) : null}
          <div className="mission-body">
            <p className="kicker">{t(lang, "mission")}</p>
            <h1>{file?.title ?? "CASEFILE"}</h1>
            <p className="mission-premise">{premise}</p>
            <div className="mission-row">
              <Target {...iconProps} />
              <div>
                <span className="kicker">{t(lang, "main")}</span>
                <strong style={{ display: "block" }}>{objective}</strong>
              </div>
            </div>
            <div className="mission-row">
              <Lightbulb {...iconProps} />
              <div>
                <span className="kicker">{t(lang, "firstLeadLabel")}</span>
                <strong style={{ display: "block" }}>{firstLead}</strong>
              </div>
            </div>
            <div className="meta">
              <span className="chip">{file?.genre}</span>
              <span className="chip">{t(lang, "duration")}: {file?.duration}</span>
              <span className="chip">{t(lang, "difficulty")}: {t(lang, difficulty)}</span>
            </div>
            {daily ? <p className="quiet">{lang === "hy" ? "Օրվա ընդհանուր տախտակ։" : "Shared daily board."}</p> : null}
            <h2 style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", margin: "0.5rem 0 0" }}>
              {t(lang, "difficulty")}
            </h2>
            <div className="choice-grid">
              {(["easy", "normal", "hard"] as const).map((level) => (
                <button key={level} className="choice" type="button" aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}>
                  <strong>{t(lang, level)}</strong>
                  <small>
                    {level === "easy" && (lang === "hy" ? "Ավելի մոտ գտածոներ։" : "Closer finds.")}
                    {level === "normal" && (lang === "hy" ? "Մի քանի հավանական պատմություն։" : "Several accounts.")}
                    {level === "hard" && (lang === "hy" ? "Ժամանակը շարժվում է։" : "Time moves with you.")}
                  </small>
                </button>
              ))}
            </div>
            {ai ? (
              <label>
                {t(lang, "mode")}
                <select className="field" value={mode} onChange={(event) => setMode(event.target.value as "demo" | "live")}>
                  <option value="demo">{t(lang, "demo")}</option>
                  <option value="live">{t(lang, "live")}</option>
                </select>
              </label>
            ) : null}
            {error ? <p role="alert">{error}</p> : null}
            <button className="btn solid" type="button" disabled={busy || !file} onClick={() => void start()} style={{ width: "100%" }}>
              <Crosshair {...iconProps} />
              {busy ? "…" : t(lang, "start")}
            </button>
          </div>
        </article>
      </main>
    </>
  );
}
