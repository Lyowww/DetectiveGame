import "server-only";
import { clockOn } from "@/lib/time";
import { buildCompactCase, E, T } from "@/server/cases/compact";
import { L } from "@/server/cases/helpers";

const at = (day: 16 | 17, hhmm: string) => clockOn(day, hhmm);

export const wetAsphalt = buildCompactCase({
  id: "wet-asphalt",
  title: ["Wet Asphalt", "Թաց ասֆալտ"],
  genre: ["Staged accident", "Բեմադրված վթար"],
  duration: ["20–32 minutes", "20–32 րոպե"],
  durationMinutes: { min: 20, max: 32 },
  teaser: ["A courier van hits a railing. The skid marks start too late.", "Սուրհանդակի ֆուրգոնը խփում է ճաղավանդակին։ Սահքի հետքերը սկսվում են ուշ։"],
  briefing: ["Van V-19 left the road at Curve 4. Driver claims brake failure. Find whether the crash was staged and who benefited.", "V-19 ֆուրգոնը դուրս է եկել Curve 4-ում։ Վարորդը պնդում է արգելակի խափանում։ Պարզեք՝ վթարը բեմադրվա՞ծ էր և ով է շահել։"],
  coverImage: "/covers/wet-asphalt.jpg",
  main: ["Prove the crash was staged and name who staged it.", "Ապացուցել բեմադրությունը և անվանել բեմադրողին։"],
  optional: ["Recover the swapped ABS fuse.", "Վերադարձնել փոխված ABS ապահովիչը։"],
  start: { day: 17, time: "08:40" },
  deadline: { day: 17, time: "14:00" },
  startLocationId: "curve",
  places: [
    {
      id: "curve",
      name: ["Curve 4", "Curve 4"],
      blurb: ["Railing scar and wet marks.", "Ճաղավանդակի հետք և թաց նշաններ։"],
      characters: ["dale"],
      regions: [
        { id: "skid", label: ["Skid path", "Սահքի ուղի"], summary: ["Marks begin after the apex.", "Հետքերը սկսվում են գագաթից հետո։"] },
        { id: "rail", label: ["Railing", "Ճաղավանդակ"], summary: ["Paint transfer from V-19.", "V-19-ի ներկի փոխանցում։"] },
      ],
      records: [{ id: "tow", label: ["Tow report", "Քարշակի զեկույց"], detail: ["Vehicle intake.", "Մեքենայի ընդունում։"] }],
    },
    {
      id: "yard",
      name: ["Impound yard", "Կալանքի հրապարակ"],
      blurb: ["Van V-19 on blocks.", "V-19 ֆուրգոնը հենարանների վրա։"],
      characters: ["mia", "gus"],
      regions: [
        { id: "fusebox", label: ["Fuse box", "Ապահովիչների տուփ"], summary: ["ABS slot holds a blank.", "ABS տեղում դատարկ է։"] },
        { id: "cabin", label: ["Cabin floor", "Խցիկի հատակ"], summary: ["Insurance claim draft.", "Ապահովագրության հայտի սևագիր։"] },
      ],
    },
  ],
  cast: [
    { id: "dale", name: ["Dale Orth", "Դեյլ Օրթ"], role: ["Driver", "Վարորդ"], presence: ["At the curve.", "Curve-ի մոտ։"], relationship: ["Drove V-19.", "Վարել է V-19-ը։"], portrait: "/portraits/a5.jpg", locationId: "curve", voice: "ash", aliases: ["dale", "orth", "դեյլ", "օրթ"], speechStyle: "Shaky.", suggestions: [["When did brakes fail?", "Ե՞րբ խափանվեցին արգելակները։"]] },
    { id: "mia", name: ["Mia Trent", "Միա Թրենթ"], role: ["Fleet manager", "Ավտոպարկի կառավարիչ"], presence: ["At the yard gate.", "Հրապարակի դարպասի մոտ։"], relationship: ["Owns the insurance file.", "Տիրապետում է ապահովագրության գործին։"], portrait: "/portraits/a6.jpg", locationId: "yard", voice: "verse", aliases: ["mia", "trent", "միա", "թրենթ"], speechStyle: "Controlled.", suggestions: [["Ask about the claim amount.", "Հարցրու հայտի գումարի մասին։"]] },
    { id: "gus", name: ["Gus Pell", "Գաս Փել"], role: ["Mechanic", "Մեխանիկ"], presence: ["Under the van.", "Ֆուրգոնի տակ։"], relationship: ["Last service stamp.", "Վերջին սպասարկման դրոշմ։"], portrait: "/portraits/a9.jpg", locationId: "yard", voice: "sage", aliases: ["gus", "pell", "գաս", "փել"], speechStyle: "Laconic.", suggestions: [["Check the ABS fuse.", "Ստուգիր ABS ապահովիչը։"]] },
  ],
  evidence: [
    E({ id: "open", type: "document", title: L("Crash intake", "Վթարի ընդունում"), source: L("Road desk", "Ճանապարհի սեղան"), acquired: L("Opening.", "Բացում։"), minute: at(17, "08:30"), discover: { type: "start" }, people: ["dale"], summary: L("V-19 into railing. Driver cites brakes.", "V-19՝ ճաղավանդակին։ Վարորդը մատնանշում է արգելակները։"), body: L("Curve 4 · 06:12 · V-19 · driver Dale Orth · claimed brake failure.", "Curve 4 · 06:12 · V-19 · վարորդ Դեյլ Օրթ · պնդում է արգելակի խափանում։") }),
    E({ id: "stmt-dale", type: "statement", kind: "claim", title: L("Dale account", "Դեյլի պատմություն"), source: L("Curve", "Curve"), acquired: L("Told.", "Ասված։"), minute: at(17, "08:45"), people: ["dale"], discover: { type: "start" }, summary: L("Pedal went soft before the turn.", "Ոտնակը փափուկ եղավ շրջադարձից առաջ։"), body: L("\"Pedal went soft before the apex. I did everything right.\"", "«Ոտնակը փափուկ եղավ գագաթից առաջ։ Ես ամեն ինչ ճիշտ արեցի։»"), claims: [{ id: "dale-soft", speakerId: "dale", kind: "claim", minute: at(17, "06:12"), text: L("Dale says brakes failed before the apex.", "Դեյլն ասում է՝ արգելակները խափանվել են գագաթից առաջ։") }] }),
    E({ id: "skid", type: "photo", title: L("Skid photo", "Սահքի լուսանկար"), source: L("Curve inspect", "Curve զննում"), acquired: L("Inspect skid path.", "Զննել սահքի ուղին։"), minute: at(17, "06:12"), people: [], discover: { type: "inspect", locationId: "curve", regionId: "skid" }, summary: L("Marks start after apex — late for a failure claim.", "Հետքերը սկսվում են գագաթից հետո՝ ուշ խափանման պնդման համար։"), body: L("Skid onset 8 m past apex. Dry approach. Inconsistent with early soft pedal.", "Սահքի սկիզբը գագաթից 8 մ հետո։ Չոր մոտեցում։ Հակասում է վաղ փափուկ ոտնակին։") }),
    E({ id: "tow", type: "document", title: L("Tow report", "Քարշակի զեկույց"), source: L("Tow desk", "Քարշակի սեղան"), acquired: L("Requested.", "Խնդրված։"), minute: at(17, "06:40"), people: ["gus"], discover: { type: "record", recordId: "tow" }, summary: L("Gus signed intake before Mia arrived.", "Գասը ստորագրել է ընդունումը Միայից առաջ։"), body: L("06:40 tow intake · mechanic G. Pell · fleet manager later 07:10.", "06:40 քարշակի ընդունում · մեխանիկ Գ. Փել · ավտոպարկի կառավարիչը հետո՝ 07:10։") }),
    E({ id: "fuse", type: "object", title: L("Blank ABS fuse", "Դատարկ ABS ապահովիչ"), source: L("Fuse box", "Ապահովիչների տուփ"), acquired: L("Inspect.", "Զննում։"), minute: null, people: ["gus"], discover: { type: "inspect", locationId: "yard", regionId: "fusebox" }, summary: L("ABS slot empty; live fuse in Gus's pocket tray.", "ABS տեղը դատարկ է. աշխատող ապահովիչը Գասի սկուտեղում է։"), body: L("ABS fuse removed. Labeled spare found in Pell tray with grease date 16 Oct evening.", "ABS ապահովիչը հանված է։ Պիտակված պահեստայինը Փելի սկուտեղում է՝ ճարպի ամսաթիվ հոկտ. 16 երեկո։") }),
    E({ id: "claim", type: "document", title: L("Insurance draft", "Ապահովագրության սևագիր"), source: L("Cabin floor", "Խցիկի հատակ"), acquired: L("Inspect cabin.", "Զննել խցիկը։"), minute: at(16, "21:00"), people: ["mia"], discover: { type: "inspect", locationId: "yard", regionId: "cabin" }, summary: L("Total-loss claim drafted the night before.", "Ամբողջական կորստի հայտը գրվել է նախորդ գիշեր։"), body: L("Draft claim V-19 total loss · dated 16 Oct 21:00 · signed M. Trent · crash not yet occurred.", "Սևագիր հայտ V-19 ամբողջական կորուստ · ամսաթիվ հոկտ. 16, 21:00 · ստորագրված Մ. Թրենթ · վթարը դեռ չէր եղել։") }),
    E({ id: "payoff", type: "transaction", title: L("Side payment", "Կողմնակի վճարում"), source: L("When fuse and claim meet", "Երբ ապահովիչն ու հայտը համընկնում են"), acquired: L("Combined find.", "Միացված գտածո։"), minute: at(16, "21:30"), people: ["gus", "mia"], discover: { type: "when", allOf: ["fuse", "claim"] }, summary: L("Mia paid Gus 2,000 the night before.", "Միան Գասին վճարել է 2,000 նախորդ գիշեր։"), amounts: [{ id: "p1", label: L("Transfer", "Փոխանցում"), value: 2000, unit: "AMD" }], body: L("21:30 Mia Trent → Gus Pell 2,000 · memo \"service\".", "21:30 Միա Թրենթ → Գաս Փել 2,000 · նշում «սպասարկում»։") }),
  ],
  topics: [
    T({ id: "dale-greet", characterId: "dale", phrases: { en: ["brake", "soft", "crash"], hy: ["արգելակ", "փափուկ", "վթար"] }, response: L("Pedal went soft before the apex. I did everything right.", "Ոտնակը փափուկ եղավ գագաթից առաջ։ Ես ամեն ինչ ճիշտ արեցի։"), lie: false }),
    T({ id: "mia-greet", characterId: "mia", phrases: { en: ["claim", "van"], hy: ["հայտ", "ֆուրգոն"] }, response: L("We file claims after crashes. Not before.", "Հայտերը լրացնում ենք վթարից հետո։ Ոչ առաջ։"), lie: true }),
    T({ id: "gus-greet", characterId: "gus", phrases: { en: ["fuse", "service"], hy: ["ապահովիչ", "սպասարկում"] }, response: L("Routine service. Nothing removed.", "Սովորական սպասարկում։ Ոչինչ չի հանվել։"), lie: true }),
    T({ id: "mia-confront", characterId: "mia", phrases: { en: ["draft", "2000", "before", "staged"], hy: ["սևագիր", "2000", "առաջ", "բեմադր"] }, evidence: ["claim", "payoff", "skid"], response: L("The van was worthless on paper. Gus pulled the fuse. I stop talking.", "Ֆուրգոնը թղթի վրա անարժեք էր։ Գասը հանեց ապահովիչը։ Այլևս չեմ խոսում։"), setsDisclosure: ["mia-shutdown"], lie: false }),
    T({ id: "gus-confront", characterId: "gus", phrases: { en: ["fuse", "tray", "pay"], hy: ["ապահովիչ", "սկուտեղ", "վճար"] }, evidence: ["fuse", "payoff"], response: L("Mia paid me. I pulled the ABS fuse after hours.", "Միան վճարեց։ Աշխատանքից հետո հանեցի ABS ապահովիչը։"), lie: false }),
  ],
  travel: { "curve|yard": 12 },
  hints: [
    { level: 1, cost: 25, text: ["Skid marks start too late for Dale's story.", "Սահքի հետքերը չափից ուշ են Դեյլի պատմության համար։"] },
    { level: 2, cost: 50, text: ["A claim draft is dated before the crash.", "Հայտի սևագիրը վթարից առաջ է թվագրված։"] },
    { level: 3, cost: 90, text: ["Mia paid Gus to pull the ABS fuse.", "Միան վճարել է Գասին՝ ABS ապահովիչը հանելու համար։"] },
  ],
  strongEvidence: ["skid", "fuse", "claim", "payoff"],
  optionalEvidence: ["tow"],
  decisiveEvidence: ["claim", "payoff", "skid"],
  culpritId: "mia",
  whereId: "yard",
  contradictionPair: ["stmt-dale", "skid"],
  criticalClues: [
    { id: "late-skid", paths: [["skid"], ["stmt-dale"]] },
    { id: "pre-claim", paths: [["claim"], ["payoff"]] },
  ],
  reconstruction: ["Mia drafted a total-loss claim the night before. Gus removed the ABS fuse for a side payment. Dale hit the rail with no early skid.", "Միան նախորդ գիշեր գրել է ամբողջական կորստի հայտ։ Գասը կողմնակի վճարմամբ հանել է ABS ապահովիչը։ Դեյլը խփել է ճաղավանդակին առանց վաղ սահքի։"],
  completion: { type: "report" },
  evaluation: {
    whereWords: ["yard", "fuse", "van", "հրապարակ", "ապահովիչ", "ֆուրգոն"],
    personWords: { mia: ["mia", "trent", "միա", "թրենթ"], gus: ["gus", "pell", "գաս", "փել"], dale: ["dale", "orth", "դեյլ", "օրթ"] },
    wrongAccusations: ["dale", "gus"],
  },
});
