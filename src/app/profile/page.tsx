"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { langPref } from "@/components/preference-boot";
import { SiteHeader } from "@/components/site-header";
import { authClient, ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { webApp } from "@/lib/telegram";

interface Filing { id: string; runId: string; score: number; grade: string; difficulty: string; firstAttempt: boolean; createdAt: string }
interface Badge { code: string; earnedAt: string }

export default function ProfilePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [guest, setGuest] = useState(true);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [telegram, setTelegram] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [linkPaste, setLinkPaste] = useState("");
  const [continueCode, setContinueCode] = useState("");

  async function refresh() {
    await ensureSession();
    const response = await fetch("/api/profile");
    const data = await response.json();
    setGuest(Boolean(data.user?.guest));
    setTelegram(Boolean(data.user?.telegram));
    setReferral(data.user?.referral ?? null);
    setFilings(data.filings ?? []);
    setBadges(data.achievements ?? []);
  }

  useEffect(() => {
    const chosen = langPref();
    setLang(chosen);
    refresh().catch((error: Error) => setMessage(error.message));
  }, []);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    const result = await authClient.signUp.email({ email: form.email, password: form.password, name: form.name });
    if (result.error) setMessage(result.error.message ?? "Could not create the account.");
    else {
      setMessage(lang === "hy" ? "Հաշիվը կապվեց այս գործերի հետ։" : "The account now holds this browser's files.");
      await refresh();
    }
  }

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main" className="page">
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500 }}>{t(lang, "profile")}</h1>
        {guest ? (
          <section className="paper doc">
            <h2>{t(lang, "guest")}</h2>
            <p>{t(lang, "guestBody")}</p>
            <form onSubmit={createAccount}>
              <label>{t(lang, "name")}<input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label>{t(lang, "email")}<input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
              <label>{t(lang, "password")}<input className="field" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
              <button className="btn solid" type="submit">{t(lang, "createAccount")}</button>
            </form>
          </section>
        ) : <p>{lang === "hy" ? "Հաշիվը կապված է։" : "This session is an account."}</p>}
        {telegram ? (
          <section className="paper doc">
            <h2>{lang === "hy" ? "Telegram" : "Telegram"}</h2>
            <p>{lang === "hy" ? "Հանրային անունը վերցվում է կարգավորումներից, ոչ թե Telegram-ի անունից։" : "The public name comes from your settings, not from a Telegram username."}</p>
            {referral ? <p>{lang === "hy" ? "Հրավերի կոդ" : "Invitation code"}: {referral}</p> : null}
            <form onSubmit={(event) => {
              event.preventDefault();
              const initData = webApp()?.initData;
              if (!initData) { setMessage(lang === "hy" ? "Կապը ավարտվում է Telegram-ի ներսում։" : "Finish the link inside Telegram."); return; }
              fetch("/api/telegram/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData, linkCode: linkPaste }) })
                .then(async (response) => { const data = await response.json(); setMessage(data.error ?? (lang === "hy" ? "Հաշիվները կապված են։" : "The accounts are linked.")); if (response.ok) await refresh(); });
            }}>
              <input className="field" value={linkPaste} onChange={(event) => setLinkPaste(event.target.value)} placeholder={lang === "hy" ? "Դիտարկիչի կոդ" : "Browser link code"} aria-label={lang === "hy" ? "Կապի կոդ" : "Link code"} />
              <button className="btn" type="submit">{lang === "hy" ? "Կապել" : "Link"}</button>
            </form>
            <form onSubmit={(event) => { event.preventDefault(); fetch("/api/telegram/link", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }).then(async (response) => { const data = await response.json(); setMessage(data.error ?? (lang === "hy" ? "Էլ. փոստը կապված է։" : "Email is linked.")); if (response.ok) await refresh(); }); }}>
              <label>{t(lang, "email")}<input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
              <label>{t(lang, "password")}<input className="field" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
              <button className="btn" type="submit">{lang === "hy" ? "Կապել էլ. փոստ" : "Link email"}</button>
            </form>
          </section>
        ) : null}
        <section className="paper doc">
          <h2>{lang === "hy" ? "Կապել Telegram-ը" : "Link Telegram"}</h2>
          <button className="btn" type="button" onClick={() => fetch("/api/telegram/link", { method: "POST" }).then((response) => response.json()).then((data) => setLinkCode(data.code ?? ""))}>{lang === "hy" ? "Ստեղծել կոդ" : "Create a link code"}</button>
          {linkCode ? <p>{linkCode}</p> : null}
          <h2>{lang === "hy" ? "Շարունակել դիտարկիչում" : "Continue in a browser"}</h2>
          <form onSubmit={(event) => { event.preventDefault(); fetch("/api/telegram/continue", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: continueCode }) }).then(async (response) => { const data = await response.json(); setMessage(data.error ?? (lang === "hy" ? "Գործերը բացվեցին։" : "The files are open here.")); if (response.ok) await refresh(); }); }}>
            <input className="field" value={continueCode} onChange={(event) => setContinueCode(event.target.value)} placeholder={lang === "hy" ? "Կոդ" : "Code"} aria-label={lang === "hy" ? "Շարունակման կոդ" : "Continuation code"} />
            <button className="btn" type="submit">{lang === "hy" ? "Բացել" : "Open"}</button>
          </form>
        </section>
        <button className="btn danger" type="button" onClick={() => {
          if (!window.confirm(lang === "hy" ? "Հաշիվը, նշումները և հրապարակային միավորները կջնջվեն։" : "This deletes the account, notes, and public ranking rows.")) return;
          fetch("/api/profile", { method: "DELETE" }).then(() => window.location.assign("/"));
        }}>{lang === "hy" ? "Ջնջել հաշիվը" : "Delete account"}</button>
        {message ? <p role="status">{message}</p> : null}
        <h2>{t(lang, "achievements")}</h2>
        {badges.length ? <ul>{badges.map((badge) => <li key={badge.code}>{badge.code}</li>)}</ul> : <p className="quiet">{t(lang, "noAchievements")}</p>}
        <h2>{lang === "hy" ? "Հանձնված գործեր" : "Filed cases"}</h2>
        <ul>
          {filings.map((item) => (
            <li key={item.id}><Link href={`/investigate/${item.runId}`}>{item.difficulty}</Link> · {item.grade} · {item.score} {item.firstAttempt ? "" : "· replay"}</li>
          ))}
        </ul>
      </main>
    </>
  );
}
