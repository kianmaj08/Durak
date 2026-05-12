# Durak

> Дурак — das beliebteste Kartenspiel Russlands, online mit Freunden im Browser.

Erstelle eine Lobby, teile den 5-stelligen Code oder den QR-Code, und spielt zu zweit, zu dritt oder zu viert. Echtzeit-Multiplayer via Supabase. Deployed auf Vercel.

## Features

- 5-stelliger Lobby-Code + QR für sofortigen Beitritt vom Handy
- 2–4 Spieler, Gastmodus (kein Login)
- Vollständige Durak-Regeln (Podkidnoy): Trumpf, Nachwerfen, Aufnehmen, Bito
- Echtzeit-Sync via Supabase Postgres + Realtime
- Animierte Karten, Felt-Tisch-Ästhetik, kein generisches AI-Design
- Responsive — funktioniert auf Handy und Desktop

## Lokales Setup

### 1. Dependencies installieren

```bash
bun install
# oder: npm install / pnpm install
```

### 2. Supabase Projekt anlegen

1. Auf [supabase.com](https://supabase.com) registrieren
2. Neues Projekt erstellen (kostenloses Tier reicht)
3. Im SQL-Editor das Schema laden:

```bash
cat supabase/schema.sql | pbcopy   # macOS, dann im SQL-Editor einfügen
```

Oder einfach `supabase/schema.sql` öffnen, Inhalt kopieren, im Supabase SQL-Editor ausführen.

### 3. Environment Variables

`.env.local` anlegen (siehe `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Beide Werte findest du in Supabase unter **Project Settings → API**.

### 4. Dev-Server starten

```bash
bun run dev
# → http://localhost:3000
```

## Deployment auf Vercel

1. Code zu GitHub pushen (siehe unten)
2. Auf [vercel.com](https://vercel.com) → **Add New Project** → GitHub-Repo importieren
3. Im Import-Schritt unter **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy** klicken — Vercel erkennt Next.js automatisch

## Push zu GitHub

```bash
cd durak
git init
git add .
git commit -m "Initial commit"
gh repo create durak --public --source=. --push
# oder manuell: git remote add origin git@github.com:<user>/durak.git && git push -u origin main
```

## Architektur

```
src/
  app/
    page.tsx            # Landing
    create/page.tsx     # Lobby erstellen (Nickname)
    join/page.tsx       # Lobby beitreten (Code + Nickname)
    play/[code]/page.tsx # Lobby-Room + Spieltisch (Phase-Switch)
  components/
    PlayingCard.tsx     # Animierte Spielkarte
    CardBack.tsx        # Verdeckter Stapel
    QRCode.tsx          # QR-Generator
    LobbyRoom.tsx       # Warteraum mit Code + QR + Spielerliste
    GameTable.tsx       # Spieltisch (Hand, Angriff, Verteidigung)
  game/
    types.ts            # Card, GameState, etc.
    engine.ts           # Pure Game-Logik: initGame, attack, defend, take, endTurn
  lib/
    supabase.ts         # Supabase Client (lazy)
    lobby.ts            # Lobby CRUD + Realtime Helpers
    playerId.ts         # Persistente Gast-ID via localStorage
supabase/
  schema.sql            # 3 Tabellen + Realtime + RLS
```

## Sicherheitshinweis

Dies ist ein Casual-Game für Freunde. Die Realtime-Tabellen sind via offener RLS-Policy lesbar/schreibbar — jeder mit dem 5-stelligen Code (1:100.000) und dem anon-Key sieht den Game-State inkl. aller Hände. Für richtigen Cheat-Schutz müsste die Move-Validierung in Supabase Edge Functions/RPCs verlagert werden und Hände pro Spieler privat gespeichert werden. Für die meisten Freunde-Spiele aber overkill.

## Lizenz

MIT
