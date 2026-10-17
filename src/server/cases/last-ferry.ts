import "server-only";
import { clockOn } from "@/lib/time";
import { buildCompactCase, E, T } from "@/server/cases/compact";
import { L } from "@/server/cases/helpers";

const at = (day: 16 | 17, hhmm: string) => clockOn(day, hhmm);

export const lastFerry = buildCompactCase({
  id: "last-ferry",
  title: ["Last Ferry", "Վերջին լաստանավը"],
  genre: ["Time-sensitive rescue", "Ժամանակային փրկություն"],
  duration: ["25–40 minutes", "25–40 րոպե"],
  durationMinutes: { min: 25, max: 40 },
  teaser: ["A courier vanishes before the dawn ferry. The locker timer is still counting.", "Սուրհանդակը անհետանում է լուսաբացի լաստանավից առաջ։ Պահարանի ժամանակաչափը դեռ հաշվում է։"],
  briefing: [
    "Courier Anya Veld missed the 05:50 ferry. Her bike is at Pier 3. A locker timer ends at 11:00. Find her before the lock floods the hold.",
    "Սուրհանդակ Անյա Վելդը բաց է թողել 05:50 լաստանավը։ Հեծանիվը 3-րդ նավամատույցում է։ Պահարանի ժամանակաչափը ավարտվում է 11:00-ին։ Գտեք նրան՝ մինչև կողպեքը ջրով լցնի պահեստը։",
  ],
  coverImage: "/covers/last-ferry.jpg",
  main: ["Find Anya Veld before 11:00.", "Գտնել Անյա Վելդին մինչև 11:00։"],
  optional: ["Name who locked the hold.", "Անվանել՝ ով է կողպել պահեստը։"],
  start: { day: 17, time: "08:00" },
  deadline: { day: 17, time: "11:00" },
  startLocationId: "pier",
  places: [
    {
      id: "pier",
      name: ["Pier 3", "Նավամատույց 3"],
      blurb: ["Bike, ticket booth, fog.", "Հեծանիվ, տոմսարկղ, մառախուղ։"],
      characters: ["boro", "lila"],
      regions: [
        { id: "bike", label: ["Anya's bike", "Անյայի հեծանիվ"], summary: ["Courier bag empty. Ticket stub in the basket.", "Սուրհանդակի պայուսակը դատարկ է։ Տոմսի կտրոնը զամբյուղում է։"] },
        { id: "booth", label: ["Ticket booth", "Տոմսարկղ"], summary: ["Night ledger open.", "Գիշերային մատյանը բաց է։"] },
      ],
      records: [{ id: "manifest", label: ["Ferry manifest", "Լաստանավի ցուցակ"], detail: ["Names for 05:50.", "Անուններ 05:50-ի համար։"] }],
    },
    {
      id: "hold",
      name: ["Freight hold B", "Բեռնախցիկ Բ"],
      blurb: ["Timer light on the hatch.", "Ժամանակաչափի լույսը լյուկի վրա։"],
      characters: [],
      regions: [
        { id: "hatch", label: ["Hatch lock", "Լյուկի կողպեք"], summary: ["Override behind a panel.", "Շրջանցումը վահանակի հետևում է։"] },
      ],
    },
    {
      id: "cafe",
      name: ["Quay cafe", "Նավամատույցի սրճարան"],
      blurb: ["Open early for crews.", "Վաղ է բացվում անձնակազմի համար։"],
      characters: ["reo"],
      regions: [{ id: "bin", label: ["Kitchen bin", "Խոհանոցի աղբարկղ"], summary: ["A cut courier strap.", "Կտրված սուրհանդակի ժապավեն։"] }],
    },
  ],
  cast: [
    { id: "boro", name: ["Boro Sen", "Բորո Սեն"], role: ["Night clerk", "Գիշերային գործավար"], presence: ["At the booth.", "Տոմսարկղի մոտ։"], relationship: ["Sold the 05:50 tickets.", "Վաճառել է 05:50 տոմսերը։"], portrait: "/portraits/a7.jpg", locationId: "pier", voice: "ash", aliases: ["boro", "sen", "բորո", "սեն"], speechStyle: "Guardedly brief.", suggestions: [["Did Anya buy a ticket?", "Անյան տոմս գնե՞ց։"]] },
    { id: "lila", name: ["Lila Orth", "Լիլա Օրթ"], role: ["Dock lead", "Նավամատույցի ղեկավար"], presence: ["Near the bike.", "Հեծանիվի մոտ։"], relationship: ["Controls hold keys.", "Վերահսկում է բեռնախցիկի բանալիները։"], portrait: "/portraits/a10.jpg", locationId: "pier", voice: "verse", aliases: ["lila", "orth", "լիլա", "օրթ"], speechStyle: "Firm.", suggestions: [["Who has hold keys?", "Ո՞վ ունի բեռնախցիկի բանալիներ։"]] },
    { id: "reo", name: ["Reo Veld", "Ռեո Վելդ"], role: ["Sibling", "Եղբայր/քույր"], presence: ["Cafe counter.", "Սրճարանի սեղան։"], relationship: ["Anya's sibling. Waiting.", "Անյայի եղբայր/քույր։ Սպասում է։"], portrait: "/portraits/a9.jpg", locationId: "cafe", voice: "ballad", aliases: ["reo", "veld", "ռեո", "վելդ"], speechStyle: "Worried, short.", suggestions: [["When did you last see Anya?", "Ե՞րբ տեսար Անյային վերջին անգամ։"]] },
    { id: "anya", name: ["Anya Veld", "Անյա Վելդ"], role: ["Courier", "Սուրհանդակ"], presence: ["Not free to talk yet.", "Դեռ ազատ չէ խոսելու։"], relationship: ["Missing person.", "Անհետ կորած։"], portrait: "/portraits/a1.jpg", locationId: "hold", voice: "coral", aliases: ["anya", "veld", "անյա", "վելդ"], speechStyle: "Tired, exact.", requiresRescue: true, suggestions: [["Who locked you in?", "Ո՞վ կողպեց քեզ։"]] },
  ],
  evidence: [
    E({ id: "open", type: "document", title: L("Missing courier", "Անհետ սուրհանդակ"), source: L("Pier desk", "Նավամատույցի սեղան"), acquired: L("Opening.", "Բացում։"), minute: at(17, "07:50"), discover: { type: "start" }, people: ["anya", "reo"], summary: L("Anya missed the 05:50 ferry. Timer ends 11:00.", "Անյան բաց է թողել 05:50 լաստանավը։ Ժամանակաչափը՝ 11:00։"), body: L("Anya Veld missing · bike Pier 3 · hold timer to 11:00 · find her.", "Անյա Վելդ անհետ · հեծանիվ նավամատույց 3 · բեռնախցիկի ժամանակաչափ մինչև 11:00 · գտնել նրան։") }),
    E({ id: "stmt-boro", type: "statement", kind: "claim", title: L("Boro account", "Բորոյի պատմություն"), source: L("Booth", "Տոմսարկղ"), acquired: L("Told.", "Ասված։"), minute: at(17, "08:05"), people: ["boro"], discover: { type: "start" }, summary: L("He says she never bought a ticket.", "Ասում է՝ նա տոմս չի գնել։"), body: L("\"No ticket for Anya. She never came to the window.\"", "«Անյայի տոմս չկա։ Նա պատուհանին չեկավ։»"), claims: [{ id: "boro-none", speakerId: "boro", kind: "claim", minute: at(17, "05:20"), text: L("Boro says Anya bought no ticket.", "Բորոն ասում է՝ Անյան տոմս չի գնել։") }] }),
    E({ id: "stub", type: "object", title: L("Ticket stub", "Տոմսի կտրոն"), source: L("Bike basket", "Հեծանիվի զամբյուղ"), acquired: L("Inspect bike.", "Զննել հեծանիվը։"), minute: at(17, "05:18"), people: ["anya"], discover: { type: "inspect", locationId: "pier", regionId: "bike" }, summary: L("05:50 Pier 3 stub, seat unpaid stamp overwritten.", "05:50 նավամատույց 3 կտրոն, տեղի դրոշմը վերագրված։"), body: L("Stub 05:50 Pier 3 · sold 05:18 · clerk mark B.S. · bag strap cut nearby.", "Կտրոն 05:50 նավամատույց 3 · վաճառված 05:18 · գործավար B.S. · պայուսակի ժապավենը կտրված է մոտակայքում։") }),
    E({ id: "manifest", type: "document", title: L("Manifest", "Ցուցակ"), source: L("Booth terminal", "Տոմսարկղի տերմինալ"), acquired: L("Requested.", "Խնդրված։"), minute: at(17, "05:18"), people: ["anya", "boro"], discover: { type: "record", recordId: "manifest" }, summary: L("Anya listed, then struck by Boro.", "Անյան ցուցակում է, ապա ջնջված Բորոյի կողմից։"), body: L("05:18 Anya Veld added\n05:22 Anya Veld struck by B. Sen · note \"no-show\".", "05:18 Անյա Վելդ ավելացված\n05:22 Անյա Վելդ ջնջված Բ. Սեն · նշում «չեկավ»։") }),
    E({ id: "strap", type: "object", title: L("Cut courier strap", "Կտրված սուրհանդակի ժապավեն"), source: L("Cafe bin", "Սրճարանի աղբարկղ"), acquired: L("Inspect.", "Զննում։"), minute: at(17, "05:30"), people: ["lila"], discover: { type: "inspect", locationId: "cafe", regionId: "bin" }, summary: L("Strap cut with dock shears tagged Lila.", "Ժապավենը կտրված է նավամատույցի մկրատով՝ Լիլայի պիտակով։"), body: L("Courier strap · clean cut · grease from dock shears tagged L. Orth.", "Սուրհանդակի ժապավեն · մաքուր կտրվածք · ճարպ նավամատույցի մկրատից՝ պիտակ Լ. Օրթ։") }),
    E({ id: "key-log", type: "access", title: L("Hold key log", "Բեռնախցիկի բանալու մատյան"), source: L("When stub and strap meet", "Երբ կտրոնն ու ժապավենը համընկնում են"), acquired: L("Combined.", "Միացված։"), minute: at(17, "05:25"), people: ["lila"], discover: { type: "when", allOf: ["stub", "strap"] }, summary: L("Lila signed hold key out at 05:25.", "Լիլան 05:25-ին դուրս է գրել բեռնախցիկի բանալին։"), body: L("05:25 Hold B key OUT · Lila Orth\n05:55 key still OUT.", "05:25 Բեռնախցիկ Բ բանալի ԵԼՔ · Լիլա Օրթ\n05:55 բանալին դեռ դուրս է։") }),
    E({ id: "timer", type: "object", title: L("Hatch timer", "Լյուկի ժամանակաչափ"), source: L("Hold hatch", "Բեռնախցիկի լյուկ"), acquired: L("Inspect hatch.", "Զննել լյուկը։"), minute: at(17, "05:40"), people: ["anya"], discover: { type: "inspect", locationId: "hold", regionId: "hatch" }, summary: L("Override available. Timer to 11:00.", "Շրջանցումը հասանելի է։ Ժամանակաչափը՝ 11:00։"), body: L("Hatch locked from outside · override behind panel · flood timer 11:00 · someone inside responds to knock.", "Լյուկը կողպված է դրսից · շրջանցումը վահանակի հետևում է · ջրի ժամանակաչափ 11:00 · ներսից ինչ-որ մեկը պատասխանում է թակոցին։") }),
    E({ id: "stmt-anya", type: "statement", kind: "claim", title: L("Anya account", "Անյայի պատմություն"), source: L("After rescue", "Փրկությունից հետո"), acquired: L("She can talk once free.", "Ազատվելուց հետո կարող է խոսել։"), minute: null, people: ["anya", "lila"], discover: { type: "rescued" }, summary: L("Lila locked the hatch after taking the bag.", "Լիլան կողպել է լյուկը՝ պայուսակը վերցնելուց հետո։"), body: L("\"Lila cut the strap, pushed me in, locked the hatch. She wanted the sealed pouch.\"", "«Լիլան կտրեց ժապավենը, ինձ մղեց ներս, կողպեց լյուկը։ Ուզում էր կնքված պարկը։»") }),
  ],
  topics: [
    T({ id: "boro-greet", characterId: "boro", phrases: { en: ["ticket", "anya"], hy: ["տոմս", "անյա"] }, response: L("No ticket for Anya. She never came to the window.", "Անյայի տոմս չկա։ Նա պատուհանին չեկավ։"), lie: true }),
    T({ id: "boro-stub", characterId: "boro", phrases: { en: ["stub", "05:18", "manifest"], hy: ["կտրոն", "05:18", "ցուցակ"] }, evidence: ["stub", "manifest"], response: L("I sold it. Lila told me to strike the name.", "Վաճառեցի։ Լիլան ասաց՝ ջնջել անունը։"), lie: false }),
    T({ id: "lila-greet", characterId: "lila", phrases: { en: ["hold", "key", "ferry"], hy: ["բեռնախցիկ", "բանալի", "լաստանավ"] }, response: L("Keys stay with me. The hold is sealed for freight.", "Բանալիները մնում են ինձ մոտ։ Բեռնախցիկը կնքված է բեռի համար։"), lie: true }),
    T({ id: "lila-confront", characterId: "lila", phrases: { en: ["strap", "key-log", "anya", "hatch"], hy: ["ժապավեն", "բանալի", "անյա", "լյուկ"] }, evidence: ["strap", "key-log", "timer"], response: L("I wanted the pouch. She is in Hold B. Open it if you can.", "Ուզում էի պարկը։ Նա Բեռնախցիկ Բ-ում է։ Բացեք, եթե կարող եք։"), setsDisclosure: ["lila-shutdown"], lie: false }),
    T({ id: "reo-greet", characterId: "reo", phrases: { en: ["anya", "see", "morning"], hy: ["անյա", "տեսնել", "առավոտ"] }, response: L("She left the cafe at 05:10 with the sealed pouch.", "Նա սրճարանից դուրս եկավ 05:10-ին կնքված պարկով։"), lie: false }),
    T({ id: "anya-greet", characterId: "anya", phrases: { en: ["who", "lock", "lila"], hy: ["ով", "կողպել", "լիլա"] }, response: L("Lila cut the strap, pushed me in, locked the hatch.", "Լիլան կտրեց ժապավենը, ինձ մղեց ներս, կողպեց լյուկը։"), lie: false }),
  ],
  travel: { "cafe|pier": 3, "hold|pier": 4, "cafe|hold": 5 },
  hints: [
    { level: 1, cost: 25, text: ["The bike still holds a ticket stub.", "Հեծանիվում դեռ տոմսի կտրոն կա։"] },
    { level: 2, cost: 50, text: ["Hold keys went out at 05:25.", "Բեռնախցիկի բանալին դուրս է գրվել 05:25-ին։"] },
    { level: 3, cost: 100, text: ["Lila locked Anya in Hold B. Use the hatch override.", "Լիլան Անյային կողպել է Բեռնախցիկ Բ-ում։ Օգտագործեք լյուկի շրջանցումը։"] },
  ],
  strongEvidence: ["stub", "manifest", "strap", "key-log", "timer", "stmt-anya"],
  optionalEvidence: ["open"],
  decisiveEvidence: ["strap", "key-log", "timer"],
  culpritId: "lila",
  whereId: "hold",
  contradictionPair: ["stmt-boro", "manifest"],
  criticalClues: [
    { id: "ticket-exists", paths: [["stub"], ["manifest"]] },
    { id: "hold-key", paths: [["key-log"], ["timer"]] },
  ],
  reconstruction: [
    "Anya bought a ticket. Lila cut her strap, locked her in Hold B for the pouch, and had Boro strike her name. The hatch override frees her before the flood timer.",
    "Անյան տոմս է գնել։ Լիլան կտրել է ժապավենը, կողպել նրան Բեռնախցիկ Բ-ում պարկի համար և Բորոյին ստիպել ջնջել անունը։ Լյուկի շրջանցումը ազատում է նրան մինչև ջրի ժամանակաչափը։",
  ],
  completion: {
    type: "rescue",
    locationId: "hold",
    actionLabel: L("Open the hatch override", "Բացել լյուկի շրջանցումը"),
  },
  evaluation: {
    whereWords: ["hold", "hatch", "freight", "բեռնախցիկ", "լյուկ"],
    personWords: {
      lila: ["lila", "orth", "լիլա", "օրթ"],
      boro: ["boro", "sen", "բորո", "սեն"],
      reo: ["reo", "veld", "ռեո", "վելդ"],
      anya: ["anya", "veld", "անյա", "վելդ"],
    },
    wrongAccusations: ["boro", "reo"],
  },
});
