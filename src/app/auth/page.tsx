"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { langPref } from "@/components/preference-boot";
import { SiteHeader } from "@/components/site-header";
import { authClient, ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/library";
  return value;
}

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<"signin" | "register">("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    setLang(langPref());
    ensureSession().then(async () => {
      const session = await authClient.getSession();
      if (session.data?.user && !(session.data.user as { isAnonymous?: boolean }).isAnonymous) {
        router.replace(next);
      }
    });
  }, [next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    if (mode === "register" && !terms) {
      setError(lang === "hy" ? "Ընդունեք պայմանները։" : "Accept the terms to continue.");
      setBusy(false);
      return;
    }
    if (form.password.length < 8) {
      setError(lang === "hy" ? "Գաղտնաբառը առնվազն 8 նիշ է։" : "Use at least 8 characters.");
      setBusy(false);
      return;
    }
    const result =
      mode === "register"
        ? await authClient.signUp.email({ email: form.email, password: form.password, name: form.name.trim() || "Detective" })
        : await authClient.signIn.email({ email: form.email, password: form.password });
    if (result.error) {
      setError(result.error.message ?? (lang === "hy" ? "Մուտքը չհաջողվեց։" : "Sign-in failed."));
      setBusy(false);
      return;
    }
    if (mode === "register") localStorage.setItem("cf-introduced", "1");
    router.replace(next);
  }

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main" className="page auth-page">
        <article className="paper auth-card">
          <p className="kicker">CASEFILE</p>
          <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: "1.8rem" }}>{mode === "register" ? t(lang, "createAccount") : t(lang, "signIn")}</h1>
          <p className="quiet">{lang === "hy" ? "Կարճ մուտք։ Telegram-ում արդեն ստուգված է։" : "Quick sign-in. Already verified in Telegram."}</p>
          <div className="actions" style={{ marginTop: "0.75rem" }}>
            <button className="btn" type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>{t(lang, "createAccount")}</button>
            <button className="btn" type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>{lang === "hy" ? "Մուտք" : "Sign in"}</button>
          </div>
          <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {mode === "register" ? (
              <label>{lang === "hy" ? "Ցուցադրման անուն" : "Display name"}
                <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={80} autoComplete="nickname" />
              </label>
            ) : null}
            <label>{t(lang, "email")}
              <input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" />
            </label>
            <label>{t(lang, "password")}
              <input className="field" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete={mode === "register" ? "new-password" : "current-password"} />
            </label>
            {mode === "register" ? (
              <label className="quiet" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
                <span>{lang === "hy" ? "Ընդունում եմ պայմանները և գաղտնիությունը։ Պահպանված գործերն ու նշումները պատկանում են հաշվին։" : "I accept the terms and privacy notice. Saved cases and notes belong to this account."}</span>
              </label>
            ) : null}
            {error ? <p role="alert">{error}</p> : null}
            <button className="btn solid" type="submit" disabled={busy}>{busy ? (lang === "hy" ? "…" : "…") : mode === "register" ? t(lang, "createAccount") : (lang === "hy" ? "Մուտք" : "Sign in")}</button>
          </form>
          <p className="quiet" style={{ marginTop: "1rem" }}>
            <Link href={next}>{lang === "hy" ? "Վերադառնալ" : "Back"}</Link>
          </p>
        </article>
      </main>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main id="main" className="page" />}>
      <AuthForm />
    </Suspense>
  );
}
