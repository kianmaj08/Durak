export type Suit = "S" | "H" | "D" | "C";
export type Rank = 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_GLYPH: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export const SUIT_LABEL_DE: Record<Suit, string> = {
  S: "Pik",
  H: "Herz",
  D: "Karo",
  C: "Kreuz",
};

export const RANK_LABEL: Record<Rank, string> = {
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "B",
  12: "D",
  13: "K",
  14: "A",
};

export const RANK_LABEL_LONG_DE: Record<Rank, string> = {
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "Bube",
  12: "Dame",
  13: "König",
  14: "Ass",
};

export type Phase = "lobby" | "playing" | "finished";

export interface BattlePair {
  attack: Card;
  defense: Card | null;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  seat: number;
  handCount: number;
  isOut: boolean;
  connected: boolean;
}

export interface GameState {
  phase: Phase;
  trumpSuit: Suit | null;
  trumpCard: Card | null;
  deckCount: number;
  discardCount: number;
  players: PublicPlayer[];
  attackerSeat: number;
  defenderSeat: number;
  battle: BattlePair[];
  helperSeats: number[];
  durakSeat: number | null;
  turnCounter: number;
  lastAction: string | null;
}

export interface PrivateState {
  hand: Card[];
}

export interface FullState extends GameState {
  deck: Card[];
  discard: Card[];
  hands: Record<string, Card[]>;
}
