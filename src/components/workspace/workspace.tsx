"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  Compass,
  Crosshair,
  GitCompareArrows,
  Lightbulb,
  Link2,
  MapPin,
  Mic,
  NotebookPen,
  Search,
  Send,
  Settings,
  Target,
  UserRound,
  X,
  iconProps,
} from "@/components/ui/icons";
import { EvidenceTypeIcon } from "@/components/workspace/evidence-icons";
import { EvidenceView } from "@/components/workspace/evidence-view";
import { ensureSession } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { hapticLight, setClosingConfirmation, shareText, webApp } from "@/lib/telegram";
import type { ComparePayload, PublicRun } from "@/lib/public-run";
import type { BoardEdge, BoardNode, Note } from "@/lib/types";

const BoardCanvas = dynamic(() => import("@/components/workspace/board").then((mod) => mod.BoardCanvas), { ssr: false });

type Dest = "investigate" | "evidence" | "notebook" | "solve";
type EvidenceTool = "list" | "timeline" | "board" | "compare";
type Action = Record<string, unknown>;
type TutorialStep = "interview" | "ask" | "save" | "evidence" | "compare" | "done";

interface Result {
  ok: boolean;
  run?: PublicRun;
  notices?: string[];
  alternatives?: { label: string; action: Action }[];
  confirm?: { body: string; action: Action } | null;
  compare?: ComparePayload | null;
  hintPreview?: { level: 1 | 2 | 3; cost: number; warning: string } | null;
  error?: string;
}

const emptyNote = (): Note => ({
  id: crypto.randomUUID(),
  body: "",
  quote: null,
  sourceType: "free",
  sourceId: null,
  speaker: null,
  inWorldMinute: null,
  tags: [],
  personId: null,
  locationId: null,
  importance: "normal",
  mark: "unverified",
  pinned: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function tutorialKey(runId: string) {
  return `cf-tutorial:${runId}`;
}

function guidedKey() {
  return "cf-guided";
}

export function Workspace({ runId }: { runId: string }) {
  const [run, setRun] = useState<PublicRun | null>(null);
  const [dest, setDest] = useState<Dest>("investigate");
  const [personId, setPersonId] = useState<string | null>(null);
  const [placeFocus, setPlaceFocus] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [evidenceTool, setEvidenceTool] = useState<EvidenceTool>("list");
  const [text, setText] = useState("");
  const [present, setPresent] = useState<string[]>([]);
  const [presentOpen, setPresentOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeOk, setNoticeOk] = useState(false);
  const [alternatives, setAlternatives] = useState<{ label: string; action: Action }[]>([]);
  const [confirm, setConfirm] = useState<{ body: string; action: Action } | null>(null);
  const [hint, setHint] = useState<Result["hintPreview"]>(null);
  const [compare, setCompare] = useState<ComparePayload | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [saving, setSaving] = useState<"saved" | "saving" | "error">("saved");
  const [note, setNote] = useState<Note | null>(null);
  const [query, setQuery] = useState("");
  const [filterPerson, setFilterPerson] = useState("all");
  const [boardMode, setBoardMode] = useState<"list" | "graph">("list");
  const [linkDraft, setLinkDraft] = useState({ source: "", target: "", label: "", state: "suspected" as BoardEdge["state"] });
  const [eventTitle, setEventTitle] = useState("");
  const [recording, setRecording] = useState<"idle" | "recording" | "review">("idle");
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [telegram, setTelegram] = useState(false);
  const [browserCode, setBrowserCode] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [guided, setGuided] = useState(true);
  const [tutorial, setTutorial] = useState<TutorialStep>("interview");
  const [card, setCard] = useState({
    claimAId: "",
    claimBId: "",
    explanation: "",
    state: "suspected" as "unverified" | "suspected" | "established",
  });
  const [report, setReport] = useState({
    whereId: "unknown",
    responsibleId: "unknown",
    explanation: "",
    motive: "",
    uncertainties: "",
    evidenceIds: [] as string[],
  });
  const [solveStep, setSolveStep] = useState(0);

  const lang: Lang = run?.language ?? "en";

  useEffect(() => {
    let active = true;
    ensureSession()
      .then(() => fetch(`/api/runs/${runId}`))
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) throw new Error(data.error ?? t(lang, "errorGeneric"));
        setRun(data.run);
        document.documentElement.lang = data.run.language;
        setPlaceFocus(data.run.locationId);
      })
      .catch((error: Error) => {
        if (active) setNotice(error.message);
      });
    return () => {
      active = false;
    };
  }, [runId, lang]);

  useEffect(() => () => audio?.pause(), [audio]);

  useEffect(() => {
    setTelegram(Boolean(webApp()));
    setDraftReady(false);
    const saved = sessionStorage.getItem(`cf-draft:${runId}`);
    if (saved) setText(saved);
    setDraftReady(true);
    const savedTutorial = localStorage.getItem(tutorialKey(runId)) as TutorialStep | null;
    if (savedTutorial) setTutorial(savedTutorial);
    setGuided(localStorage.getItem(guidedKey()) !== "off");
    const resume = () => {
      ensureSession()
        .then(() => fetch(`/api/runs/${runId}`))
        .then(async (response) => ({ ok: response.ok, data: await response.json() }))
        .then(({ ok, data }) => {
          if (ok) setRun(data.run);
        })
        .catch(() => undefined);
    };
    window.addEventListener("cf-resume", resume);
    return () => window.removeEventListener("cf-resume", resume);
  }, [runId]);

  useEffect(() => {
    if (!draftReady) return;
    sessionStorage.setItem(`cf-draft:${runId}`, text);
  }, [text, runId, draftReady]);

  useEffect(() => {
    localStorage.setItem(tutorialKey(runId), tutorial);
  }, [tutorial, runId]);

  useEffect(() => {
    localStorage.setItem(guidedKey(), guided ? "on" : "off");
  }, [guided]);

  useEffect(() => {
    const app = webApp();
    if (!app || !app.isVersionAtLeast("6.1")) return;
    const nested = Boolean(personId || evidenceId || evidenceTool !== "list" || helpOpen);
    const back = () => {
      if (helpOpen) setHelpOpen(false);
      else if (personId) setPersonId(null);
      else if (evidenceId) setEvidenceId(null);
      else if (evidenceTool !== "list") setEvidenceTool("list");
      else if (dest !== "investigate") setDest("investigate");
      else app.BackButton.hide();
    };
    if (nested || dest !== "investigate") app.BackButton.show();
    else app.BackButton.hide();
    app.BackButton.onClick(back);
    return () => app.BackButton.offClick(back);
  }, [helpOpen, personId, evidenceId, evidenceTool, dest]);

  useEffect(() => {
    setClosingConfirmation(Boolean(note && (note.body || note.quote)));
  }, [note]);

  async function post(action: Action) {
    setSaving("saving");
    setNotice("");
    setNoticeOk(false);
    const response = await fetch(`/api/runs/${runId}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), action }),
    });
    const data = (await response.json()) as Result;
    if (data.run) setRun(data.run);
    setAlternatives(data.alternatives ?? []);
    setConfirm(data.confirm ?? null);
    setHint(data.hintPreview ?? null);
    if (data.compare) {
      setCompare(data.compare);
      setDest("evidence");
      setEvidenceTool("compare");
      setEvidenceId(null);
    }
    if (!response.ok || data.ok === false) {
      setNotice(data.notices?.join(" ") || data.error || t(lang, "errorGeneric"));
      setSaving(response.ok ? "saved" : "error");
    } else {
      setNotice(data.notices?.join(" ") ?? "");
      setSaving("saved");
      if (data.run?.ttsConfigured && localStorage.getItem("cf-autoplay") === "on") {
        const last = [...(data.run.messages ?? [])].reverse().find((message) => message.role === "character");
        if (last) void speak(last.text, last.characterId);
      }
    }
    return data;
  }

  function openPerson(id: string) {
    setPersonId(id);
    setDest("investigate");
    if (tutorial === "interview") setTutorial("ask");
  }

  function openEvidence(id: string) {
    setEvidenceId(id);
    setDest("evidence");
    setEvidenceTool("list");
    setCompare(null);
    if (tutorial === "evidence") setTutorial("compare");
  }

  function advanceTutorial(next: TutorialStep) {
    setTutorial((current) => (current === "done" ? current : next));
  }

  const place = run?.locations.find((item) => item.id === (placeFocus ?? run.locationId));
  const person = run?.characters.find((item) => item.id === personId);
  const evidence = run?.evidence.find((item) => item.id === evidenceId);
  const interviewMessages = useMemo(() => {
    if (!run || !personId) return [];
    return run.messages.filter((message) => {
      if (message.role === "system") return false;
      if (message.role === "character") return message.characterId === personId;
      const index = run.messages.findIndex((item) => item.id === message.id);
      const next = run.messages[index + 1];
      return next?.characterId === personId;
    });
  }, [run, personId]);

  const notes = (run?.notes ?? []).filter((item) => {
    if (filterPerson !== "all" && item.personId !== filterPerson && item.speaker !== filterPerson) return false;
    const hay = `${item.body} ${item.quote ?? ""} ${item.tags.join(" ")}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const leads = useMemo(() => {
    if (!run || !guided) return [] as string[];
    const items: string[] = [];
    const uninterviewed = run.characters.filter((item) => item.available && !item.interviewed);
    if (uninterviewed[0]) items.push(`${t(lang, "interview")} ${uninterviewed[0].name}`);
    const follow = run.characters.find((item) => item.followUpAvailable);
    if (follow) items.push(`${follow.name}: ${t(lang, "newTopic")}`);
    const here = run.locations.find((item) => item.id === run.locationId);
    const openRecord = here?.records.find((item) => !item.obtained);
    if (openRecord) items.push(openRecord.label);
    if (run.evidence.length >= 2 && compareIds.length < 2) items.push(t(lang, "compare"));
    return items.slice(0, 2);
  }, [run, guided, lang, compareIds.length]);

  async function ask(question?: string) {
    const body = (question ?? text).trim();
    if (!body) return;
    if (!question) setText("");
    await post(
      personId
        ? { type: "interview", characterId: personId, text: body, evidenceIds: present }
        : { type: "say", text: body, evidenceIds: present },
    );
    setPresent([]);
    setPresentOpen(false);
    setRecording("idle");
    if (tutorial === "ask") advanceTutorial("save");
  }

  async function toggleRecord() {
    setVoiceError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(t(lang, "micUnsupported"));
      return;
    }
    if (recording === "recording" && recorder) {
      recorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => chunks.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording("review");
        const blob = new Blob(chunks, { type: media.mimeType || "audio/webm" });
        const form = new FormData();
        form.set("audio", blob, "question.webm");
        const response = await fetch("/api/speech/transcribe", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok) setVoiceError(data.error ?? t(lang, "speechOff"));
        else setText(data.text ?? "");
      };
      media.start();
      setRecorder(media);
      setRecording("recording");
    } catch {
      setVoiceError(t(lang, "micDenied"));
    }
  }

  async function speak(line: string, characterId: string) {
    if (!run?.ttsConfigured) return;
    audio?.pause();
    const response = await fetch("/api/speech/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: line, characterId }),
    });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob());
    const player = new Audio(url);
    setAudio(player);
    await player.play();
  }

  function startNote(partial: Partial<Note>) {
    setNote({ ...emptyNote(), ...partial });
    setDest("notebook");
  }

  async function saveNote() {
    if (!note) return;
    await post({ type: "note_save", note });
    hapticLight();
    setNote(null);
    setNotice(t(lang, "savedToNotebook"));
    setNoticeOk(true);
    if (tutorial === "save") advanceTutorial("evidence");
  }

  async function quickSaveQuote(messageText: string, messageId: string, characterId: string, clockMinute: number) {
    const draft: Note = {
      ...emptyNote(),
      quote: messageText,
      body: "",
      sourceType: "message",
      sourceId: messageId,
      speaker: person?.name ?? null,
      inWorldMinute: clockMinute,
      personId: characterId === "player" ? null : characterId,
    };
    await post({ type: "note_save", note: draft });
    hapticLight();
    setNotice(t(lang, "savedToNotebook"));
    setNoticeOk(true);
    if (tutorial === "save") advanceTutorial("evidence");
  }

  function addBoard(kind: BoardNode["kind"], refId: string, label: string) {
    if (!run) return;
    const node: BoardNode = {
      id: crypto.randomUUID(),
      kind,
      refId,
      x: 40 + run.boardNodes.length * 24,
      y: 40 + run.boardNodes.length * 16,
      label,
    };
    void post({ type: "board_save", nodes: [...run.boardNodes, node], edges: run.boardEdges });
  }

  function goDest(next: Dest) {
    setDest(next);
    if (next !== "investigate") setPersonId(null);
    if (next !== "evidence") {
      setEvidenceId(null);
      setEvidenceTool("list");
    }
  }

  if (!run) {
    return (
      <main id="main" className="page">
        <p>{notice || t(lang, "reading")}</p>
      </main>
    );
  }

  const timeline = run.timeline.filter((event) => filterPerson === "all" || event.personId === filterPerson);
  const tipText =
    tutorial === "interview"
      ? t(lang, "tutorialInterview")
      : tutorial === "ask"
        ? t(lang, "tutorialAsk")
        : tutorial === "save"
          ? t(lang, "tutorialSave")
          : tutorial === "evidence"
            ? t(lang, "tutorialEvidence")
            : tutorial === "compare"
              ? t(lang, "tutorialCompare")
              : "";

  return (
    <div className="desk">
      <header className="desk-header">
        <div className="desk-title">
          <Link href="/library" className="text-btn" aria-label={t(lang, "back")}>
            <ChevronLeft {...iconProps} /> {t(lang, "back")}
          </Link>
          <strong>{run.title}</strong>
        </div>
        <div className="desk-meta">
          <span>{run.clock}</span>
          {run.deadline ? <span className="chip">{run.deadline}</span> : null}
          <span className={`chip ${run.mode === "live" ? "amber" : ""}`}>{run.mode === "live" ? t(lang, "live") : t(lang, "demo")}</span>
          <span aria-live="polite">{saving === "saving" ? t(lang, "saving") : saving === "error" ? t(lang, "error") : t(lang, "saved")}</span>
          <Link href="/settings" className="text-btn" aria-label={t(lang, "settings")}>
            <Settings {...iconProps} />
          </Link>
        </div>
      </header>

      <nav className="nav-rail" aria-label="Primary">
        <button type="button" aria-current={dest === "investigate"} onClick={() => goDest("investigate")}>
          <Compass {...iconProps} />
          {t(lang, "investigate")}
        </button>
        <button type="button" aria-current={dest === "evidence"} onClick={() => goDest("evidence")}>
          <BookOpen {...iconProps} />
          {t(lang, "evidence")}
        </button>
        <button type="button" aria-current={dest === "notebook"} onClick={() => goDest("notebook")}>
          <NotebookPen {...iconProps} />
          {t(lang, "notebook")}
        </button>
        <button type="button" aria-current={dest === "solve"} onClick={() => goDest("solve")}>
          <Crosshair {...iconProps} />
          {t(lang, "solve")}
        </button>
        <div className="rail-foot">
          <button type="button" onClick={() => setHelpOpen(true)} aria-label={t(lang, "help")}>
            <CircleHelp {...iconProps} />
            {t(lang, "help")}
          </button>
        </div>
      </nav>

      {guided ? (
        <div className="objective-strip">
          <span className="obj-main">
            <Target {...iconProps} size={16} />
            {run.objectives.main}
          </span>
          {(leads[0] || run.firstLead) ? (
            <span className="obj-lead">
              <Lightbulb {...iconProps} size={16} />
              {leads[0] || run.firstLead}
            </span>
          ) : null}
          <div className="progress-pills">
            <span className="chip">{run.progress.evidenceFound} {t(lang, "evidence").toLowerCase()}</span>
            <span className="chip">{run.progress.interviewsDone} {t(lang, "people").toLowerCase()}</span>
            <button className="text-btn" type="button" onClick={() => setGuided(false)}>{t(lang, "collapseGuide")}</button>
          </div>
        </div>
      ) : (
        <div className="objective-strip">
          <span className="obj-main">
            <Target {...iconProps} size={16} />
            {run.objectives.main}
          </span>
          <button className="text-btn" type="button" onClick={() => setGuided(true)} style={{ marginLeft: "auto" }}>
            {t(lang, "expandGuide")}
          </button>
        </div>
      )}

      <main id="main" className="desk-main">
        {notice ? <div className={`banner ${noticeOk ? "ok" : ""}`} role="status">{notice}</div> : null}
        {voiceError ? (
          <p className="banner" role="alert">
            {voiceError}
            {telegram ? (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  fetch("/api/telegram/continue", { method: "POST" })
                    .then((response) => response.json())
                    .then((data) => setBrowserCode(data.code ?? ""))
                    .catch(() => undefined);
                }}
              >
                {t(lang, "continueBrowser")}
              </button>
            ) : null}
            {browserCode ? <span> {browserCode}</span> : null}
          </p>
        ) : null}
        {alternatives.length ? (
          <div className="actions">
            {alternatives.map((item) => (
              <button key={item.label} className="btn solid" type="button" onClick={() => post(item.action)}>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {dest === "investigate" && !personId ? (
          <section>
            <div className="hub-section">
              <h2>{t(lang, "people")}</h2>
              <div className="person-grid">
                {run.characters.map((item) => (
                  <button key={item.id} type="button" className="entity-card" onClick={() => openPerson(item.id)} disabled={!item.available}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.portrait} alt="" width={72} height={84} loading="lazy" />
                    <span>
                      <strong>{item.name}</strong>
                      <p className="role">{item.role}</p>
                      <span className="entity-actions">
                        <span className="chip">
                          <UserRound {...iconProps} size={14} />
                          {t(lang, "interview")}
                        </span>
                        <span className={`chip ${item.followUpAvailable ? "new" : ""}`}>
                          {!item.available
                            ? t(lang, "locked")
                            : item.followUpAvailable
                              ? t(lang, "newTopic")
                              : item.interviewed
                                ? t(lang, "interviewed")
                                : t(lang, "notInterviewed")}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="hub-section">
              <h2>{t(lang, "places")}</h2>
              <div className="place-grid">
                {run.locations.map((item) => {
                  const active = item.id === run.locationId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="entity-card"
                      onClick={() => {
                        setPlaceFocus(item.id);
                        if (!active) void post({ type: "travel", locationId: item.id });
                      }}
                    >
                      <span className="place-thumb" aria-hidden="true">
                        <MapPin {...iconProps} size={22} />
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <p className="role">{item.blurb}</p>
                        <span className="entity-actions">
                          <span className="chip">
                            <MapPin {...iconProps} size={14} />
                            {t(lang, "inspect")}
                          </span>
                          <span className="chip">{active ? t(lang, "available") : t(lang, "discovered")}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {place ? (
              <section className="place-detail hub-section">
                <h2>{place.name}</h2>
                <div className="region-list">
                  {place.regions.map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      className="region-btn"
                      onClick={() => {
                        void post({ type: "inspect", locationId: place.id, regionId: region.id }).then(() => {
                          if (tutorial === "evidence" || tutorial === "save") advanceTutorial("evidence");
                          setDest("evidence");
                        });
                      }}
                    >
                      <span>
                        <strong>{region.label}</strong>
                        <span style={{ display: "block" }}>{region.summary}</span>
                      </span>
                      <span className="chip">{t(lang, "inspect")}</span>
                    </button>
                  ))}
                </div>
                {place.records.length ? (
                  <div className="record-list">
                    {place.records.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        className="record-btn"
                        disabled={record.obtained}
                        onClick={() => {
                          void post({ type: "request_record", recordId: record.id }).then(() => setDest("evidence"));
                        }}
                      >
                        <span>
                          <strong>{record.label}</strong>
                          <span style={{ display: "block" }}>{record.detail}</span>
                        </span>
                        <span className="chip">{record.obtained ? "✓" : t(lang, "available")}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {run.completion.type === "rescue" && run.completion.locationId === place.id && !run.rescued ? (
                  <button
                    className="btn solid"
                    type="button"
                    onClick={() => post({ type: "say", text: run.completion.label || t(lang, "openAnnex") })}
                  >
                    {run.completion.label || t(lang, "openAnnex")}
                  </button>
                ) : null}
              </section>
            ) : null}
          </section>
        ) : null}

        {dest === "investigate" && personId && person ? (
          <section className="interview">
            <button className="text-btn" type="button" onClick={() => setPersonId(null)}>
              <ChevronLeft {...iconProps} /> {t(lang, "backToInvestigate")}
            </button>
            <header className="interview-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="interview-portrait" src={person.portrait} alt="" width={72} height={90} />
              <div>
                <h2 style={{ fontFamily: "var(--serif)", fontWeight: 500, margin: 0 }}>{person.name}</h2>
                <p className="quiet" style={{ margin: "0.2rem 0" }}>{person.role}</p>
              </div>
              <button className="btn" type="button" onClick={() => setPresentOpen((value) => !value)} aria-expanded={presentOpen}>
                <BookOpen {...iconProps} /> {t(lang, "present")}
              </button>
            </header>
            {presentOpen ? (
              <div className="present-bar">
                {run.evidence.length === 0 ? <span className="quiet">{t(lang, "emptyEvidence")}</span> : null}
                {run.evidence.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="btn"
                    aria-pressed={present.includes(item.id)}
                    onClick={() =>
                      setPresent((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]))
                    }
                  >
                    <EvidenceTypeIcon type={item.type} /> {item.title}
                  </button>
                ))}
              </div>
            ) : null}
            {present.length ? (
              <p className="quiet">
                {t(lang, "present")}: {present.map((id) => run.evidence.find((item) => item.id === id)?.title).filter(Boolean).join(", ")}
              </p>
            ) : null}
            {person.suggestionChips?.length || person.suggestions?.length ? (
              <div className="chip-row" role="group" aria-label={t(lang, "send")}>
                {(person.suggestionChips?.length ? person.suggestionChips : person.suggestions).slice(0, 3).map((chip, index) => {
                  const full = person.suggestions[index] ?? chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      className="q-chip"
                      aria-label={full}
                      onClick={() => void ask(full)}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="transcript">
              {interviewMessages.map((message) => (
                <article key={message.id} className={`bubble ${message.role}`}>
                  <header>
                    <span>{message.role === "player" ? t(lang, "you") : person.name} · {message.clock}</span>
                  </header>
                  <p style={{ margin: 0 }}>{message.text}</p>
                  {message.role === "character" ? (
                    <div className="msg-actions">
                      <button
                        type="button"
                        aria-label={t(lang, "saveNote")}
                        title={t(lang, "saveNote")}
                        onClick={() => void quickSaveQuote(message.text, message.id, message.characterId, message.atMinute)}
                      >
                        <Bookmark {...iconProps} />
                      </button>
                      <button
                        type="button"
                        aria-label={t(lang, "followUp")}
                        title={t(lang, "followUp")}
                        onClick={() => setText(`About this: "${message.text.slice(0, 120)}" `)}
                      >
                        <CircleHelp {...iconProps} />
                      </button>
                      {run.evidence.length ? (
                        <button
                          type="button"
                          aria-label={t(lang, "compare")}
                          title={t(lang, "compare")}
                          onClick={() => {
                            setDest("evidence");
                            setEvidenceTool("list");
                          }}
                        >
                          <GitCompareArrows {...iconProps} />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                void ask();
              }}
            >
              <label className="sr" htmlFor="ask">{t(lang, "send")}</label>
              <input
                id="ask"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={lang === "hy" ? "Հարց…" : "Ask…"}
              />
              <button className="btn icon-only" type="button" onClick={() => void toggleRecord()} aria-pressed={recording === "recording"} aria-label={t(lang, "recordVoice")}>
                <Mic {...iconProps} />
              </button>
              <button className="btn solid" type="submit" aria-label={t(lang, "send")}>
                <Send {...iconProps} /> {recording === "review" ? t(lang, "useTranscript") : t(lang, "send")}
              </button>
            </form>
          </section>
        ) : null}

        {dest === "evidence" ? (
          <section>
            <div className="evidence-toolbar">
              <button className="btn solid" type="button" onClick={() => setEvidenceTool("list")} aria-pressed={evidenceTool === "list"}>
                <BookOpen {...iconProps} /> {t(lang, "evidence")}
              </button>
              <button
                className="btn"
                type="button"
                disabled={compareIds.length < 2}
                onClick={() => {
                  void post({ type: "compare", ids: compareIds });
                  if (tutorial === "compare") advanceTutorial("done");
                }}
              >
                <GitCompareArrows {...iconProps} /> {t(lang, "compare")}
                {compareIds.length ? ` (${compareIds.length})` : ""}
              </button>
              <button className="btn" type="button" onClick={() => setEvidenceTool("timeline")} aria-pressed={evidenceTool === "timeline"}>
                {t(lang, "timeline")}
              </button>
              <button className="btn" type="button" onClick={() => setEvidenceTool("board")} aria-pressed={evidenceTool === "board"}>
                <Link2 {...iconProps} /> {t(lang, "board")}
              </button>
              {compareIds.length ? (
                <button className="text-btn" type="button" onClick={() => setCompareIds([])}>{t(lang, "cancel")}</button>
              ) : null}
            </div>

            {evidenceTool === "list" && !evidenceId && !compare ? (
              run.evidence.length ? (
                <div className="evidence-grid">
                  {run.evidence.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="ev-card"
                      aria-pressed={compareIds.includes(item.id)}
                      onClick={() => openEvidence(item.id)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setCompareIds((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id].slice(-4)));
                      }}
                    >
                      <span className="ev-type">
                        <EvidenceTypeIcon type={item.type} />
                        {item.type}
                        {compareIds.includes(item.id) ? <span className="status-dot" /> : null}
                      </span>
                      <h3>{item.title}</h3>
                      <p className="quiet">{item.source}</p>
                      <p className="quiet">{item.when || "—"}</p>
                      <div className="actions" style={{ marginTop: "0.35rem" }}>
                        <span
                          className="chip"
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCompareIds((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id].slice(-4)));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              setCompareIds((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id].slice(-4)));
                            }
                          }}
                        >
                          {t(lang, "compare")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>{t(lang, "emptyEvidence")}</p>
                </div>
              )
            ) : null}

            {evidenceTool === "list" && evidence && !compare ? (
              <>
                <button className="text-btn" type="button" onClick={() => setEvidenceId(null)}>
                  <ChevronLeft {...iconProps} /> {t(lang, "evidence")}
                </button>
                <EvidenceView
                  item={evidence}
                  lang={lang}
                  onSave={() => startNote({ quote: evidence.body, sourceType: "evidence", sourceId: evidence.id, body: "" })}
                  onCompare={() => setCompareIds((ids) => (ids.includes(evidence.id) ? ids : [...ids, evidence.id].slice(-4)))}
                  onPin={() => addBoard("evidence", evidence.id, evidence.title)}
                  onAskAbout={() => {
                    const target = run.characters.find((item) => evidence.people.includes(item.id) && item.available) ?? run.characters.find((item) => item.available);
                    if (!target) return;
                    setPresent([evidence.id]);
                    setPresentOpen(true);
                    openPerson(target.id);
                    setText(`${t(lang, "askAbout")}: ${evidence.title}`);
                  }}
                />
              </>
            ) : null}

            {(evidenceTool === "compare" || compare) && compare ? (
              <section>
                <p className="kicker">{t(lang, "assistance")}</p>
                <p className="quiet">{compare.disclaimer}</p>
                <div className="compare-pane">
                  {compare.items.map((item) => (
                    <article key={item.id}>
                      <h3 style={{ fontFamily: "var(--serif)", margin: "0 0 0.35rem" }}>{item.title}</h3>
                      <p className="quiet" style={{ color: "#5c564c" }}>{item.source}</p>
                      <pre>{item.body}</pre>
                    </article>
                  ))}
                </div>
                <ul>{compare.observations.map((line) => <li key={line}>{line}</li>)}</ul>
                <div className="actions">
                  <button className="btn" type="button" onClick={() => setCard({ claimAId: compare.items[0]?.id ?? "", claimBId: compare.items[1]?.id ?? "", explanation: "", state: "suspected" })}>
                    {t(lang, "contradiction")}
                  </button>
                  <button className="btn" type="button" onClick={() => setCompare(null)}>{t(lang, "cancel")}</button>
                </div>
              </section>
            ) : null}

            {evidenceTool === "list" && !evidenceId && !compare && compareIds.length > 0 && compareIds.length < 2 ? (
              <p className="quiet">{t(lang, "selectTwo")}</p>
            ) : null}

            {evidenceTool === "timeline" ? (
              <section>
                <label>
                  {t(lang, "people")}
                  <select className="field" value={filterPerson} onChange={(event) => setFilterPerson(event.target.value)}>
                    <option value="all">{t(lang, "filterAll")}</option>
                    {run.characters.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <div className="timeline" style={{ marginTop: "0.75rem" }}>
                  {timeline.map((event) => {
                    const who = run.characters.find((item) => item.id === event.personId);
                    return (
                      <div key={event.id} className="time-row">
                        <span>{event.when}</span>
                        <span>
                          {who ? (
                            <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={who.portrait} alt="" width={28} height={34} style={{ objectFit: "cover", borderRadius: 3 }} />
                              {event.title}
                            </span>
                          ) : (
                            event.title
                          )}
                        </span>
                        <span className={`chip ${event.kind === "record" ? "record" : ""}`}>
                          {event.uncertain ? "~ " : ""}
                          {event.kind === "player" ? t(lang, "playerEvent") : event.kind === "record" ? t(lang, "record") : t(lang, "claim")}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <form
                  className="actions"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void post({
                      type: "timeline_add",
                      event: {
                        title: eventTitle,
                        minute: null,
                        endMinute: null,
                        uncertain: true,
                        locationId: run.locationId,
                        personId: null,
                        sourceNote: "",
                      },
                    });
                    setEventTitle("");
                  }}
                >
                  <input className="field" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder={t(lang, "playerEvent")} />
                  <button className="btn" type="submit">{lang === "hy" ? "Ավելացնել" : "Add"}</button>
                </form>
              </section>
            ) : null}

            {evidenceTool === "board" ? (
              <section>
                <div className="actions">
                  <button className="btn" type="button" aria-pressed={boardMode === "list"} onClick={() => setBoardMode("list")}>{t(lang, "listView")}</button>
                  <button className="btn" type="button" aria-pressed={boardMode === "graph"} onClick={() => setBoardMode("graph")}>{t(lang, "graphView")}</button>
                </div>
                {boardMode === "graph" ? (
                  <BoardCanvas
                    nodes={run.boardNodes}
                    edges={run.boardEdges}
                    onMove={(id, x, y) =>
                      post({
                        type: "board_save",
                        nodes: run.boardNodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
                        edges: run.boardEdges,
                      })
                    }
                  />
                ) : (
                  <ul>
                    {run.boardNodes.map((node) => (
                      <li key={node.id}>{node.label}</li>
                    ))}
                    {run.boardEdges.map((edge) => (
                      <li key={edge.id}>{edge.state}: {edge.label}</li>
                    ))}
                    {!run.boardNodes.length ? <li className="quiet">{t(lang, "addCard")}</li> : null}
                  </ul>
                )}
                <div className="actions">
                  <select className="field" value={linkDraft.source} onChange={(event) => setLinkDraft({ ...linkDraft, source: event.target.value })}>
                    <option value="">{t(lang, "link")}</option>
                    {run.boardNodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </select>
                  <select className="field" value={linkDraft.target} onChange={(event) => setLinkDraft({ ...linkDraft, target: event.target.value })}>
                    <option value="" />
                    {run.boardNodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </select>
                  <input className="field" value={linkDraft.label} onChange={(event) => setLinkDraft({ ...linkDraft, label: event.target.value })} placeholder={t(lang, "link")} />
                  <select className="field" value={linkDraft.state} onChange={(event) => setLinkDraft({ ...linkDraft, state: event.target.value as BoardEdge["state"] })}>
                    <option value="suspected">{t(lang, "related")}</option>
                    <option value="confirmed">{t(lang, "supports")}</option>
                    <option value="disproven">{t(lang, "unclear")}</option>
                  </select>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      if (!linkDraft.source || !linkDraft.target) return;
                      const edge: BoardEdge = {
                        id: crypto.randomUUID(),
                        source: linkDraft.source,
                        target: linkDraft.target,
                        label: linkDraft.label,
                        state: linkDraft.state,
                      };
                      void post({ type: "board_save", nodes: run.boardNodes, edges: [...run.boardEdges, edge] });
                    }}
                  >
                    {t(lang, "link")}
                  </button>
                </div>
              </section>
            ) : null}

            {card.claimAId ? (
              <form
                className="paper doc"
                onSubmit={(event) => {
                  event.preventDefault();
                  void post({ type: "contradiction_save", card }).then(() =>
                    setCard({ claimAId: "", claimBId: "", explanation: "", state: "suspected" }),
                  );
                }}
              >
                <h3>{t(lang, "contradiction")}</h3>
                <label>
                  {t(lang, "claimA")}
                  <select className="field" value={card.claimAId} onChange={(event) => setCard({ ...card, claimAId: event.target.value })}>
                    {run.evidence.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(lang, "claimB")}
                  <select className="field" value={card.claimBId} onChange={(event) => setCard({ ...card, claimBId: event.target.value })}>
                    {run.evidence.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </label>
                <textarea className="field" value={card.explanation} onChange={(event) => setCard({ ...card, explanation: event.target.value })} placeholder={t(lang, "yourNote")} />
                <select className="field" value={card.state} onChange={(event) => setCard({ ...card, state: event.target.value as typeof card.state })}>
                  <option value="suspected">{t(lang, "related")}</option>
                  <option value="established">{t(lang, "conflicts")}</option>
                  <option value="unverified">{t(lang, "unclear")}</option>
                </select>
                <div className="actions">
                  <button className="btn solid" type="submit">{t(lang, "keepCard")}</button>
                  <button className="btn" type="button" onClick={() => setCard({ claimAId: "", claimBId: "", explanation: "", state: "suspected" })}>{t(lang, "cancel")}</button>
                </div>
              </form>
            ) : null}

            {run.contradictions.length ? (
              <section style={{ marginTop: "1rem" }}>
                <h2 style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>{t(lang, "contradiction")}</h2>
                {run.contradictions.map((item) => {
                  const a = run.evidence.find((ev) => ev.id === item.claimAId)?.title ?? item.claimAId;
                  const b = run.evidence.find((ev) => ev.id === item.claimBId)?.title ?? item.claimBId;
                  return (
                    <article key={item.id} className="note">
                      <p>{a} / {b}</p>
                      <p className="mine">{item.explanation}</p>
                      <p className="quiet">{item.state}</p>
                      <button className="text-btn" type="button" onClick={() => post({ type: "contradiction_delete", id: item.id })}>{lang === "hy" ? "Ջնջել" : "Delete"}</button>
                    </article>
                  );
                })}
              </section>
            ) : null}
          </section>
        ) : null}

        {dest === "notebook" ? (
          <section>
            <div className="evidence-toolbar">
              <button className="btn solid" type="button" onClick={() => startNote({})}>
                <NotebookPen {...iconProps} /> {t(lang, "freeNote")}
              </button>
              <label className="sr" htmlFor="note-search">{t(lang, "search")}</label>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", flex: 1, minWidth: "12rem" }}>
                <Search {...iconProps} size={16} />
                <input id="note-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(lang, "search")} />
              </span>
              <select className="field" value={filterPerson} onChange={(event) => setFilterPerson(event.target.value)} aria-label={t(lang, "people")} style={{ maxWidth: "10rem" }}>
                <option value="all">{t(lang, "filterAll")}</option>
                {run.characters.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            {!notes.length && !note ? (
              <div className="empty-state">
                <p>{t(lang, "emptyNotes")}</p>
                <div className="example">
                  <Bookmark {...iconProps} size={16} /> “She left at 23:42.”
                </div>
              </div>
            ) : (
              <div className="note-list">
                {notes.map((item) => {
                  const speaker = run.characters.find((personItem) => personItem.id === item.personId || personItem.name === item.speaker);
                  return (
                    <article key={item.id} className="note">
                      <div className="note-head">
                        {speaker ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={speaker.portrait} alt="" width={36} height={42} />
                        ) : null}
                        <div>
                          <strong>{speaker?.name ?? item.speaker ?? t(lang, "yourNote")}</strong>
                          {item.pinned ? <span className="chip">{t(lang, "pinned")}</span> : null}
                        </div>
                      </div>
                      {item.quote ? <blockquote>{item.quote}</blockquote> : null}
                      {item.body ? <p className="mine">{item.body}</p> : null}
                      <div className="actions">
                        <button className="text-btn" type="button" onClick={() => setNote(item)}>{lang === "hy" ? "Խմբագրել" : "Edit"}</button>
                        <button
                          className="text-btn"
                          type="button"
                          onClick={() => post({ type: "note_save", note: { ...item, pinned: !item.pinned } })}
                        >
                          {t(lang, "pin")}
                        </button>
                        {item.sourceType === "evidence" && item.sourceId ? (
                          <button className="text-btn" type="button" onClick={() => openEvidence(item.sourceId!)}>{t(lang, "openSource")}</button>
                        ) : null}
                        <button className="text-btn" type="button" onClick={() => post({ type: "note_delete", id: item.id })}>{lang === "hy" ? "Ջնջել" : "Delete"}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {note ? (
              <form
                className="paper doc"
                style={{ marginTop: "1rem" }}
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveNote();
                }}
              >
                <h3>{t(lang, "yourNote")}</h3>
                {note.quote ? <blockquote>{note.quote}</blockquote> : null}
                <textarea className="field" value={note.body} onChange={(event) => setNote({ ...note, body: event.target.value })} placeholder={t(lang, "yourNote")} />
                <label>
                  <input type="checkbox" checked={note.pinned} onChange={(event) => setNote({ ...note, pinned: event.target.checked })} /> {t(lang, "pin")}
                </label>
                <div className="actions">
                  <button className="btn solid" type="submit">{t(lang, "saveNote")}</button>
                  <button className="btn" type="button" onClick={() => setNote(null)}>{t(lang, "cancel")}</button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}

        {dest === "solve" ? (
          <section>
            {run.status === "completed" && run.evaluation ? (
              <article className="paper doc">
                <p className="kicker">{t(lang, "outcome")}</p>
                <h3>{run.evaluation.summary[lang]}</h3>
                <p><strong>{t(lang, "scoreExplain")}: {run.score?.total}</strong></p>
                <p className="quiet">{t(lang, "formula")}</p>
                <ul>{run.score?.items.map((item) => <li key={item.code}>{item.label[lang]}: {item.points}</li>)}</ul>
                <div className="actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      fetch(`/api/share?runId=${run.id}`)
                        .then((response) => response.json())
                        .then((shareCard) => {
                          const share = [shareCard.title, shareCard.difficulty, shareCard.grade, shareCard.score]
                            .filter((item) => item !== null && item !== undefined && item !== "")
                            .join(" · ");
                          return shareText(share, shareCard.url);
                        })
                        .catch(() => undefined);
                    }}
                  >
                    {t(lang, "shareSafe")}
                  </button>
                  <Link className="btn solid" href="/library">{t(lang, "nextCase")}</Link>
                </div>
                {!run.reviewUnlocked ? (
                  <>
                    <p>{t(lang, "spoiler")}</p>
                    <button className="btn danger" type="button" onClick={() => post({ type: "review", confirm: true })}>{t(lang, "review")}</button>
                  </>
                ) : (
                  <pre>{run.reconstruction}</pre>
                )}
              </article>
            ) : (
              <>
                <div className="solve-steps" aria-hidden="true">
                  {[t(lang, "stepConclusion"), t(lang, "stepEvidence"), t(lang, "stepExplain"), t(lang, "stepReview")].map((label, index) => (
                    <span key={label} className={solveStep === index ? "active" : ""}>{label}</span>
                  ))}
                </div>
                <form
                  className="solve-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (solveStep < 3) {
                      setSolveStep((value) => value + 1);
                      return;
                    }
                    const explanation = report.explanation.trim() || (lang === "hy" ? "Տես կցված ապացույցները։" : "See attached evidence.");
                    setConfirm({
                      body: t(lang, "confirmSubmit"),
                      action: { type: "submit", confirm: true, report: { ...report, explanation } },
                    });
                  }}
                >
                  {solveStep === 0 ? (
                    <>
                      <label>
                        {t(lang, "where")}
                        <select className="field" value={report.whereId} onChange={(event) => setReport({ ...report, whereId: event.target.value })}>
                          <option value="unknown">{t(lang, "unknown")}</option>
                          {run.locations.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t(lang, "who")}
                        <select className="field" value={report.responsibleId} onChange={(event) => setReport({ ...report, responsibleId: event.target.value })}>
                          <option value="unknown">{t(lang, "unknown")}</option>
                          <option value="none">{t(lang, "nobody")}</option>
                          {run.characters.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                      {run.completion.type === "rescue" && !run.rescued ? (
                        <p className="quiet">{run.completion.label || t(lang, "openAnnex")}</p>
                      ) : null}
                    </>
                  ) : null}
                  {solveStep === 1 ? (
                    <fieldset className="check-grid" style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend>{t(lang, "support")}</legend>
                      {!run.evidence.length ? <p className="quiet">{t(lang, "emptyEvidence")}</p> : null}
                      {run.evidence.map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={report.evidenceIds.includes(item.id)}
                            onChange={() =>
                              setReport({
                                ...report,
                                evidenceIds: report.evidenceIds.includes(item.id)
                                  ? report.evidenceIds.filter((id) => id !== item.id)
                                  : [...report.evidenceIds, item.id],
                              })
                            }
                          />
                          {item.title}
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                  {solveStep === 2 ? (
                    <label>
                      {t(lang, "explanation")}
                      <textarea
                        className="field"
                        value={report.explanation}
                        onChange={(event) => setReport({ ...report, explanation: event.target.value })}
                        placeholder={t(lang, "explanation")}
                      />
                    </label>
                  ) : null}
                  {solveStep === 3 ? (
                    <div className="banner">
                      <p><strong>{t(lang, "where")}:</strong> {run.locations.find((item) => item.id === report.whereId)?.name ?? t(lang, "unknown")}</p>
                      <p><strong>{t(lang, "who")}:</strong> {report.responsibleId === "none" ? t(lang, "nobody") : run.characters.find((item) => item.id === report.responsibleId)?.name ?? t(lang, "unknown")}</p>
                      <p><strong>{t(lang, "support")}:</strong> {report.evidenceIds.length}</p>
                      {report.explanation ? <p>{report.explanation}</p> : null}
                    </div>
                  ) : null}
                  <div className="actions">
                    {solveStep > 0 ? (
                      <button className="btn" type="button" onClick={() => setSolveStep((value) => value - 1)}>{t(lang, "cancel")}</button>
                    ) : null}
                    <button className="btn solid" type="submit">
                      {solveStep < 3 ? (lang === "hy" ? "Հաջորդ" : "Next") : t(lang, "fileReport")}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        ) : null}
      </main>

      <nav className="mobile-nav" aria-label="Investigation">
        <button type="button" aria-current={dest === "investigate"} onClick={() => goDest("investigate")}>
          <Compass {...iconProps} size={18} />
          {t(lang, "investigate")}
        </button>
        <button type="button" aria-current={dest === "evidence"} onClick={() => goDest("evidence")}>
          <BookOpen {...iconProps} size={18} />
          {t(lang, "evidence")}
        </button>
        <button type="button" aria-current={dest === "notebook"} onClick={() => goDest("notebook")}>
          <NotebookPen {...iconProps} size={18} />
          {t(lang, "notebook")}
        </button>
        <button type="button" aria-current={dest === "solve"} onClick={() => goDest("solve")}>
          <Crosshair {...iconProps} size={18} />
          {t(lang, "solve")}
        </button>
      </nav>

      <button className="help-fab" type="button" aria-label={t(lang, "help")} onClick={() => setHelpOpen(true)}>
        <Lightbulb {...iconProps} />
      </button>

      {guided && tipText && tutorial !== "done" ? (
        <div className="tip" role="status">
          <p>{tipText}</p>
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn solid" type="button" onClick={() => advanceTutorial(tutorial === "compare" ? "done" : tutorial === "evidence" ? "compare" : tutorial === "save" ? "evidence" : tutorial === "ask" ? "save" : "ask")}>
              {t(lang, "dismiss")}
            </button>
            <button className="btn" type="button" onClick={() => setTutorial("done")}>{t(lang, "skipTutorial")}</button>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="modal-back" role="presentation" onClick={() => setHelpOpen(false)}>
          <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="help-title" style={{ margin: 0, fontFamily: "var(--serif)", fontWeight: 500 }}>{t(lang, "help")}</h2>
              <button className="btn icon-only" type="button" aria-label={t(lang, "cancel")} onClick={() => setHelpOpen(false)}>
                <X {...iconProps} />
              </button>
            </div>
            <p><strong>{t(lang, "main")}:</strong> {run.objectives.main}</p>
            {leads.length || run.firstLead ? (
              <p><strong>{t(lang, "lead")}:</strong> {(leads[0] || run.firstLead)}</p>
            ) : (
              <p className="quiet">{t(lang, "exhausted")}</p>
            )}
            <p className="quiet">{t(lang, "helpObjective")}</p>
            <p className="quiet">{t(lang, "helpLeads")}</p>
            <p>
              {dest === "investigate"
                ? t(lang, "helpToolInvestigate")
                : dest === "evidence"
                  ? t(lang, "helpToolEvidence")
                  : dest === "notebook"
                    ? t(lang, "helpToolNotebook")
                    : t(lang, "helpToolSolve")}
            </p>
            <div className="actions">
              <button className="btn" type="button" onClick={() => setGuided((value) => !value)}>
                {guided ? t(lang, "lessGuided") : t(lang, "guided")}
              </button>
              <button className="btn" type="button" onClick={() => { setTutorial("interview"); setHelpOpen(false); }}>
                {t(lang, "replayHelp")}
              </button>
            </div>
            <h3 style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{t(lang, "puzzleHint")}</h3>
            <p className="quiet">{t(lang, "hintCost")}</p>
            <div className="actions">
              {run.hintLadder.map((item) => (
                <button
                  key={item.level}
                  className="btn"
                  type="button"
                  disabled={!item.available || item.taken}
                  onClick={() => {
                    setHelpOpen(false);
                    void post({ type: "hint_preview", level: item.level });
                  }}
                >
                  {item.level}. {item.taken ? "✓" : `−${item.cost}`}
                </button>
              ))}
            </div>
            {run.hints.map((item) => (
              <p key={item.level}>{item.text}</p>
            ))}
            {run.objectives.optional ? (
              <p className="quiet"><strong>{t(lang, "optional")}:</strong> {run.objectives.optional}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirm ? (
        <div className="modal-back center" role="presentation">
          <div className="modal paper" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">{lang === "hy" ? "Հաստատել" : "Confirm"}</h2>
            <p>{confirm.body}</p>
            <div className="actions">
              <button
                className="btn solid"
                type="button"
                onClick={() => {
                  const action = confirm.action;
                  setConfirm(null);
                  void post(action);
                }}
              >
                {lang === "hy" ? "Շարունակել" : "Continue"}
              </button>
              <button className="btn" type="button" onClick={() => setConfirm(null)}>{t(lang, "cancel")}</button>
            </div>
          </div>
        </div>
      ) : null}

      {hint ? (
        <div className="modal-back center" role="presentation">
          <div className="modal paper" role="dialog" aria-modal="true">
            <h2>{t(lang, "hints")} {hint.level}</h2>
            <p>{hint.warning}</p>
            <p className="quiet">{t(lang, "hintCost")} (−{hint.cost})</p>
            <div className="actions">
              <button
                className="btn solid"
                type="button"
                onClick={() => {
                  const level = hint.level;
                  setHint(null);
                  void post({ type: "hint_take", level, confirm: true });
                }}
              >
                {t(lang, "takeHint")}
              </button>
              <button className="btn" type="button" onClick={() => setHint(null)}>{t(lang, "cancel")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
