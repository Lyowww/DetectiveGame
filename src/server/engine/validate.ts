import "server-only";
import { SECRET_CANARY } from "@/server/cases/secret";
import { playableCases } from "@/server/cases/catalog";
import type { CaseDefinition } from "@/server/cases/types";

export interface ValidationReport {
  ok: boolean;
  errors: string[];
}

function stringsOf(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsOf(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => stringsOf(item, out));
}

export function reachableEvidence(def: CaseDefinition): Set<string> {
  const got = new Set(
    def.evidence
      .filter((item) => item.discover.type === "start" || item.discover.type === "start-hard" || item.alsoStart?.length)
      .map((item) => item.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    const add = (id: string) => {
      if (!got.has(id)) {
        got.add(id);
        changed = true;
      }
    };
    for (const item of def.evidence) {
      if (got.has(item.id)) continue;
      if (item.discover.type === "inspect" || item.discover.type === "rescued") add(item.id);
      if (item.discover.type === "record") {
        const needs = item.discover.requiresEvidence ?? [];
        if (needs.every((id) => got.has(id))) add(item.id);
      }
      if (item.discover.type === "when" && item.discover.allOf.every((id) => got.has(id))) add(item.id);
      if (item.discover.type === "topic") {
        const topicId = item.discover.topicId;
        const topic = def.topics.find((entry) => entry.id === topicId);
        if (topic && (topic.requiresEvidence ?? []).every((id) => got.has(id))) add(item.id);
      }
    }
    for (const topic of def.topics) {
      if ((topic.requiresEvidence ?? []).every((id) => got.has(id))) {
        for (const id of topic.reveals ?? []) add(id);
      }
    }
  }
  return got;
}

export function validateCase(def: CaseDefinition): ValidationReport {
  const errors: string[] = [];
  const ids = new Set(def.evidence.map((item) => item.id));
  if (ids.size !== def.evidence.length) errors.push("Duplicate evidence ids.");
  const texts: string[] = [];
  stringsOf(def, texts);
  if (texts.some((text) => text.includes(SECRET_CANARY))) errors.push("Authoring canary leaked into the case package.");
  for (const topic of def.topics) {
    for (const id of topic.reveals ?? []) if (!ids.has(id)) errors.push(`Topic ${topic.id} reveals missing evidence ${id}.`);
    if (!def.characters.some((person) => person.id === topic.characterId)) errors.push(`Topic ${topic.id} has no character.`);
  }
  const visiting = new Set<string>();
  const cycles = (id: string) => {
    if (visiting.has(id)) {
      errors.push(`Circular evidence requirement at ${id}.`);
      return;
    }
    visiting.add(id);
    const item = def.evidence.find((entry) => entry.id === id);
    if (item?.discover.type === "when") item.discover.allOf.forEach(cycles);
    if (item?.discover.type === "record") item.discover.requiresEvidence?.forEach(cycles);
    visiting.delete(id);
  };
  for (const item of def.evidence) cycles(item.id);

  const reach = reachableEvidence(def);
  for (const id of [...def.strongEvidence, ...def.optionalEvidence]) {
    if (!reach.has(id)) errors.push(`Required evidence is unreachable: ${id}.`);
  }
  if (def.criticalClues.filter((clue) => clue.paths.length > 1).length < 1) {
    errors.push("The case needs at least one multi-path critical clue.");
  }
  for (const clue of def.criticalClues) {
    for (const path of clue.paths) {
      for (const id of path) if (!reach.has(id)) errors.push(`Critical clue ${clue.id} uses unreachable ${id}.`);
    }
  }
  if (!def.characters.some((person) => person.id === def.culpritId)) errors.push("Culprit is not in the cast.");
  if (!def.locations.some((place) => place.id === def.whereId)) errors.push("whereId is not a location.");
  return { ok: errors.length === 0, errors };
}

export function validateCatalog(): ValidationReport {
  const errors: string[] = [];
  for (const def of playableCases()) {
    const report = validateCase(def);
    for (const error of report.errors) errors.push(`${def.id}: ${error}`);
  }
  return { ok: errors.length === 0, errors };
}
