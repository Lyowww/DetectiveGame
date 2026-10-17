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

function readableHex(value: string | undefined, fallback: string) {
  if (!value || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return fallback;
  return value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
}

function luminance(hex: string) {
  const raw = hex.replace("#", "");
  const n = (i: number) => Number.parseInt(raw.slice(i, i + 2), 16) / 255;
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(n(0)) + 0.7152 * channel(n(2)) + 0.0722 * channel(n(4));
}

function contrastOk(fg: string, bg: string) {
  const a = luminance(fg);
  const b = luminance(bg);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return ratio >= 4.5;
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

  const theme = app.themeParams ?? {};
  const page = readableHex(theme.bg_color, "#0e1114");
  const surface = readableHex(theme.secondary_bg_color, "#1c232a");
  const text = readableHex(theme.text_color, "#f3efe6");
  const hint = readableHex(theme.hint_color, "#c9c2b5");
  const button = readableHex(theme.button_color, "#d4a35c");
  const buttonText = readableHex(theme.button_text_color, "#1b140c");
  // Only adopt host colors when contrast stays readable; otherwise keep CASEFILE tokens.
  if (contrastOk(text, page)) {
    root.style.setProperty("--bg-page", page);
    root.style.setProperty("--ink", page);
    root.style.setProperty("--text-primary", text);
    root.style.setProperty("--text", text);
  }
  if (contrastOk(text, surface)) {
    root.style.setProperty("--bg-surface", surface);
    root.style.setProperty("--panel", surface);
  }
  if (contrastOk(hint, page)) {
    root.style.setProperty("--text-secondary", hint);
    root.style.setProperty("--muted", hint);
  }
  if (contrastOk(buttonText, button)) {
    root.style.setProperty("--action-primary-bg", button);
    root.style.setProperty("--action-primary-fg", buttonText);
    root.style.setProperty("--amber", button);
  }

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
