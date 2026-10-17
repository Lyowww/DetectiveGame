import "server-only";
import type { L10n } from "@/lib/types";
import type { CaseDefinition, Evidence } from "@/server/cases/types";

export const L = (en: string, hy: string): L10n => ({ en, hy });

export function firstLine(text: string): string {
  const line = text.split(/\n/).map((part) => part.trim()).find(Boolean) ?? text.trim();
  if (line.length <= 120) return line;
  return `${line.slice(0, 117).trimEnd()}…`;
}

export function evidenceSummary(item: Evidence, lang: "en" | "hy"): string {
  if (item.summary) return item.summary[lang];
  return firstLine(item.body[lang]);
}

export function normalizeCase(def: CaseDefinition): CaseDefinition {
  const durationMinutes = def.durationMinutes ?? { min: 20, max: 35 };
  return {
    ...def,
    durationMinutes,
    coverImage: def.coverImage ?? `/covers/${def.id}.jpg`,
    status: def.status ?? "playable",
    startLocationId: def.startLocationId ?? def.locations.find((place) => place.visitable)?.id ?? "lobby",
    decisiveEvidence: def.decisiveEvidence ?? def.strongEvidence.slice(0, 4),
    completion:
      def.completion ??
      ({
        type: "rescue",
        locationId: def.whereId,
        actionLabel: L("Open the door", "Բացել դուռը"),
      } as const),
    evaluation: def.evaluation ?? {
      whereWords: [def.whereId],
      personWords: Object.fromEntries(def.characters.map((person) => [person.id, person.aliases ?? [person.id]])),
      wrongAccusations: def.characters.map((person) => person.id).filter((id) => id !== def.culpritId).slice(0, 3),
    },
    characters: def.characters.map((person) => ({
      ...person,
      portrait: person.portrait ?? `/portraits/${person.id}.jpg`,
      relationship: person.relationship ?? person.presence,
      aliases: person.aliases?.length
        ? person.aliases
        : [person.name.en, person.name.hy, person.id].filter(Boolean),
    })),
    evidence: def.evidence.map((item) => ({
      ...item,
      summary: item.summary ?? { en: firstLine(item.body.en), hy: firstLine(item.body.hy) },
    })),
  };
}
