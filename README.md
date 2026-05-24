# Gym Tracker

Mobilní aplikace pro sledování silového tréninku. Data se načítají z Google Sheets, ke každému cviku jsou stopky odpočtu pauzy a zaznamenávají se odvedené série.

---

## Účel

Aplikace slouží jako companion pro tréninkový plán vytvořený koučem v Google Sheets. Atlet vidí:

- **Bloky tréninků** (VOLUME / STRENGHT / DELOAD) seřazené od nejnovějšího, s ukazatelem postupu (X/Y cviků hotovo)
- **Detaily cviků** — sets, reps, váha, tempo, RPE, koučovy poznámky
- **Předvyplněné váhy** z minulých sérií zaznamenaných v tabulce
- **Poznámky atleta** z tabulky (zpětná vazba)
- **Logování sérií** s možností zpětné úpravy už dokončené série
- **Plovoucí rest timer** s push notifikací — během odpočtu lze volně procházet aplikací; widget jde rozkliknout na fullscreen view

---

## Tech stack

| Vrstva        | Technologie                          |
|---------------|--------------------------------------|
| Framework     | Expo SDK 55 + React Native 0.83      |
| Jazyk         | TypeScript (strict)                  |
| Routing       | expo-router (file-based)             |
| Data          | Google Sheets → CSV → PapaParse      |
| Úložiště      | AsyncStorage                         |
| Zvuk          | expo-av                              |
| Notifikace    | expo-notifications                   |
| UI efekty     | expo-linear-gradient, expo-blur      |
| Keep awake    | expo-keep-awake                      |

---

## Architektura

```
gymapp/
├── app/                          # Expo Router – file-based routing
│   ├── _layout.tsx               # Root layout (Stack + globální FloatingTimer)
│   ├── index.tsx                 # Hlavní obrazovka – seznam bloků
│   ├── workout/
│   │   └── [blockId].tsx         # Detail bloku – seznam cviků s progressem
│   └── exercise/
│       └── [blockId]/
│           └── [exerciseId].tsx  # Detail cviku – logování + editace sérií
├── components/
│   ├── FloatingTimer.tsx         # Plovoucí widget odpočtu (bar + fullscreen)
│   └── Skeleton.tsx              # Loading skeletony pro karty
├── services/
│   └── sheetsParser.ts           # Fetch + parse CSV z Google Sheets
├── store/
│   ├── workoutStore.ts           # AsyncStorage CRUD pro logy sérií
│   └── timerStore.ts             # Globální stav rest timeru + notifikace
├── constants/
│   └── theme.ts                  # Design tokens (barvy, glass styly, fonty)
├── assets/
│   ├── beep.mp3                  # Zvuk konce odpočtu (notifikace i in-app)
│   └── ...                       # Ikony, splash screen
└── start-web.js                  # Launcher pro web preview
```

### Datový tok

```
Google Sheets (CSV)
       │
       ▼
sheetsParser.ts ── fetchWorkoutData() ──▶ WorkoutBlock[]
                                              │
                                              ▼
                                      app/index.tsx (seznam bloků)
                                              │
                                              ▼
                                 app/workout/[blockId].tsx (cviky + progress)
                                              │
                                              ▼
                            app/exercise/[blockId]/[exerciseId].tsx
                                 │                          │
                                 ▼                          ▼
                          timerStore.start()        workoutStore
                                 │                  (saveSet / updateSet)
                                 ▼                          │
                       FloatingTimer + OS notification      ▼
                       (mountován v _layout.tsx)       AsyncStorage
                                                   (workout_log_{blockId}_{YYYY-MM-DD})
```

---

## Zdroj dat – CSV struktura

**URL:** Publikovaný Google Sheet exportovaný jako CSV.

| Řádky   | Obsah                                                       |
|---------|-------------------------------------------------------------|
| 0–8     | Osobní údaje (přeskočeny)                                   |
| 9+      | Bloky tréninků oddělené řádky `VOLUME` / `STRENGHT` / `DELOAD` / `-` |

Klíčové slovo oddělovače (`VOLUME` atd.) se hledá ve **sloupci A nebo B** — kouč může vyplňovat kterýkoli z nich, parser zvládne obě varianty.

**Sloupce cviku (offset +1):**

| Sloupec | Obsah          |
|---------|----------------|
| 1       | Číslo cviku    |
| 2       | Název          |
| 3       | Pattern        |
| 4       | Sets           |
| 5       | Reps           |
| 6       | Rest time      |
| 7       | Weight         |
| 8       | Tempo          |
| 9       | RPE            |
| 10      | Coaches notes  |
| 12,15,18,21,24,27 | Set 1–6 weight |
| 13,16,19,22,25,28 | Set 1–6 reps   |
| 30      | Athlete notes  |

---

## Design systém

**Liquid glass** – tmavé pozadí s poloprůhlednými kartami a jemnými bordery.

| Token           | Hodnota                        |
|-----------------|--------------------------------|
| Background      | `#0A0A0F`                      |
| Glass card      | `rgba(255,255,255,0.05)` + border `rgba(255,255,255,0.08)` |
| Accent          | `#E8A838`                      |
| VOLUME barva    | `#3B82F6`                      |
| STRENGHT barva  | `#E8A838`                      |
| DELOAD barva    | `#22C55E`                      |
| Border radius   | `20px` (karty), `14px` (tlačítka) |

---

## Spuštění (development)

```bash
cd gymapp
npm install
npx expo start
```

Naskenuj QR kód pomocí **Expo Go** na telefonu (Android/iOS).

### Web preview

```bash
npx expo start --web
```

---

## Build APK

### Prerekvizity

- Účet na [expo.dev](https://expo.dev)
- `eas-cli` nainstalované globálně

### Postup

```bash
npm install -g eas-cli
eas login
eas build:configure
npx eas build -p android --profile preview
```

Výsledný `.apk` stáhneš z Expo dashboardu a nainstalueš na telefon.

---

## AsyncStorage – ukládání dat

Klíč: `workout_log_{blockId}_{YYYY-MM-DD}`

```json
{
  "exerciseId": {
    "exerciseId": "VOLUME_1_ex4",
    "sets": [
      { "weight": "80", "reps": "6", "completedAt": "2026-03-29T10:30:00Z" }
    ]
  }
}
```

Funkce: `saveSet()`, `updateSet()`, `getLog()`, `clearLog()`

---

## Rest timer – architektura

Timer žije v globálním `timerStore` (singleton třída se subscribe vzorem). `FloatingTimer` je mountován jednou v `_layout.tsx`, takže přežívá navigaci mezi obrazovkami.

- **Spuštění** (`timerStore.start(seconds, label?)`): nastaví `endTime`, naplánuje OS push notifikaci přes `expo-notifications` (Android channel `rest-timer` s MAX prioritou + vlastním zvukem `beep.mp3`).
- **Skip** (`timerStore.skip()`): zruší naplánovanou notifikaci.
- **Natural completion** (`timerStore.complete()`): notifikace **se neruší** — OS ji odpálí ve stejný moment, kdy JS detekuje nulu (jinak by uživatel v pozadí dostal ticho).
- **Expanded view**: tap na plovoucí pruh otevře fullscreen Modal s rotující animací.

---

## Licence

Soukromý projekt.
