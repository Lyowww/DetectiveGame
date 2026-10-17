"use client";

import { useCallback, useState } from "react";

interface Report {
  verifiedAt: string;
  liveConfigured: boolean;
  freeOnly: boolean;
  primaryModel: string;
  fallbackModels: string[];
  catalog: { fetchedAt: string | null; source: string; error: string | null; eligibleCount: number; totalCount: number };
  eligible: {
    id: string;
    name: string;
    pricing: Record<string, string | undefined>;
    contextLength: number | null;
    modality: string | null;
    supportedParameters: string[];
    expirationDate: string | null;
    lastOutcome: string | null;
  }[];
  usage: { day: string; appRequests: number; appTokens: number; circuit: { open: boolean; lastError: string | null } };
  key: unknown;
}

export default function OpenRouterAdminPage() {
  const [token, setToken] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/openrouter${refresh ? "?refresh=1" : ""}`, {
      headers: { "x-casefile-admin": token },
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Unauthorized");
      setReport(null);
      return;
    }
    setReport(data);
  }, [token]);

  async function runTest() {
    setBusy(true);
    setTestResult("");
    const response = await fetch("/api/admin/openrouter", {
      method: "POST",
      headers: { "content-type": "application/json", "x-casefile-admin": token },
      body: JSON.stringify({ action: "test" }),
    });
    const data = await response.json();
    setBusy(false);
    setTestResult(JSON.stringify(data, null, 2));
  }

  return (
    <main id="main" className="page" style={{ maxWidth: 960 }}>
      <p className="kicker">Admin</p>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500 }}>OpenRouter diagnostics</h1>
      <p className="quiet">Restricted. Not part of normal player screens. Uses server-side catalog filtering with FREE_ONLY policy.</p>
      <label>
        Admin token
        <input className="field" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" />
      </label>
      <div className="actions">
        <button className="btn solid" type="button" disabled={busy || !token} onClick={() => void load(false)}>Load</button>
        <button className="btn" type="button" disabled={busy || !token} onClick={() => void load(true)}>Refresh catalog</button>
        <button className="btn" type="button" disabled={busy || !token} onClick={() => void runTest()}>Connection test</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {testResult ? <pre className="paper doc" style={{ whiteSpace: "pre-wrap" }}>{testResult}</pre> : null}
      {report ? (
        <section style={{ marginTop: "1.25rem", display: "grid", gap: "0.75rem" }}>
          <p>
            Verified {report.verifiedAt} · live={String(report.liveConfigured)} · freeOnly={String(report.freeOnly)} ·
            primary={report.primaryModel}
          </p>
          <p className="quiet">
            Catalog {report.catalog.source} at {report.catalog.fetchedAt ?? "—"} · eligible {report.catalog.eligibleCount}/
            {report.catalog.totalCount}
            {report.catalog.error ? ` · ${report.catalog.error}` : ""}
          </p>
          <p className="quiet">
            Usage {report.usage.day}: {report.usage.appRequests} requests / {report.usage.appTokens} tokens · circuit{" "}
            {report.usage.circuit.open ? "open" : "closed"}
            {report.usage.circuit.lastError ? ` · ${report.usage.circuit.lastError}` : ""}
          </p>
          <div className="case-grid">
            {report.eligible.map((model) => (
              <article key={model.id} className="note" style={{ margin: 0 }}>
                <strong>{model.id}</strong>
                <p className="quiet" style={{ margin: "0.25rem 0" }}>{model.name}</p>
                <p className="quiet" style={{ margin: 0 }}>
                  prompt={model.pricing.prompt ?? "?"} completion={model.pricing.completion ?? "?"} · ctx={model.contextLength ?? "?"} ·{" "}
                  {model.modality ?? "—"}
                </p>
                {model.expirationDate ? <p className="quiet">expires {model.expirationDate}</p> : null}
                <p className="quiet">params: {model.supportedParameters.slice(0, 8).join(", ") || "—"}</p>
                <p className="quiet">last: {model.lastOutcome ?? "—"}</p>
              </article>
            ))}
          </div>
          <details>
            <summary>Key / quota snapshot (provider-reported)</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(report.key, null, 2)}</pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
