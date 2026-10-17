"use client";

import { useEffect, useState } from "react";
import { langPref } from "@/components/preference-boot";
import { SiteHeader } from "@/components/site-header";
import { ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";

export default function SettingsPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [status, setStatus] = useState<{ ai: boolean; speech: boolean; tts: boolean; database: string } | null>(null);
  const [telegram, setTelegram] = useState<{ configured: boolean; username: string; appUrl: string } | null>(null);
  const [notify, setNotify] = useState<boolean | null>(null);

  useEffect(() => {
    setLang(langPref());
    void ensureSession()
      .then(() => fetch("/api/status"))
      .then((response) => response?.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    void fetch("/api/telegram/config")
      .then((response) => response.json())
      .then((data) => setTelegram({ configured: Boolean(data.configured), username: data.username ?? "", appUrl: data.appUrl ?? "" }))
      .catch(() => setTelegram(null));
    void fetch("/api/profile").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      if (data.user?.telegram) setNotify(Boolean(data.user.notify));
    });
  }, []);

  function apply(key: string, value: string, attr?: string) {
    localStorage.setItem(key, value);
    if (attr === "lang") {
      document.documentElement.lang = value;
      setLang(value as Lang);
    }
    if (attr === "text") document.documentElement.dataset.text = value;
    if (attr === "contrast") document.documentElement.dataset.contrast = value;
    if (attr === "motion") {
      if (value === "reduce") document.documentElement.dataset.motion = "reduce";
      else delete document.documentElement.dataset.motion;
    }
    void fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        key === "cf-lang" ? { locale: value }
          : key === "cf-text" ? { textSize: value }
            : key === "cf-contrast" ? { contrast: value }
              : key === "cf-motion" ? { reducedMotion: value === "reduce" }
                : key === "cf-autoplay" ? { autoplayVoice: value === "on" }
                  : { leaderboard: value },
      ),
    });
  }

  return (
    <>
      <SiteHeader lang={lang} />
      <main id="main" className="page">
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500 }}>{t(lang, "settings")}</h1>
        <label>{t(lang, "language")}
          <select className="field" defaultValue={lang} onChange={(event) => apply("cf-lang", event.target.value, "lang")}>
            <option value="en">{t(lang, "english")}</option>
            <option value="hy">{t(lang, "armenian")}</option>
          </select>
        </label>
        <label>{t(lang, "textSize")}
          <select className="field" defaultValue="md" onChange={(event) => apply("cf-text", event.target.value, "text")}>
            <option value="sm">A</option><option value="md">A+</option><option value="lg">A++</option>
          </select>
        </label>
        <label>{t(lang, "highContrast")}
          <select className="field" defaultValue="ink" onChange={(event) => apply("cf-contrast", event.target.value, "contrast")}>
            <option value="ink">Ink</option><option value="high">High</option>
          </select>
        </label>
        <label>{t(lang, "motion")}
          <select className="field" defaultValue="system" onChange={(event) => apply("cf-motion", event.target.value, "motion")}>
            <option value="system">{lang === "hy" ? "Համակարգ" : "System"}</option>
            <option value="reduce">{lang === "hy" ? "Պակաս" : "Reduced"}</option>
          </select>
        </label>
        <label>{t(lang, "autoplay")}
          <select className="field" defaultValue="off" onChange={(event) => apply("cf-autoplay", event.target.value)}>
            <option value="off">{lang === "hy" ? "Անջատ" : "Off"}</option>
            <option value="on">{lang === "hy" ? "Միացված" : "On"}</option>
          </select>
        </label>
        {notify !== null ? (
          <label>
            {lang === "hy" ? "Telegram հիշեցումներ" : "Telegram reminders"}
            <select className="field" value={notify ? "on" : "off"} onChange={(event) => {
              const next = event.target.value === "on";
              setNotify(next);
              fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notify: next }) });
            }}>
              <option value="off">{lang === "hy" ? "Անջատ" : "Off"}</option>
              <option value="on">{lang === "hy" ? "Միացված" : "On"}</option>
            </select>
          </label>
        ) : null}
        <label>{t(lang, "ranking")}
          <select className="field" defaultValue="private" onChange={(event) => apply("cf-rank", event.target.value)}>
            <option value="private">{t(lang, "private")}</option>
            <option value="anonymous">{t(lang, "anonymous")}</option>
            <option value="public">{t(lang, "public")}</option>
          </select>
        </label>
        <section style={{ margin: "1rem 0" }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              localStorage.setItem("cf-guided", "on");
              Object.keys(localStorage)
                .filter((key) => key.startsWith("cf-tutorial:"))
                .forEach((key) => localStorage.setItem(key, "interview"));
            }}
          >
            {t(lang, "replayHelp")}
          </button>
          <p className="quiet">{lang === "hy" ? "Հաջորդ գործում նորից կերևան կարճ հուշումները։" : "Short tips will show again on your next case."}</p>
        </section>
        <section className="paper doc">
          <h2>{lang === "hy" ? "Ծառայություններ" : "Services"}</h2>
          <p>{status?.ai ? t(lang, "live") : t(lang, "demo")}. {lang === "hy" ? "Տվյալների շտեմարան" : "Database"}: {status?.database ?? "…"}.</p>
          <p>{status?.speech ? (lang === "hy" ? "Տառադարձումը կարգավորված է։" : "Transcription is configured.") : t(lang, "speechOff")}</p>
          <p>{status?.tts ? (lang === "hy" ? "Խոսքը կարգավորված է։ Սրանք հորինված ձայներ են։" : "Speech is configured. The voices are fictional.") : t(lang, "audioOff")}</p>
          <p>{lang === "hy"
            ? "Ձայնագրությունները չեն պահվում։ Ֆայլը մնում է հիշողության մեջ միայն հարցման ընթացքում։ Պահվում է միայն այն տեքստը, որ դուք հաստատում եք։"
            : "Recordings are not retained. Audio stays in memory only for the request. Only a transcript you confirm is saved."}</p>
        </section>
        <section className="paper doc">
          <h2>Telegram</h2>
          {telegram?.configured ? (
            <p>
              {lang === "hy" ? "Բոտը կարգավորված է։" : "Bot token is configured."}
              {telegram.username ? ` @${telegram.username}` : ""}
              {telegram.appUrl ? ` · ${telegram.appUrl}` : ""}
            </p>
          ) : (
            <p className="quiet">
              {lang === "hy"
                ? "/start և Mini App մուտքի համար Vercel-ում ավելացրեք TELEGRAM_BOT_TOKEN և TELEGRAM_WEBHOOK_SECRET, ապա վերագործարկեք։"
                : "For /start and Mini App sign-in, add TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in Vercel Environment Variables, then redeploy."}
            </p>
          )}
          <ol className="quiet" style={{ paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
            <li>{lang === "hy" ? "Ստեղծեք բոտ @BotFather-ում և պատճենեք token-ը։" : "Create a bot with @BotFather and copy the token."}</li>
            <li>
              {lang === "hy" ? "Vercel → Settings → Environment Variables." : "Vercel → Settings → Environment Variables."}
              {" "}
              <code>TELEGRAM_BOT_TOKEN</code>, <code>TELEGRAM_WEBHOOK_SECRET</code>, optional <code>TELEGRAM_BOT_USERNAME</code>
            </li>
            <li>
              {lang === "hy" ? "Կարգավորեք webhook-ը." : "Register the webhook:"}
              {" "}
              <code>npm run telegram:setup</code>
              {" "}
              {lang === "hy" ? "կամ" : "or"}
              {" "}
              <code>POST /api/admin/telegram</code> {"{ \"action\": \"setup\" }"}
            </li>
            <li>{lang === "hy" ? "BotFather-ում Mini App URL-ը դրեք APP_URL-ին։" : "In BotFather, set the Mini App URL to APP_URL."}</li>
          </ol>
        </section>
      </main>
    </>
  );
}
