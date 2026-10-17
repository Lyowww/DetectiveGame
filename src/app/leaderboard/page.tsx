"use client";

import { useEffect, useState } from "react";
import { langPref } from "@/components/preference-boot";
import { SiteHeader } from "@/components/site-header";
import { authClient } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";

interface Row {
  name: string;
  score: number;
  grade: string;
  firstAttempt: boolean;
  caseVersion: string;
  labeledDemo: boolean;
  userId?: string;
}

interface CaseOption {
  id: string;
  version: string;
  title: string;
}

export default function LeaderboardPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [difficulty, setDifficulty] = useState("normal");
  const [period, setPeriod] = useState("all");
  const [firstOnly, setFirstOnly] = useState(true);
  const [caseId, setCaseId] = useState("tide-ledger");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState("");

  useEffect(() => {
    setLang(langPref());
    fetch(`/api/cases?lang=${langPref()}`)
      .then((response) => response.json())
      .then((data) => {
        const list = (data.cases ?? []) as CaseOption[];
        setCases(list);
        if (list[0]) setCaseId(list[0].id);
      });
    authClient.getSession().then((session) => {
      setMe(session.data?.user?.name ?? "");
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      difficulty,
      period,
      first: firstOnly ? "1" : "0",
      caseId,
    });
    fetch(`/api/leaderboard?${params}`)
      .then((response) => response.json())
      .then((data) => setRows(data.rows ?? []));
  }, [difficulty, period, firstOnly, caseId]);

  const selected = cases.find((item) => item.id === caseId);

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main" className="page">
        <p className="kicker">{selected ? `${selected.title} · ${selected.version}` : "CASEFILE"}</p>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500 }}>{t(lang, "leaderboard")}</h1>
        <div className="filter-row">
          <label>
            {t(lang, "library")}
            <select className="field" value={caseId} onChange={(event) => setCaseId(event.target.value)}>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          {["easy", "normal", "hard"].map((item) => (
            <button key={item} className="btn" type="button" aria-pressed={difficulty === item} onClick={() => setDifficulty(item)}>
              {t(lang, item as "easy")}
            </button>
          ))}
          {([["day", "day"], ["week", "week"], ["all", "allTime"]] as const).map(([value, key]) => (
            <button key={value} className="btn" type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>
              {t(lang, key)}
            </button>
          ))}
          <button className="btn" type="button" aria-pressed={firstOnly} onClick={() => setFirstOnly((value) => !value)}>
            {firstOnly ? t(lang, "firstAttempts") : t(lang, "allRuns")}
          </button>
        </div>
        {rows.length ? (
          <ol className="leaderboard-list">
            {rows.map((row, index) => (
              <li key={`${row.name}-${index}`} className={me && row.name === me ? "me" : undefined}>
                <span>{index + 1}</span>
                <span>
                  <strong>{row.name}</strong>
                  <span className="quiet" style={{ display: "block", fontSize: "0.85rem" }}>
                    {row.grade}{row.firstAttempt ? "" : " · replay"}{row.labeledDemo ? " · sample" : ""}
                  </span>
                </span>
                <strong>{row.score}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <section className="paper doc" style={{ marginTop: "1.25rem" }}>
            <h2>{t(lang, "emptyBoard")}</h2>
            <p>{lang === "hy" ? "Դատարկ ցանկը իրական վիճակ է։" : "An empty board is the real state — no invented players."}</p>
          </section>
        )}
      </main>
    </>
  );
}
