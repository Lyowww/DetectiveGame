export interface TelegramWebApp {
  initData: string;
  platform: string;
  version: string;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string | undefined>;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  isVersionAtLeast: (version: string) => boolean;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  openTelegramLink: (url: string) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  HapticFeedback: { impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void };
  SettingsButton?: { show: () => void; onClick: (handler: () => void) => void };
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
}

type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

export function webApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const app = (window as TelegramWindow).Telegram?.WebApp;
  if (!app || typeof app.ready !== "function" || !app.initData) return null;
  return app;
}

export function inTelegram() {
  return webApp() !== null;
}

export function applyTelegramChrome(app: TelegramWebApp) {
  const root = document.documentElement;
  root.dataset.telegram = "1";
  root.dataset.tgScheme = app.colorScheme;
  const safe = app.safeAreaInset;
  const content = app.contentSafeAreaInset;
  const safeTop = Math.max(0, safe?.top ?? 0);
  const contentTop = Math.max(0, content?.top ?? 0);
  // Extra breathing room under Telegram's fullscreen chrome / status bar.
  const topGap = Math.max(safeTop, contentTop, 0) + 16;
  root.style.setProperty("--tg-safe-area-inset-top", `${safeTop}px`);
  root.style.setProperty("--tg-safe-area-inset-bottom", `${Math.max(0, safe?.bottom ?? 0)}px`);
  root.style.setProperty("--tg-safe-area-inset-left", `${Math.max(0, safe?.left ?? 0)}px`);
  root.style.setProperty("--tg-safe-area-inset-right", `${Math.max(0, safe?.right ?? 0)}px`);
  root.style.setProperty("--tg-content-safe-area-inset-top", `${contentTop}px`);
  root.style.setProperty("--tg-content-safe-area-inset-bottom", `${Math.max(0, content?.bottom ?? 0)}px`);
  root.style.setProperty("--tg-content-safe-area-inset-left", `${Math.max(0, content?.left ?? 0)}px`);
  root.style.setProperty("--tg-content-safe-area-inset-right", `${Math.max(0, content?.right ?? 0)}px`);
  root.style.setProperty("--tg-top-gap", `${topGap}px`);
  if (app.isVersionAtLeast("6.1")) {
    app.setHeaderColor("#12171b");
    app.setBackgroundColor("#12171b");
  }
}

export function hapticLight() {
  const app = webApp();
  if (!app || document.documentElement.dataset.motion === "reduce") return;
  if (!app.isVersionAtLeast("6.1")) return;
  app.HapticFeedback.impactOccurred("light");
}

export function setClosingConfirmation(enabled: boolean) {
  const app = webApp();
  if (!app || !app.isVersionAtLeast("6.2")) return;
  if (enabled) app.enableClosingConfirmation();
  else app.disableClosingConfirmation();
}

export async function shareText(text: string, url: string) {
  const app = webApp();
  if (app) {
    app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    return "telegram" as const;
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ text, url });
    return "browser" as const;
  }
  await navigator.clipboard.writeText(`${text}\n${url}`);
  return "copied" as const;
}
