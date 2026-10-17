import "server-only";
import type { Lang } from "@/lib/types";
import { formatClock, formatDate } from "@/lib/time";
import type { CaseDefinition } from "@/server/cases/types";
import type { Claim, Evidence } from "@/server/cases/types";

export interface CompareView {
  assistance: true;
  disclaimer: string;
  items: { id: string; title: string; kind: string; source: string; body: string }[];
  times: { id: string; label: string; when: string; location: string | null }[];
  amounts: { id: string; label: string; value: string }[];
  identities: { id: string; label: string; hair: string; clothing: string; watch: string }[];
  observations: string[];
}

function travelMinutes(def: CaseDefinition, a: string, b: string): number | null {
  if (a === b) return 0;
  return def.travel[[a, b].sort().join("|")] ?? null;
}

function todOf(claim: Claim): string | null {
  if (claim.tod) return claim.tod;
  if (claim.minute == null) return null;
  return formatClock(claim.minute);
}

function dateOf(claim: Claim): string | null {
  if (claim.date) return claim.date;
  if (claim.minute == null) return null;
  return formatDate(claim.minute);
}

function minutesOfDay(tod: string): number | null {
  const match = tod.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function locationName(def: CaseDefinition, id: string | undefined, lang: Lang): string | null {
  if (!id) return null;
  return def.locations.find((location) => location.id === id)?.name[lang] ?? id;
}

export function compareEvidence(def: CaseDefinition, ids: string[], lang: Lang): CompareView {
  const items = ids
    .map((id) => def.evidence.find((item) => item.id === id))
    .filter((item): item is Evidence => Boolean(item));
  const disclaimer =
    lang === "hy"
      ? "Սա օժանդակություն է։ Այն ցույց է տալիս այն, ինչ գրված է աղբյուրներում։ Այն չի որոշում, թե ով է մեղավոր, և տարբերությունը ինքնին սուտ չէ։"
      : "This is assistance. It shows what the sources write. It does not decide who is responsible, and a difference is not itself a lie.";
  const observations: string[] = [];
  const claims = items.flatMap((item) => item.claims ?? []);

  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i];
      const b = claims[j];
      const aDate = dateOf(a);
      const bDate = dateOf(b);
      const aTod = todOf(a);
      const bTod = todOf(b);
      if (aDate && bDate && aDate !== bDate) {
        observations.push(
          lang === "hy"
            ? `Ամսաթվերը տարբեր են․ մեկ աղբյուրում ${aDate} է, մյուսում՝ ${bDate}։`
            : `The dates differ: one source has ${aDate}; the other has ${bDate}.`,
        );
      }
      if (aTod && bTod && aTod !== bTod) {
        observations.push(
          lang === "hy"
            ? `Ժամերը տարբեր են․ մեկ աղբյուրում ${aTod} է, մյուսում՝ ${bTod}։`
            : `The clock times differ: one source has ${aTod}; the other has ${bTod}.`,
        );
      }
      const aLoc = a.locationId;
      const bLoc = b.locationId;
      const aMin = aTod ? minutesOfDay(aTod) : null;
      const bMin = bTod ? minutesOfDay(bTod) : null;
      if (aLoc && bLoc && aMin != null && bMin != null && aLoc !== bLoc) {
        const minimum = travelMinutes(def, aLoc, bLoc);
        if (minimum != null) {
          let gap = Math.abs(aMin - bMin);
          if (gap > 12 * 60) gap = 24 * 60 - gap;
          const sameNight = !aDate || !bDate || aDate === bDate;
          const feasible = gap >= minimum;
          const placeA = locationName(def, aLoc, lang);
          const placeB = locationName(def, bLoc, lang);
          if (!sameNight) {
            observations.push(
              lang === "hy"
                ? `Սրանք նույն գիշերվա գրառումներ չեն։ Եթե ${aTod} և ${bTod} ժամերը նույն գիշերն լինեին, ${placeA}–${placeB} ճանապարհի ${gap} րոպեն կհամեմատվեր հեղինակված նվազագույն ${minimum} րոպեի հետ։`
                : `These are not records of the same night. If ${aTod} and ${bTod} were the same night, the ${gap}-minute gap between ${placeA} and ${placeB} would be compared with the authored minimum of ${minimum} minutes.`,
            );
          } else if (!feasible) {
            observations.push(
              lang === "hy"
                ? `${placeA}–${placeB} միջև ${gap} րոպե կա։ Հեղինակված նվազագույնը ${minimum} րոպե է։ Այս զույգը, ինչպես գրված է, տեղավորվում չի։`
                : `There are ${gap} minutes between ${placeA} and ${placeB}. The authored minimum is ${minimum} minutes. This pair, as written, does not fit.`,
            );
          } else {
            observations.push(
              lang === "hy"
                ? `${placeA}–${placeB} միջև ${gap} րոպե կա։ Հեղինակված նվազագույնը ${minimum} րոպե է։ Ժամանակը, ինքնին, բավարար է։`
                : `There are ${gap} minutes between ${placeA} and ${placeB}. The authored minimum is ${minimum} minutes. The time, by itself, is enough.`,
            );
          }
        }
      }
    }
  }

  const calibration = items.some((item) => item.id === "reader-cabinet");
  const drift = items.some((item) => item.id === "drift-memo");
  if (calibration && drift) {
    observations.push(
      lang === "hy"
        ? "Ստորագրություն չունեցող նշումը պնդում է, որ ժամացույցը շեղվել է։ Ստուգաչափման գրառումը հայտնում է 0 րոպե։ Այս գործիքը դրանց միջև չի ընտրում։"
        : "An unsigned note asserts that the clock drifted. The calibration record reports 0 minutes. This tool does not choose between them.",
    );
  }

  const amounts = items.flatMap((item) =>
    (item.amounts ?? []).map((amount) => ({
      id: `${item.id}:${amount.id}`,
      label: `${item.title[lang]} — ${amount.label[lang]}`,
      value: `${amount.value} ${amount.unit}`,
    })),
  );
  const values = items.flatMap((item) => item.amounts ?? []);
  const uniqueValues = new Set(values.map((amount) => amount.value));
  if (uniqueValues.size > 1) {
    observations.push(
      lang === "hy"
        ? `Գումարները տարբեր են․ ${[...uniqueValues].join(", ")}։`
        : `The amounts differ: ${[...uniqueValues].join(", ")}.`,
    );
  }

  const identities = items
    .filter((item) => item.identity)
    .map((item) => ({
      id: item.id,
      label: item.identity!.label[lang],
      hair: item.identity!.hair?.[lang] ?? "—",
      clothing: item.identity!.clothing?.[lang] ?? "—",
      watch: item.identity!.watch?.[lang] ?? "—",
    }));
  if (identities.length >= 2) {
    const hairs = new Set(identities.map((item) => item.hair));
    if (hairs.size > 1) {
      observations.push(
        lang === "hy"
          ? "Մազերի նկարագրությունները չեն համընկնում։ Սա նույնականացում չէ։"
          : "The hair descriptions do not match. This is not an identification.",
      );
    }
  }

  return {
    assistance: true,
    disclaimer,
    items: items.map((item) => ({
      id: item.id,
      title: item.title[lang],
      kind: item.kind,
      source: item.source[lang],
      body: item.body[lang],
    })),
    times: claims.map((claim) => ({
      id: claim.id,
      label: claim.text[lang],
      when: [dateOf(claim), todOf(claim), claim.uncertain ? (lang === "hy" ? "մոտավոր" : "uncertain") : null]
        .filter(Boolean)
        .join(" · "),
      location: locationName(def, claim.locationId, lang),
    })),
    amounts,
    identities,
    observations: [...new Set(observations)],
  };
}
