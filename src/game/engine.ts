import {
  Card,
  FullState,
  GameState,
  PublicPlayer,
  Rank,
  Suit,
  SUITS,
  RANKS,
  BattlePair,
} from "./types";

function shuffled<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeDeck(): Card[] {
  const cards: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) cards.push({ suit: s, rank: r });
  return cards;
}

export function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}

export function parseCard(k: string): Card {
  const suit = k[0] as Suit;
  const rank = parseInt(k.slice(1)) as Rank;
  return { suit, rank };
}

export function beats(attack: Card, defense: Card, trump: Suit): boolean {
  if (defense.suit === attack.suit) return defense.rank > attack.rank;
  if (defense.suit === trump && attack.suit !== trump) return true;
  return false;
}

export interface InitConfig {
  playerIds: string[];
  nicknames: Record<string, string>;
  seed?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initGame(cfg: InitConfig): FullState {
  const { playerIds, nicknames } = cfg;
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("Durak braucht 2-4 Spieler");
  }
  const rng = cfg.seed ? mulberry32(cfg.seed) : Math.random;
  const deck = shuffled(makeDeck(), rng);

  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) hands[id] = [];
  for (let i = 0; i < 6; i++) {
    for (const id of playerIds) {
      const c = deck.shift()!;
      hands[id].push(c);
    }
  }
  const trumpCard = deck[deck.length - 1];
  const trumpSuit = trumpCard.suit;

  let attackerSeat = 0;
  let lowestTrump: Rank = 15 as Rank;
  for (let i = 0; i < playerIds.length; i++) {
    const id = playerIds[i];
    for (const c of hands[id]) {
      if (c.suit === trumpSuit && c.rank < lowestTrump) {
        lowestTrump = c.rank;
        attackerSeat = i;
      }
    }
  }
  const defenderSeat = (attackerSeat + 1) % playerIds.length;

  const players: PublicPlayer[] = playerIds.map((id, seat) => ({
    id,
    nickname: nicknames[id] ?? `Spieler ${seat + 1}`,
    seat,
    handCount: hands[id].length,
    isOut: false,
    connected: true,
  }));

  return {
    phase: "playing",
    trumpSuit,
    trumpCard,
    deckCount: deck.length,
    discardCount: 0,
    players,
    attackerSeat,
    defenderSeat,
    battle: [],
    helperSeats: helpersFor(players, attackerSeat, defenderSeat),
    durakSeat: null,
    turnCounter: 0,
    lastAction: null,
    deck,
    discard: [],
    hands,
  };
}

function activePlayerCount(players: PublicPlayer[]): number {
  return players.filter((p) => !p.isOut).length;
}

function nextActiveSeat(players: PublicPlayer[], from: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const s = (from + step) % n;
    if (!players[s].isOut) return s;
  }
  return from;
}

function helpersFor(players: PublicPlayer[], attackerSeat: number, defenderSeat: number): number[] {
  if (activePlayerCount(players) <= 2) return [];
  const helpers: number[] = [];
  for (let i = 0; i < players.length; i++) {
    if (i === attackerSeat || i === defenderSeat) continue;
    if (players[i].isOut) continue;
    helpers.push(i);
  }
  return helpers;
}

function ranksOnTable(battle: BattlePair[]): Set<Rank> {
  const s = new Set<Rank>();
  for (const b of battle) {
    s.add(b.attack.rank);
    if (b.defense) s.add(b.defense.rank);
  }
  return s;
}

function removeCardFromHand(hand: Card[], c: Card): boolean {
  const idx = hand.findIndex((x) => x.suit === c.suit && x.rank === c.rank);
  if (idx < 0) return false;
  hand.splice(idx, 1);
  return true;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  state?: FullState;
}

function seatOfPlayer(state: FullState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function maxAttacksThisBattle(state: FullState): number {
  const defender = state.players[state.defenderSeat];
  const defHandStart = defender.handCount + state.battle.filter((b) => b.defense !== null).length;
  return Math.min(6, defHandStart);
}

export function attack(state: FullState, playerId: string, cards: Card[]): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Spiel läuft nicht." };
  if (cards.length === 0) return { ok: false, error: "Keine Karte gewählt." };
  const seat = seatOfPlayer(state, playerId);
  if (seat < 0) return { ok: false, error: "Unbekannter Spieler." };
  if (seat === state.defenderSeat) return { ok: false, error: "Verteidiger greift nicht an." };

  const isInitial = state.battle.length === 0;
  if (isInitial && seat !== state.attackerSeat)
    return { ok: false, error: "Nur der Angreifer beginnt." };
  if (!isInitial && seat !== state.attackerSeat && !state.helperSeats.includes(seat))
    return { ok: false, error: "Du darfst nicht angreifen." };

  const undefendedCount = state.battle.filter((b) => b.defense === null).length;
  if (undefendedCount > 0 && !isInitial)
    return { ok: false, error: "Erst muss der Verteidiger reagieren." };

  const allRanksSame = cards.every((c) => c.rank === cards[0].rank);
  if (!allRanksSame) return { ok: false, error: "Karten müssen gleichen Rang haben." };

  if (!isInitial) {
    const allowed = ranksOnTable(state.battle);
    if (!allowed.has(cards[0].rank))
      return { ok: false, error: "Rang nicht im Spiel." };
  }

  const maxAttacks = maxAttacksThisBattle(state);
  if (state.battle.length + cards.length > maxAttacks)
    return { ok: false, error: `Maximal ${maxAttacks} Angriffe.` };

  const hand = state.hands[playerId];
  for (const c of cards) {
    if (!hand.some((x) => x.suit === c.suit && x.rank === c.rank))
      return { ok: false, error: "Karte nicht in deiner Hand." };
  }

  const next = cloneState(state);
  const nh = next.hands[playerId];
  for (const c of cards) {
    removeCardFromHand(nh, c);
    next.battle.push({ attack: c, defense: null });
  }
  next.players[seat].handCount = nh.length;
  next.turnCounter += 1;
  next.lastAction = `${state.players[seat].nickname} greift an.`;
  return { ok: true, state: next };
}

export function defend(
  state: FullState,
  playerId: string,
  attackIndex: number,
  defenseCard: Card
): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Spiel läuft nicht." };
  const seat = seatOfPlayer(state, playerId);
  if (seat !== state.defenderSeat) return { ok: false, error: "Nur der Verteidiger." };
  const pair = state.battle[attackIndex];
  if (!pair) return { ok: false, error: "Ungültiger Angriff." };
  if (pair.defense) return { ok: false, error: "Bereits geschlagen." };
  if (!state.trumpSuit) return { ok: false, error: "Kein Trumpf." };
  if (!beats(pair.attack, defenseCard, state.trumpSuit))
    return { ok: false, error: "Diese Karte schlägt nicht." };

  const hand = state.hands[playerId];
  if (!hand.some((x) => x.suit === defenseCard.suit && x.rank === defenseCard.rank))
    return { ok: false, error: "Karte nicht in deiner Hand." };

  const next = cloneState(state);
  removeCardFromHand(next.hands[playerId], defenseCard);
  next.battle[attackIndex] = { attack: pair.attack, defense: defenseCard };
  next.players[seat].handCount = next.hands[playerId].length;
  next.turnCounter += 1;
  next.lastAction = `${state.players[seat].nickname} schlägt.`;
  return { ok: true, state: next };
}

export function take(state: FullState, playerId: string): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Spiel läuft nicht." };
  const seat = seatOfPlayer(state, playerId);
  if (seat !== state.defenderSeat) return { ok: false, error: "Nur der Verteidiger nimmt." };
  if (state.battle.length === 0) return { ok: false, error: "Nichts zu nehmen." };
  const undefended = state.battle.some((b) => b.defense === null);
  if (!undefended) return { ok: false, error: "Alles geschlagen — drücke Fertig." };

  const next = cloneState(state);
  next.lastAction = `${state.players[seat].nickname} nimmt auf.`;
  return finishBattle(next, "take");
}

export function endTurn(state: FullState, playerId: string): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Spiel läuft nicht." };
  const seat = seatOfPlayer(state, playerId);
  if (seat === state.defenderSeat) return { ok: false, error: "Verteidiger drückt nicht Fertig." };
  if (state.battle.length === 0) return { ok: false, error: "Kein laufender Angriff." };
  const undefended = state.battle.some((b) => b.defense === null);
  if (undefended) return { ok: false, error: "Verteidiger ist noch dran." };

  const next = cloneState(state);
  next.lastAction = `Verteidiger hat alles geschlagen.`;
  return finishBattle(next, "beat");
}

function finishBattle(state: FullState, outcome: "beat" | "take"): ActionResult {
  if (outcome === "take") {
    const defenderId = state.players[state.defenderSeat].id;
    for (const b of state.battle) {
      state.hands[defenderId].push(b.attack);
      if (b.defense) state.hands[defenderId].push(b.defense);
    }
    state.players[state.defenderSeat].handCount = state.hands[defenderId].length;
  } else {
    for (const b of state.battle) {
      state.discard.push(b.attack);
      if (b.defense) state.discard.push(b.defense);
    }
    state.discardCount = state.discard.length;
  }
  state.battle = [];

  const drawOrder: number[] = [];
  drawOrder.push(state.attackerSeat);
  for (const h of state.helperSeats) drawOrder.push(h);
  if (outcome === "beat") drawOrder.push(state.defenderSeat);

  for (const seat of drawOrder) {
    const id = state.players[seat].id;
    while (state.hands[id].length < 6 && state.deck.length > 1) {
      state.hands[id].push(state.deck.shift()!);
    }
    if (state.hands[id].length < 6 && state.deck.length === 1) {
      state.hands[id].push(state.deck.shift()!);
    }
    state.players[seat].handCount = state.hands[id].length;
  }
  if (outcome === "take") {
    const defId = state.players[state.defenderSeat].id;
    while (state.hands[defId].length < 6 && state.deck.length > 0) {
      state.hands[defId].push(state.deck.shift()!);
    }
    state.players[state.defenderSeat].handCount = state.hands[defId].length;
  }
  state.deckCount = state.deck.length;

  for (const p of state.players) {
    if (!p.isOut && p.handCount === 0 && state.deck.length === 0) {
      p.isOut = true;
    }
  }

  const remaining = state.players.filter((p) => !p.isOut);
  if (remaining.length <= 1) {
    state.phase = "finished";
    state.durakSeat = remaining[0]?.seat ?? null;
    return { ok: true, state };
  }

  let newAttacker: number;
  if (outcome === "beat") {
    newAttacker = state.players[state.defenderSeat].isOut
      ? nextActiveSeat(state.players, state.defenderSeat)
      : state.defenderSeat;
  } else {
    newAttacker = nextActiveSeat(state.players, state.defenderSeat);
  }
  const newDefender = nextActiveSeat(state.players, newAttacker);

  state.attackerSeat = newAttacker;
  state.defenderSeat = newDefender;
  state.helperSeats = helpersFor(state.players, newAttacker, newDefender);
  state.turnCounter += 1;
  return { ok: true, state };
}

function cloneState(s: FullState): FullState {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p })),
    battle: s.battle.map((b) => ({ attack: { ...b.attack }, defense: b.defense ? { ...b.defense } : null })),
    helperSeats: [...s.helperSeats],
    deck: s.deck.map((c) => ({ ...c })),
    discard: s.discard.map((c) => ({ ...c })),
    hands: Object.fromEntries(Object.entries(s.hands).map(([k, v]) => [k, v.map((c) => ({ ...c }))])),
    trumpCard: s.trumpCard ? { ...s.trumpCard } : null,
  };
}

export function toPublicState(s: FullState): GameState {
  const { deck: _d, discard: _di, hands: _h, ...pub } = s;
  return pub;
}

export function sortHand(hand: Card[], trump: Suit | null): Card[] {
  const suitOrder: Suit[] = ["S", "H", "D", "C"];
  return [...hand].sort((a, b) => {
    const at = a.suit === trump;
    const bt = b.suit === trump;
    if (at !== bt) return at ? 1 : -1;
    const sa = suitOrder.indexOf(a.suit);
    const sb = suitOrder.indexOf(b.suit);
    if (sa !== sb) return sa - sb;
    return a.rank - b.rank;
  });
}
