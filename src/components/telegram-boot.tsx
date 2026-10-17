"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { applyTelegramChrome, webApp } from "@/lib/telegram";

export function TelegramBoot() {
  const router = useRouter();
  const [intro, setIntro] = useState(false);
  const [devMock, setDevMock] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const app = webApp();
    if (app) {
      applyTelegramChrome(app);
      app.expand();
      try {
        app.requestFullscreen?.();
      } catch {
        /* older clients */
      }
      app.ready();
      const refresh = () => applyTelegramChrome(app);
      app.onEvent("themeChanged", refresh);
      app.onEvent("viewportChanged", refresh);
      app.onEvent("safeAreaChanged", refresh);
      app.onEvent("contentSafeAreaChanged", refresh);
      app.onEvent("fullscreenChanged", refresh);
      app.onEvent("activated", () => window.dispatchEvent(new Event("cf-resume")));
      if (app.isVersionAtLeast("7.0") && app.SettingsButton) {
        app.SettingsButton.show();
        app.SettingsButton.onClick(() => router.push("/settings"));
      }
      const initData = app.initData;
      fetch("/api/telegram/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ initData }),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setNotice(typeof data.error === "string" ? data.error : "Telegram sign-in was rejected.");
            return;
          }
          if (data.notice) setNotice(data.notice);
          const profile = await fetch("/api/profile", { credentials: "include" }).then((item) => item.json()).catch(() => null);
          const needsIntro = !localStorage.getItem("cf-introduced") || profile?.profile?.displayName === "Detective";
          if (needsIntro) setIntro(true);
          else if (data.path && data.path !== window.location.pathname + window.location.search) router.replace(data.path);
        })
        .catch(() => setNotice("Telegram sign-in did not complete. You can still browse the archive in the browser."));
    } else {
      fetch("/api/telegram/config")
        .then((response) => response.json())
        .then((data) => setDevMock(Boolean(data.devMock)))
        .catch(() => setDevMock(false));
    }
  }, [router]);

  async function signInWithDevMock() {
    const response = await fetch("/api/telegram/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ dev: true, telegramUserId: "10001" }),
    });
    if (!response.ok) return;
    document.documentElement.dataset.telegram = "mock";
    router.refresh();
  }

  return (
    <>
      {devMock ? (
        <p className="banner" role="status">
          Development Telegram mock. This sign-in does not exist in production.
          <button className="btn" type="button" onClick={() => void signInWithDevMock()}>Use mock identity</button>
        </p>
      ) : null}
      {notice ? <p className="banner" role="status">{notice}</p> : null}
      {intro ? (
        <div className="modal-back" role="presentation">
          <div className="modal paper" role="dialog" aria-modal="true" aria-labelledby="tg-intro-title">
            <h2 id="tg-intro-title">CASEFILE</h2>
            <p>You are the detective. Save clues, ask short questions, compare records.</p>
            <label>Display name
              <input className="field" id="tg-display-name" defaultValue="Detective" maxLength={80} />
            </label>
            <label className="quiet" style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
              <input type="checkbox" id="tg-terms" defaultChecked />
              <span>I accept the terms. Saved cases stay with this account. No password is required in Telegram.</span>
            </label>
            <button className="btn solid" style={{ marginTop: "1rem" }} onClick={() => {
              const name = (document.getElementById("tg-display-name") as HTMLInputElement | null)?.value.trim() || "Detective";
              const accepted = (document.getElementById("tg-terms") as HTMLInputElement | null)?.checked;
              if (!accepted) { setNotice("Accept the terms to continue."); return; }
              fetch("/api/profile", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ displayName: name }),
              });
              localStorage.setItem("cf-introduced", "1");
              setIntro(false);
              router.push("/library");
            }}>Open the archive</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
