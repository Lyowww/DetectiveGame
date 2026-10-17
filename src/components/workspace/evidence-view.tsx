"use client";

import { useState } from "react";
import { EvidenceTypeIcon } from "@/components/workspace/evidence-icons";
import { Bookmark, GitCompareArrows, Pin, iconProps } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";
import type { PublicRun } from "@/lib/public-run";

type Item = PublicRun["evidence"][number];

export function EvidenceView({
  item,
  lang,
  onSave,
  onCompare,
  onPin,
  onPresent,
  onAskAbout,
}: {
  item: Item;
  lang: Lang;
  onSave: () => void;
  onCompare: () => void;
  onPin: () => void;
  onPresent?: () => void;
  onAskAbout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`doc paper evidence-card ${item.type === "transaction" ? "receipt" : ""}`}>
      <p className="kicker" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
        <EvidenceTypeIcon type={item.type} />
        {item.type} · {item.kind === "record" ? t(lang, "record") : t(lang, "claim")} · {item.when || "—"}
      </p>
      <h3>{item.title}</h3>
      <p className="evidence-summary">{item.summary || item.source}</p>
      {item.highlights?.length ? (
        <ul className="evidence-highlights">
          {item.highlights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="quiet" style={{ color: "#5c564c" }}>{item.source}</p>
      {item.type === "camera" && item.frames ? <ContactSheet frames={item.frames} lang={lang} /> : null}
      {item.type === "audio" ? <Wave lang={lang} /> : null}
      {item.type === "map" ? <Plan lang={lang} /> : null}
      {item.type === "call" ? (
        <table className="call-table">
          <caption className="sr">{lang === "hy" ? "Զանգի ամփոփում" : "Call summary"}</caption>
          <tbody>
            <tr><th scope="row">{lang === "hy" ? "Աղբյուր" : "Source"}</th><td>{item.source}</td></tr>
            <tr><th scope="row">{lang === "hy" ? "Երբ" : "When"}</th><td>{item.when || "—"}</td></tr>
          </tbody>
        </table>
      ) : null}
      {item.amounts?.length ? (
        <ul>
          {item.amounts.map((amount) => (
            <li key={amount.id}>{amount.label}: {amount.value} {amount.unit}</li>
          ))}
        </ul>
      ) : null}
      <button className="text-btn" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? t(lang, "hideDetails") : t(lang, "details")}
      </button>
      {open ? (
        <>
          <pre>{item.body}</pre>
          {item.regions?.length ? (
            <ul>
              {item.regions.map((region) => (
                <li key={region.id}><strong>{region.label}.</strong> {region.detail}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      <div className="actions">
        <button className="btn" type="button" onClick={onSave} aria-label={t(lang, "saveNote")}>
          <Bookmark {...iconProps} /> {t(lang, "saveNote")}
        </button>
        <button className="btn" type="button" onClick={onCompare} aria-label={t(lang, "compare")}>
          <GitCompareArrows {...iconProps} /> {t(lang, "compare")}
        </button>
        <button className="btn" type="button" onClick={onPin} aria-label={t(lang, "pin")}>
          <Pin {...iconProps} /> {t(lang, "pin")}
        </button>
        {onPresent ? (
          <button className="btn solid" type="button" onClick={onPresent}>{t(lang, "present")}</button>
        ) : null}
        {onAskAbout ? (
          <button className="btn" type="button" onClick={onAskAbout}>{t(lang, "askAbout")}</button>
        ) : null}
      </div>
    </article>
  );
}

function Wave({ lang }: { lang: Lang }) {
  return (
    <div>
      <div className="wave" aria-hidden="true">
        {[8, 18, 28, 14, 36, 22, 12, 30, 16, 26, 10, 20].map((height, index) => (
          <span key={index} style={{ height }} />
        ))}
      </div>
      <p>{lang === "hy" ? "Միայն սղագրություն։" : "Transcript only."}</p>
    </div>
  );
}

function Plan({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 360 180" role="img" aria-label={lang === "hy" ? "Հատակագիծ" : "Location plan"}>
      <rect x="8" y="20" width="90" height="70" fill="none" stroke="#1c1914" />
      <rect x="120" y="20" width="90" height="70" fill="none" stroke="#1c1914" />
      <rect x="230" y="20" width="110" height="70" fill="none" stroke="#1c1914" />
      <rect x="120" y="110" width="90" height="50" fill="none" stroke="#1c1914" />
      <text x="18" y="60" fontSize="12">A</text>
      <text x="132" y="60" fontSize="12">B</text>
      <text x="246" y="60" fontSize="12">C</text>
      <text x="132" y="140" fontSize="12">D</text>
    </svg>
  );
}

function ContactSheet({ frames, lang }: { frames: NonNullable<Item["frames"]>; lang: Lang }) {
  return (
    <div className="sheet">
      <p className="sr">{lang === "hy" ? "Կադրերի թերթ։" : "Contact sheet."}</p>
      {frames.map((frame) => (
        <figure key={frame.id} className="frame">
          <svg viewBox="0 0 160 100" role="img" aria-label={frame.caption}>
            <rect width="160" height="100" fill="#1b2127" />
            <circle cx="78" cy="38" r="12" fill="#d9d3c6" />
            <rect x="62" y="52" width="32" height="28" fill="#243048" />
            <text x="8" y="94" fill="#f4f0e6" fontSize="8">{frame.time}</text>
          </svg>
          <figcaption>{frame.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
