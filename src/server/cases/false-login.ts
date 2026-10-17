import "server-only";
import { clockOn } from "@/lib/time";
import { buildCompactCase, E, T } from "@/server/cases/compact";
import { L } from "@/server/cases/helpers";

const at = (day: 16 | 17, hhmm: string) => clockOn(day, hhmm);

export const falseLogin = buildCompactCase({
  id: "false-login",
  title: ["False Login", "Կեղծ մուտք"],
  genre: ["Cyber deception", "Կիբեր խաբեություն"],
  duration: ["15–22 minutes", "15–22 րոպե"],
  durationMinutes: { min: 15, max: 22 },
  teaser: ["A payroll admin is locked out. Payroll still moved.", "Աշխատավարձի ադմինը արգելափակված է։ Աշխատավարձը մինչև այդ տեղափոխվել է։"],
  briefing: ["Admin Tess Quill cannot sign in. Overnight, 12 salaries diverted to a new IBAN. Find who used her session and where the money went.", "Ադմին Թես Քուիլը չի կարող մտնել։ Գիշերը 12 աշխատավարձ շեղվել է նոր IBAN։ Գտեք՝ ով է օգտագործել նրա սեանսը և ուր է գնացել գումարը։"],
  coverImage: "/covers/false-login.jpg",
  main: ["Name who hijacked Tess's payroll session.", "Անվանել՝ ով է առևանգել Թեսի աշխատավարձի սեանսը։"],
  optional: ["Recover the phishing page host.", "Վերադարձնել ֆիշինգ էջի հոսթը։"],
  start: { day: 17, time: "09:30" },
  deadline: { day: 17, time: "13:00" },
  startLocationId: "ops",
  places: [
    {
      id: "ops",
      name: ["Ops floor", "Գործառնությունների հարկ"],
      blurb: ["Payroll desk and badge door.", "Աշխատավարձի սեղան և քարտով դուռ։"],
      characters: ["tess", "ivan"],
      regions: [
        { id: "desk", label: ["Tess desk", "Թեսի սեղան"], summary: ["Sticky note with a login URL.", "Կպչուն թերթիկ մուտքի հասցեով։"] },
        { id: "door", label: ["Badge door", "Քարտով դուռ"], summary: ["After-hours chime log nearby.", "Աշխատանքից հետո ազդանշանի մատյան մոտակայքում։"] },
      ],
      records: [
        { id: "session", label: ["Session log", "Սեանսների մատյան"], detail: ["Payroll console.", "Աշխատավարձի վահանակ։"] },
        { id: "badge", label: ["Badge log", "Քարտերի մատյան"], detail: ["Ops door.", "Գործառնությունների դուռ։"] },
      ],
    },
    {
      id: "server",
      name: ["Server cage", "Սերվերային վանդակ"],
      blurb: ["Staging host rack.", "Փորձարկման հոսթի հենասյուն։"],
      characters: ["nova"],
      regions: [{ id: "rack", label: ["Staging rack", "Փորձարկման հենասյուն"], summary: ["A host named pay-reset.local.", "Հոսթ՝ pay-reset.local։"] }],
    },
  ],
  cast: [
    { id: "tess", name: ["Tess Quill", "Թես Քուիլ"], role: ["Payroll admin", "Աշխատավարձի ադմին"], presence: ["Locked out at her desk.", "Արգելափակված է սեղանի մոտ։"], relationship: ["Owns the payroll console.", "Տիրապետում է աշխատավարձի վահանակին։"], portrait: "/portraits/a8.jpg", locationId: "ops", voice: "coral", aliases: ["tess", "quill", "թես", "քուիլ"], speechStyle: "Frustrated, brief.", suggestions: [["What URL did you open?", "Ի՞նչ հասցե բացեցիր։"]] },
    { id: "ivan", name: ["Ivan Drozd", "Իվան Դրոզդ"], role: ["IT support", "IT աջակցություն"], presence: ["By the badge door.", "Քարտով դռան մոտ։"], relationship: ["Resets passwords.", "Վերակայում է գաղտնաբառերը։"], portrait: "/portraits/a3.jpg", locationId: "ops", voice: "ash", aliases: ["ivan", "drozd", "իվան", "դրոզդ"], speechStyle: "Helpful tone, short.", suggestions: [["Ask about password resets.", "Հարցրու գաղտնաբառի վերակայումների մասին։"]] },
    { id: "nova", name: ["Nova Chen", "Նովա Չեն"], role: ["Contractor", "Կապալառու"], presence: ["In the cage.", "Վանդակում։"], relationship: ["Has staging access.", "Ունի փորձարկման մուտք։"], portrait: "/portraits/a4.jpg", locationId: "server", voice: "verse", aliases: ["nova", "chen", "նովա", "չեն"], speechStyle: "Technical, clipped.", suggestions: [["Who owns pay-reset.local?", "Ո՞ւմն է pay-reset.local։"]] },
  ],
  evidence: [
    E({ id: "open", type: "document", title: L("Payroll diversion", "Աշխատավարձի շեղում"), source: L("Ops desk", "Գործառնությունների սեղան"), acquired: L("Opening.", "Բացում։"), minute: at(17, "09:20"), discover: { type: "start" }, people: ["tess"], summary: L("12 salaries moved overnight.", "12 աշխատավարձ տեղափոխվել է գիշերը։"), body: L("12 salaries → IBAN ends 9031 · Tess session · Tess locked out at dawn.", "12 աշխատավարձ → IBAN վերջավորություն 9031 · Թեսի սեանս · Թեսը արգելափակված է լուսաբացին։") }),
    E({ id: "stmt-ivan", type: "statement", kind: "claim", title: L("Ivan account", "Իվանի պատմություն"), source: L("Ops", "Գործառնություններ"), acquired: L("Told.", "Ասված։"), minute: at(17, "09:35"), people: ["ivan"], discover: { type: "start" }, summary: L("He says Tess clicked a bad link.", "Ասում է՝ Թեսը սխալ հղում է սեղմել։"), body: L("\"Tess clicked something. I only reset tickets.\"", "«Թեսը ինչ-որ բան սեղմեց։ Ես միայն հայտեր եմ վերակայում։»"), claims: [{ id: "ivan-blame", speakerId: "ivan", kind: "claim", minute: null, text: L("Ivan blames Tess's click.", "Իվանը մեղադրում է Թեսի սեղմումը։") }] }),
    E({ id: "sticky", type: "document", title: L("Phish URL note", "Ֆիշինգ հասցեի նշում"), source: L("Tess desk", "Թեսի սեղան"), acquired: L("Inspect.", "Զննում։"), minute: at(16, "21:10"), people: ["ivan"], discover: { type: "inspect", locationId: "ops", regionId: "desk" }, summary: L("Handwritten pay-reset.local from Ivan's pen.", "Ձեռագիր pay-reset.local՝ Իվանի գրիչով։"), body: L("Sticky: https://pay-reset.local/login · ink matches Ivan desk pen.", "Կպչուն՝ https://pay-reset.local/login · թանաքը համընկնում է Իվանի գրիչին։") }),
    E({ id: "session", type: "access", title: L("Session log", "Սեանսների մատյան"), source: L("Payroll console", "Աշխատավարձի վահանակ"), acquired: L("Requested.", "Խնդրված։"), minute: at(16, "21:40"), people: ["ivan"], discover: { type: "record", recordId: "session" }, summary: L("Tess token used from Ivan workstation.", "Թեսի նշանը օգտագործվել է Իվանի աշխատասեղանից։"), body: L("21:40 Tess Quill session · source host IVAN-IT-02 · export IBAN 9031.", "21:40 Թես Քուիլ սեանս · հոսթ IVAN-IT-02 · արտահանում IBAN 9031։") }),
    E({ id: "badge", type: "access", title: L("Badge after hours", "Քարտ՝ աշխատանքից հետո"), source: L("Ops door", "Գործառնությունների դուռ"), acquired: L("Requested.", "Խնդրված։"), minute: at(16, "21:30"), people: ["ivan"], discover: { type: "record", recordId: "badge" }, summary: L("Ivan in ops alone 21:30–22:05.", "Իվանը միայնակ է գործառնություններում 21:30–22:05։"), body: L("21:30 Ivan Drozd IN\n22:05 Ivan Drozd OUT\nTess Quill last out 19:50.", "21:30 Իվան Դրոզդ մուտք\n22:05 ելք\nԹես Քուիլ վերջին ելք 19:50։") }),
    E({ id: "host", type: "object", title: L("pay-reset.local host", "pay-reset.local հոսթ"), source: L("Staging rack", "Փորձարկման հենասյուն"), acquired: L("Inspect.", "Զննում։"), minute: null, people: ["nova", "ivan"], discover: { type: "inspect", locationId: "server", regionId: "rack" }, summary: L("Fake login page; creator tag Ivan.", "Կեղծ մուտքի էջ. ստեղծողի պիտակ՝ Ivan։"), body: L("Staging VM pay-reset.local · cloned payroll skin · owner tag I. Drozd.", "Փորձարկման VM pay-reset.local · կրկնօրինակված աշխատավարձի տեսք · տիրոջ պիտակ Ի. Դրոզդ։") }),
    E({ id: "iban", type: "transaction", title: L("Diverted IBAN", "Շեղված IBAN"), source: L("When session and sticky meet", "Երբ սեանսն ու կպչունը համընկնում են"), acquired: L("Combined.", "Միացված։"), minute: at(16, "21:44"), people: ["ivan"], discover: { type: "when", allOf: ["session", "sticky"] }, summary: L("IBAN 9031 belongs to Ivan Drozd.", "IBAN 9031-ը պատկանում է Իվան Դրոզդին։"), amounts: [{ id: "d1", label: L("Batch", "Խմբաքանակ"), value: 420000, unit: "AMD" }], body: L("Destination IBAN …9031 · account holder Ivan Drozd.", "Նպատակային IBAN …9031 · հաշվի տեր՝ Իվան Դրոզդ։") }),
  ],
  topics: [
    T({ id: "tess-greet", characterId: "tess", phrases: { en: ["login", "locked", "url"], hy: ["մուտք", "արգելափակ", "հասցե"] }, response: L("Ivan left a reset link. After that my password died.", "Իվանը վերակայման հղում թողեց։ Դրանից հետո գաղտնաբառս մեռավ։"), lie: false }),
    T({ id: "ivan-greet", characterId: "ivan", phrases: { en: ["reset", "help"], hy: ["վերակայում", "օգնություն"] }, response: L("Tess clicked something. I only reset tickets.", "Թեսը ինչ-որ բան սեղմեց։ Ես միայն հայտեր եմ վերակայում։"), lie: true }),
    T({ id: "nova-greet", characterId: "nova", phrases: { en: ["staging", "host"], hy: ["փորձարկում", "հոսթ"] }, response: L("That VM is not mine. Check the owner tag.", "Այդ VM-ը իմը չէ։ Ստուգեք տիրոջ պիտակը։"), lie: false }),
    T({ id: "ivan-confront", characterId: "ivan", phrases: { en: ["iban", "session", "phish", "9031"], hy: ["iban", "սեանս", "ֆիշ", "9031"] }, evidence: ["session", "iban", "host"], response: L("I built the fake page and moved payroll. Done talking.", "Կեղծ էջը ես կառուցեցի և աշխատավարձը տեղափոխեցի։ Խոսելուց վերջ։"), setsDisclosure: ["ivan-shutdown"], lie: false }),
  ],
  travel: { "ops|server": 3 },
  hints: [
    { level: 1, cost: 20, text: ["The sticky URL was written in Ivan's ink.", "Կպչուն հասցեն գրված է Իվանի թանաքով։"] },
    { level: 2, cost: 40, text: ["Tess's session came from Ivan's host.", "Թեսի սեանսը եկել է Իվանի հոսթից։"] },
    { level: 3, cost: 75, text: ["Ivan phished Tess and diverted pay to his IBAN.", "Իվանը ֆիշինգով վերցրել է Թեսին և աշխատավարձը շեղել իր IBAN։"] },
  ],
  strongEvidence: ["sticky", "session", "host", "iban"],
  optionalEvidence: ["badge"],
  decisiveEvidence: ["session", "iban", "host"],
  culpritId: "ivan",
  whereId: "ops",
  contradictionPair: ["stmt-ivan", "session"],
  criticalClues: [
    { id: "fake-url", paths: [["sticky"], ["host"]] },
    { id: "session-source", paths: [["session"], ["iban"]] },
  ],
  reconstruction: ["Ivan planted a fake reset page, captured Tess's session from his workstation, and diverted salaries to his IBAN.", "Իվանը դրել է կեղծ վերակայման էջ, վերցրել Թեսի սեանսը իր աշխատասեղանից և աշխատավարձերը շեղել իր IBAN։"],
  completion: { type: "report" },
  evaluation: {
    whereWords: ["ops", "session", "iban", "գործառնություն", "սեանս", "iban"],
    personWords: { ivan: ["ivan", "drozd", "իվան", "դրոզդ"], tess: ["tess", "quill", "թես", "քուիլ"], nova: ["nova", "chen", "նովա", "չեն"] },
    wrongAccusations: ["tess", "nova"],
  },
});
