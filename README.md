# Gym Tracker

Mobilní aplikace pro sledování silového tréninku. Data se načítají z Google Sheets, ke každému cviku jsou stopky odpočtu pauzy a zaznamenávají se odvedené série.

---

## Účel

Aplikace slouží jako companion pro tréninkový plán vytvořený koučem v Google Sheets. Atlet vidí:

- **Bloky tréninků** (VOLUME / STRENGHT / DELOAD) seřazené od nejnovějšího
- **Detaily cviků** — sets, reps, váha, tempo, RPE, koučovy poznámky
- **Předvyplněné váhy** z minulých sérií zaznamenaných v tabulce
- **Poznámky atleta** z tabulky (zpětná vazba)
- **Rest timer** s odpočtem mezi sériemi

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
| UI efekty     | expo-linear-gradient, expo-blur      |
| Keep awake    | expo-keep-awake                      |

---

## Architektura

```
gymapp/
├── app/                          # Expo Router – file-based routing
│   ├── _layout.tsx               # Root layout (Stack navigator, dark theme)
│   ├── index.tsx                 # Hlavní obrazovka – seznam bloků
│   ├── workout/
│   │   └── [blockId].tsx         # Detail bloku – seznam cviků
│   └── exercise/
│       └── [blockId]/
│           └── [exerciseId].tsx  # Detail cviku – logování sérií
├── components/
│   └── RestTimer.tsx             # Fullscreen modal odpočtu s animací
├── services/
│   └── sheetsParser.ts           # Fetch + parse CSV z Google Sheets
├── store/
│   └── workoutStore.ts           # AsyncStorage CRUD pro logy sérií
├── constants/
│   └── theme.ts                  # Design tokens (barvy, glass styly, fonty)
├── assets/
│   ├── beep.mp3                  # Zvuk konce odpočtu
│   └── ...                       # Ikony, splash screen
└── start-web.js                  # Launcher pro web preview
```

### Datový tok

```
Google Sheets (CSV)
       │
       ▼
sheetsParser.ts ── fetchWorkoutData() ──▶ WorkoutBlock[]
       │                                      │
       │                                      ▼
       │                              app/index.tsx (seznam bloků)
       │                                      │
       │                                      ▼
       │                         app/workout/[blockId].tsx (cviky)
       │                                      │
       │                                      ▼
       │                    app/exercise/[blockId]/[exerciseId].tsx
       │                         │                    │
       │                         ▼                    ▼
       │                   RestTimer.tsx        workoutStore.ts
       │                   (odpočet)            (uložení série)
       ▼
  AsyncStorage
  (workout_log_{blockId}_{YYYY-MM-DD})
```

---

## Zdroj dat – CSV struktura

**URL:** Publikovaný Google Sheet exportovaný jako CSV.

| Řádky   | Obsah                                                       |
|---------|-------------------------------------------------------------|
| 0–8     | Osobní údaje (přeskočeny)                                   |
| 9+      | Bloky tréninků oddělené řádky `VOLUME` / `STRENGHT` / `DELOAD` / `-` |

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

Funkce: `saveSet()`, `getLog()`, `clearLog()`

---

## Licence

Soukromý projekt.
