import "server-only";
import { clockOn } from "@/lib/time";
import { buildCompactCase, E, T } from "@/server/cases/compact";
import { L } from "@/server/cases/helpers";

const at = (day: 16 | 17, hhmm: string) => clockOn(day, hhmm);

export const sealedEnvelope = buildCompactCase({
  id: "sealed-envelope",
  title: ["Sealed Envelope", "Կնքված ծրար"],
  genre: ["Blackmail", "Շանտաժ"],
  duration: ["18–28 minutes", "18–28 րոպե"],
  durationMinutes: { min: 18, max: 28 },
  teaser: ["A council aide pays cash for silence. The photos never arrive.", "Խորհրդի օգնականը կանխիկ է վճարում լռության համար։ Լուսանկարները չեն գալիս։"],
  briefing: ["Aide Rafi Marko left 5,000 under a park bench after a threat note. Find who sent the note and where the cash went. No photos of him exist in the drop.", "Օգնական Ռաֆի Մարկոն 5,000 է թողել այգու նստարանի տակ սպառնալիքի նամակից հետո։ Գտեք՝ ով է ուղարկել նամակը և ուր է գնացել գումարը։ Գցման տեղում նրա լուսանկար չկա։"],
  coverImage: "/covers/sealed-envelope.jpg",
  main: ["Name the blackmailer and recover the cash trail.", "Անվանել շանտաժիստին և վերականգնել գումարի հետքը։"],
  optional: ["Prove the photos were never taken.", "Ապացուցել՝ լուսանկարները երբեք չեն արվել։"],
  start: { day: 17, time: "09:00" },
  deadline: { day: 17, time: "15:00" },
  startLocationId: "office",
  places: [
    {
      id: "office",
      name: ["Aide office", "Օգնականի գրասենյակ"],
      blurb: ["Threat note and a quiet phone.", "Սպառնալիքի նամակ և լուռ հեռախոս։"],
      characters: ["rafi", "sena"],
      regions: [
        { id: "desk", label: ["Desk drawer", "Սեղանի դարակ"], summary: ["Copy of the threat note.", "Սպառնալիքի նամակի պատճեն։"] },
        { id: "phone", label: ["Desk phone", "Սեղանի հեռախոս"], summary: ["One short inbound call logged.", "Մեկ կարճ մուտքային զանգ։"] },
      ],
      records: [{ id: "call-log", label: ["Call log", "Զանգերի մատյան"], detail: ["Desk handset.", "Սեղանի լսափող։"] }],
    },
    {
      id: "park",
      name: ["North park bench", "Հյուսիսային այգու նստարան"],
      blurb: ["The drop point.", "Գցման կետ։"],
      characters: ["jules"],
      regions: [{ id: "bench", label: ["Bench hollow", "Նստարանի խոռոչ"], summary: ["Empty envelope, grease on the flap.", "Դատարկ ծրար, ճարպ փեղկին։"] }],
    },
  ],
  cast: [
    { id: "rafi", name: ["Rafi Marko", "Ռաֆի Մարկո"], role: ["Council aide", "Խորհրդի օգնական"], presence: ["At his desk.", "Իր սեղանի մոտ։"], relationship: ["Paid the drop.", "Վճարել է գցումը։"], portrait: "/portraits/a3.jpg", locationId: "office", voice: "ballad", aliases: ["rafi", "marko", "ռաֆի", "մարկո"], speechStyle: "Anxious, short.", suggestions: [["Who called you?", "Ո՞վ զանգեց քեզ։"]] },
    { id: "sena", name: ["Sena Ruiz", "Սենա Ռուիս"], role: ["Press officer", "Մամուլի պատասխանատու"], presence: ["In the doorway.", "Դռան մոտ։"], relationship: ["Shares the office wing.", "Կիսում է գրասենյակի թևը։"], portrait: "/portraits/a1.jpg", locationId: "office", voice: "coral", aliases: ["sena", "ruiz", "սենա", "ռուիս"], speechStyle: "Smooth.", suggestions: [["Ask about the note paper.", "Հարցրու նամակի թղթի մասին։"]] },
    { id: "jules", name: ["Jules Park", "Ջուլս Փարք"], role: ["Park vendor", "Այգու վաճառող"], presence: ["Near the bench.", "Նստարանի մոտ։"], relationship: ["Saw someone take the envelope.", "Տեսել է՝ ինչ-որ մեկը վերցնում է ծրարը։"], portrait: "/portraits/a7.jpg", locationId: "park", voice: "ash", aliases: ["jules", "park", "ջուլս", "փարք"], speechStyle: "Plain.", suggestions: [["Who took the envelope?", "Ո՞վ վերցրեց ծրարը։"]] },
  ],
  evidence: [
    E({ id: "note", type: "document", title: L("Threat note", "Սպառնալիքի նամակ"), source: L("Desk", "Սեղան"), acquired: L("Opening.", "Բացում։"), minute: at(16, "18:00"), discover: { type: "start" }, people: ["rafi"], summary: L("Pay 5,000 or photos go public.", "Վճարիր 5,000, կամ լուսանկարները հրապարակվում են։"), body: L("Bench north park · 22:00 · 5,000 cash · or the photos run.", "Հյուսիսային այգու նստարան · 22:00 · 5,000 կանխիկ · կամ լուսանկարները դուրս կգան։") }),
    E({ id: "stmt-rafi", type: "statement", kind: "claim", title: L("Rafi account", "Ռաֆիի պատմություն"), source: L("Office", "Գրասենյակ"), acquired: L("Told.", "Ասված։"), minute: at(17, "09:05"), people: ["rafi"], discover: { type: "start" }, summary: L("He paid and never saw anyone.", "Վճարել է և ոչ ոքի չի տեսել։"), body: L("\"I left the cash. I did not wait. I thought Sena hated me enough to do this.\"", "«Թողեցի գումարը։ Չսպասեցի։ Կարծեցի՝ Սենան բավական է ատում ինձ՝ սա անելու համար։»"), claims: [{ id: "rafi-sena", speakerId: "rafi", kind: "claim", minute: null, text: L("Rafi suspects Sena.", "Ռաֆին կասկածում է Սենային։") }] }),
    E({ id: "call", type: "call", title: L("Desk call 17:52", "Սեղանի զանգ 17:52"), source: L("Call log", "Զանգերի մատյան"), acquired: L("Requested.", "Խնդրված։"), minute: at(16, "17:52"), people: ["jules"], discover: { type: "record", recordId: "call-log" }, summary: L("6s call from a park kiosk line.", "6 վայրկյան զանգ այգու կրպակի գծից։"), highlights: [L("Duration: 6 seconds.", "Տևողություն՝ 6 վայրկյան։")], body: L("17:52 inbound · park kiosk 441-02 · 6 seconds · no speech recorded.", "17:52 մուտքային · այգու կրպակ 441-02 · 6 վայրկյան · խոսք չի ձայնագրվել։") }),
    E({ id: "paper", type: "document", title: L("Note stock match", "Նամակի թղթի համընկնում"), source: L("Desk drawer", "Սեղանի դարակ"), acquired: L("Inspect.", "Զննում։"), minute: null, people: ["jules"], discover: { type: "inspect", locationId: "office", regionId: "desk" }, summary: L("Same lot as park kiosk receipts.", "Նույն խմբաքանակը՝ այգու կրպակի կտրոնների հետ։"), body: L("Threat paper lot PK-19 · also used for park kiosk receipts.", "Սպառնալիքի թուղթ PK-19 · օգտագործվում է նաև այգու կրպակի կտրոնների համար։") }),
    E({ id: "envelope", type: "object", title: L("Empty drop envelope", "Դատարկ գցման ծրար"), source: L("Bench", "Նստարան"), acquired: L("Inspect.", "Զննում։"), minute: at(16, "22:05"), people: ["jules"], discover: { type: "inspect", locationId: "park", regionId: "bench" }, summary: L("Cash gone. Grease matches vendor gloves.", "Գումարը չկա։ Ճարպը համընկնում է վաճառողի ձեռնոցներին։"), body: L("Envelope empty · snack grease on flap · no photo card inside.", "Ծրարը դատարկ է · խորտիկի ճարպ փեղկին · ներսում լուսանկար չկա։") }),
    E({ id: "till", type: "transaction", title: L("Kiosk till jump", "Կրպակի դրամարկղի թռիչք"), source: L("When call and envelope meet", "Երբ զանգն ու ծրարը համընկնում են"), acquired: L("Unlocks after key finds.", "Բացվում է հիմնական գտածոներից հետո։"), minute: at(16, "22:10"), people: ["jules"], discover: { type: "when", allOf: ["call", "envelope"] }, summary: L("+5,000 cash, no sale line.", "+5,000 կանխիկ, առանց վաճառքի տողի։"), amounts: [{ id: "c1", label: L("Cash in", "Մուտք"), value: 5000, unit: "AMD" }], body: L("22:10 till +5,000 · no SKU · operator J. Park.", "22:10 դրամարկղ +5,000 · SKU չկա · օպերատոր Ջ. Փարք։") }),
  ],
  topics: [
    T({ id: "rafi-greet", characterId: "rafi", phrases: { en: ["hello", "note", "pay"], hy: ["բարև", "նամակ", "վճարել"] }, response: L("I paid. I thought Sena sent it.", "Վճարեցի։ Կարծեցի՝ Սենան է ուղարկել։"), lie: false }),
    T({ id: "sena-greet", characterId: "sena", phrases: { en: ["photos", "note"], hy: ["լուսանկար", "նամակ"] }, response: L("I write press notes, not threats. Check the park paper stock.", "Ես մամուլի նշումներ եմ գրում, ոչ սպառնալիքներ։ Ստուգեք այգու թուղթը։"), lie: false }),
    T({ id: "jules-greet", characterId: "jules", phrases: { en: ["bench", "envelope"], hy: ["նստարան", "ծրար"] }, response: L("I saw a coat take something. I sell snacks. That is all.", "Տեսա՝ վերարկուն ինչ-որ բան է վերցնում։ Ես խորտիկ եմ վաճառում։ Այդքանը։"), lie: true }),
    T({ id: "jules-confront", characterId: "jules", phrases: { en: ["till", "5000", "paper", "call"], hy: ["դրամարկղ", "5000", "թուղթ", "զանգ"] }, evidence: ["till", "paper", "call"], response: L("There were no photos. I wrote the note and took the cash.", "Լուսանկարներ չկային։ Ես գրեցի նամակը և վերցրի գումարը։"), setsDisclosure: ["jules-shutdown"], lie: false }),
  ],
  travel: { "office|park": 8 },
  hints: [
    { level: 1, cost: 20, text: ["The note paper matches park receipts.", "Նամակի թուղթը համընկնում է այգու կտրոններին։"] },
    { level: 2, cost: 45, text: ["Follow the till jump after the drop.", "Հետևեք դրամարկղի թռիչքին գցումից հետո։"] },
    { level: 3, cost: 80, text: ["Jules faked the photos and took the cash.", "Ջուլսը կեղծել է լուսանկարները և վերցրել գումարը։"] },
  ],
  strongEvidence: ["paper", "call", "envelope", "till"],
  optionalEvidence: ["note"],
  decisiveEvidence: ["till", "paper", "call"],
  culpritId: "jules",
  whereId: "park",
  contradictionPair: ["stmt-rafi", "till"],
  criticalClues: [
    { id: "paper-lot", paths: [["paper"], ["call"]] },
    { id: "cash-trail", paths: [["till"], ["envelope"]] },
  ],
  reconstruction: ["Jules used kiosk paper for the threat, called the desk, took the cash, and never held photos of Rafi.", "Ջուլսը կրպակի թուղթով գրել է սպառնալիքը, զանգել սեղանին, վերցրել գումարը և երբեք չի ունեցել Ռաֆիի լուսանկարներ։"],
  completion: { type: "report" },
  evaluation: {
    whereWords: ["park", "bench", "kiosk", "այգի", "նստարան", "կրպակ"],
    personWords: { jules: ["jules", "park", "ջուլս", "փարք"], rafi: ["rafi", "marko", "ռաֆի", "մարկո"], sena: ["sena", "ruiz", "սենա", "ռուիս"] },
    wrongAccusations: ["sena", "rafi"],
  },
});
