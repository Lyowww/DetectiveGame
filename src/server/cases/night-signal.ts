import "server-only";
import { clockOn } from "@/lib/time";
import { buildCompactCase, E, T } from "@/server/cases/compact";
import { L } from "@/server/cases/helpers";

const at = (day: 16 | 17, hhmm: string) => clockOn(day, hhmm);

export const nightSignal = buildCompactCase({
  id: "night-signal",
  title: ["Night Signal", "Գիշերային ազդանշան"],
  genre: ["Sabotage", "Սաբոտաժ"],
  duration: ["15–25 minutes", "15–25 րոպե"],
  durationMinutes: { min: 15, max: 25 },
  teaser: ["A radio beacon fails before a coastal drill. Someone cut the feed on purpose.", "Ռադիոփարոսը անջատվում է ափամերձ վարժանքից առաջ։ Կերակրումը կտրվել է միտումնավոր։"],
  briefing: ["Beacon B-7 went dark at 03:12. The drill needs it live by 11:00. Find who cut the feed and restore the path.", "B-7 փարոսը մարել է 03:12-ին։ Վարժանքին պետք է մինչև 11:00։ Գտեք՝ ով է կտրել կերակրումը, և վերականգնեք ուղին։"],
  coverImage: "/covers/night-signal.jpg",
  main: ["Identify who sabotaged beacon B-7.", "Բացահայտել՝ ով է սաբոտաժել B-7 փարոսը։"],
  optional: ["Recover the bypass cable.", "Վերադարձնել շրջանցման մալուխը։"],
  start: { day: 17, time: "08:20" },
  deadline: { day: 17, time: "11:00" },
  startLocationId: "tower",
  places: [
    {
      id: "tower",
      name: ["Signal tower", "Ազդանշանի աշտարակ"],
      blurb: ["Rack room and duty desk.", "Հենասյան սենյակ և հերթապահ սեղան։"],
      characters: ["nils", "vera"],
      regions: [
        { id: "rack", label: ["Feed rack", "Կերակրման հենասյուն"], summary: ["Main pair cut clean.", "Հիմնական զույգը մաքուր կտրված է։"] },
        { id: "locker", label: ["Tool locker", "Գործիքների պահարան"], summary: ["Cable cutters missing from hook 3.", "Մալուխի մկրատը բացակայում է 3-րդ կեռից։"] },
      ],
      records: [{ id: "duty", label: ["Duty log", "Հերթապահության մատյան"], detail: ["Overnight shifts.", "Գիշերային հերթափոխեր։"] }],
    },
    {
      id: "shed",
      name: ["Shore shed", "Ափի շինություն"],
      blurb: ["Spare gear and dinghies.", "Պահեստային սարք և նավակներ։"],
      characters: ["otto"],
      regions: [{ id: "bin", label: ["Scrap bin", "Ջարդոնի արկղ"], summary: ["A labeled bypass cable under netting.", "Պիտակված շրջանցման մալուխ ցանցի տակ։"] }],
    },
  ],
  cast: [
    { id: "nils", name: ["Nils Berg", "Նիլս Բերգ"], role: ["Duty tech", "Հերթապահ տեխնիկ"], presence: ["At the rack.", "Հենասյան մոտ։"], relationship: ["On shift until 04:00.", "Հերթափոխ մինչև 04:00։"], portrait: "/portraits/a9.jpg", locationId: "tower", voice: "ash", aliases: ["nils", "berg", "նիլս", "բերգ"], speechStyle: "Flat.", suggestions: [["When did the feed die?", "Ե՞րբ մարեց կերակրումը։"]] },
    { id: "vera", name: ["Vera Holm", "Վերա Հոլմ"], role: ["Supervisor", "Վերահսկող"], presence: ["Duty desk.", "Հերթապահ սեղան։"], relationship: ["Signed the night roster.", "Ստորագրել է գիշերային ցուցակը։"], portrait: "/portraits/a10.jpg", locationId: "tower", voice: "verse", aliases: ["vera", "holm", "վերա", "հոլմ"], speechStyle: "Brisk.", suggestions: [["Who had locker access?", "Ո՞վ ուներ պահարանի մուտք։"]] },
    { id: "otto", name: ["Otto Crane", "Օտտո Կրեյն"], role: ["Contractor", "Կապալառու"], presence: ["By the shed.", "Շինության մոտ։"], relationship: ["Scheduled for morning install.", "Նախատեսված էր առավոտյան տեղադրում։"], portrait: "/portraits/a5.jpg", locationId: "shed", voice: "sage", aliases: ["otto", "crane", "օտտո", "կրեյն"], speechStyle: "Casual.", suggestions: [["Ask about the scrap bin.", "Հարցրու ջարդոնի արկղի մասին։"]] },
  ],
  evidence: [
    E({ id: "open", type: "document", title: L("Beacon outage", "Փարոսի անջատում"), source: L("Desk", "Սեղան"), acquired: L("Opening file.", "Բացման գործ։"), minute: at(17, "08:15"), discover: { type: "start" }, people: ["nils"], summary: L("B-7 dark at 03:12.", "B-7-ը մարել է 03:12-ին։"), body: L("Beacon B-7 · feed loss 03:12 · drill deadline 11:00.", "Փարոս B-7 · կերակրման կորուստ 03:12 · վարժանքի ժամկետ 11:00։") }),
    E({ id: "stmt-nils", type: "statement", kind: "claim", title: L("Nils account", "Նիլսի պատմություն"), source: L("Tower", "Աշտարակ"), acquired: L("Volunteered.", "Ինքնակամ։"), minute: at(17, "08:22"), people: ["nils"], discover: { type: "start" }, summary: L("He blames a storm surge.", "Մեղադրում է փոթորկի ալիքը։"), body: L("\"Surge hit the shore line. Not sabotage.\"", "«Ալիքը խփել է ափի գիծը։ Սաբոտաժ չէ։»"), claims: [{ id: "nils-surge", speakerId: "nils", kind: "claim", minute: at(16, "03:12"), text: L("Nils says a surge cut the feed.", "Նիլսն ասում է՝ ալիքը կտրել է կերակրումը։") }] }),
    E({ id: "duty-log", type: "document", title: L("Duty log", "Հերթապահության մատյան"), source: L("Desk terminal", "Սեղանի տերմինալ"), acquired: L("Requested.", "Խնդրված։"), minute: at(16, "03:00"), people: ["nils", "otto"], discover: { type: "record", recordId: "duty" }, summary: L("Otto visitor badge 02:50–03:20.", "Օտտոյի այցելուի քարտ 02:50–03:20։"), body: L("02:50 Otto Crane visitor IN\n03:20 Otto Crane OUT\nNils Berg on duty whole night.", "02:50 Օտտո Կրեյն մուտք\n03:20 ելք\nՆիլս Բերգ՝ ամբողջ գիշեր։") }),
    E({ id: "cut-pair", type: "object", title: L("Cut feed pair", "Կտրված կերակրման զույգ"), source: L("Rack", "Հենասյուն"), acquired: L("Inspect.", "Զննում։"), minute: at(16, "03:12"), people: [], discover: { type: "inspect", locationId: "tower", regionId: "rack" }, summary: L("Clean shear cut, not storm fray.", "Մաքուր կտրվածք, ոչ փոթորկի մաշվածություն։"), body: L("Main pair severed with shears. No water marks on the jacket.", "Հիմնական զույգը կտրված է մկրատով։ Բաճկոնի վրա ջրի հետք չկա։") }),
    E({ id: "missing-shears", type: "object", title: L("Missing cutters", "Բացակայող մկրատ"), source: L("Tool locker", "Գործիքների պահարան"), acquired: L("Inspect.", "Զննում։"), minute: null, people: ["nils"], discover: { type: "inspect", locationId: "tower", regionId: "locker" }, summary: L("Hook 3 empty. Tag says NILS.", "3-րդ կեռը դատարկ է։ Պիտակ՝ NILS։"), body: L("Cable cutters assigned to Nils Berg missing from hook 3.", "Նիլս Բերգին կցված մալուխի մկրատը բացակայում է 3-րդ կեռից։") }),
    E({ id: "bypass", type: "object", title: L("Hidden bypass cable", "Թաքցված շրջանցման մալուխ"), source: L("Shore shed", "Ափի շինություն"), acquired: L("Inspect scrap bin.", "Զննել ջարդոնի արկղը։"), minute: at(16, "03:18"), people: ["otto"], discover: { type: "inspect", locationId: "shed", regionId: "bin" }, summary: L("B-7 bypass under netting, Otto's mark.", "B-7 շրջանցում ցանցի տակ՝ Օտտոյի նշանով։"), body: L("Bypass cable labeled B-7 · grease mark matches Otto's gloves.", "Շրջանցման մալուխ B-7 · ճարպի հետքը համընկնում է Օտտոյի ձեռնոցներին։") }),
    E({ id: "nils-revise", type: "statement", kind: "claim", title: L("Nils revises", "Նիլսը ուղղում է"), source: L("After cutters shown", "Մկրատը ցույց տալուց հետո"), acquired: L("Interview.", "Հարցազրույց։"), minute: at(17, "08:40"), people: ["nils"], discover: { type: "topic", topicId: "nils-tools" }, summary: L("He lent cutters to Otto.", "Մկրատը տվել է Օտտոյին։"), body: L("\"Otto borrowed the cutters. I stayed at the desk.\"", "«Օտտոն վերցրեց մկրատը։ Ես մնացի սեղանի մոտ։»") }),
  ],
  topics: [
    T({ id: "nils-greet", characterId: "nils", phrases: { en: ["hello", "beacon", "surge"], hy: ["բարև", "փարոս", "ալիք"] }, response: L("Surge hit the shore line. Not sabotage.", "Ալիքը խփել է ափի գիծը։ Սաբոտաժ չէ։"), lie: true }),
    T({ id: "nils-tools", characterId: "nils", phrases: { en: ["cutters", "locker", "tool"], hy: ["մկրատ", "պահարան", "գործիք"] }, evidence: ["missing-shears"], response: L("Otto borrowed the cutters. I stayed at the desk.", "Օտտոն վերցրեց մկրատը։ Ես մնացի սեղանի մոտ։"), reveals: ["nils-revise"], lie: false }),
    T({ id: "vera-greet", characterId: "vera", phrases: { en: ["roster", "night"], hy: ["ցուցակ", "գիշեր"] }, response: L("Otto signed in as a visitor after midnight. That was unusual.", "Օտտոն կեսգիշերից հետո մտել է որպես այցելու։ Դա անսովոր էր։"), lie: false }),
    T({ id: "otto-greet", characterId: "otto", phrases: { en: ["hello", "shed"], hy: ["բարև", "շինություն"] }, response: L("I checked gear for morning. Nothing else.", "Ստուգեցի առավոտվա սարքը։ Ուրիշ բան չկա։"), lie: true }),
    T({ id: "otto-confront", characterId: "otto", phrases: { en: ["bypass", "cable", "03:12", "cut"], hy: ["շրջանցում", "մալուխ", "03:12", "կտրել"] }, evidence: ["bypass", "duty-log", "cut-pair"], response: L("I cut the feed. A rival paid for a dark drill hour. Counsel.", "Կերակրումը կտրեցի։ Մրցակիցը վճարել էր մութ վարժանքի ժամի համար։ Փաստաբան։"), setsDisclosure: ["otto-shutdown"], lie: false }),
  ],
  travel: { "shed|tower": 5 },
  hints: [
    { level: 1, cost: 20, text: ["The cut is clean. Check the tool locker.", "Կտրվածքը մաքուր է։ Ստուգեք գործիքների պահարանը։"] },
    { level: 2, cost: 45, text: ["Visitor time overlaps the outage.", "Այցելուի ժամը համընկնում է անջատման հետ։"] },
    { level: 3, cost: 80, text: ["Otto cut B-7 and hid the bypass in the shed.", "Օտտոն կտրել է B-7-ը և շրջանցումը թաքցրել շինությունում։"] },
  ],
  strongEvidence: ["cut-pair", "duty-log", "bypass", "missing-shears"],
  optionalEvidence: ["nils-revise"],
  decisiveEvidence: ["bypass", "duty-log", "cut-pair"],
  culpritId: "otto",
  whereId: "tower",
  contradictionPair: ["stmt-nils", "cut-pair"],
  criticalClues: [
    { id: "clean-cut", paths: [["cut-pair"], ["missing-shears"]] },
    { id: "visitor-window", paths: [["duty-log"], ["bypass"]] },
  ],
  reconstruction: ["Otto entered as a visitor, borrowed Nils's cutters, severed B-7, and hid the bypass cable in the shore shed.", "Օտտոն մտել է որպես այցելու, վերցրել Նիլսի մկրատը, կտրել B-7-ը և շրջանցման մալուխը թաքցրել ափի շինությունում։"],
  completion: { type: "report" },
  evaluation: {
    whereWords: ["tower", "rack", "beacon", "աշտարակ", "փարոս", "հենասյուն"],
    personWords: { otto: ["otto", "crane", "օտտո", "կրեյն"], nils: ["nils", "berg", "նիլս", "բերգ"], vera: ["vera", "holm", "վերա", "հոլմ"] },
    wrongAccusations: ["nils", "vera"],
  },
});
