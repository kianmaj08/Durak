"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LobbyRow, loadGameState, saveGameState } from "@/lib/lobby";
import { getPlayerId } from "@/lib/playerId";
import { getSupabase } from "@/lib/supabase";
import { Card, FullState, RANK_LABEL, SUIT_GLYPH } from "@/game/types";
import { attack, defend, take, endTurn, sortHand, cardKey } from "@/game/engine";
import { PlayingCard } from "./PlayingCard";
import { MiniDeck } from "./CardBack";
import { cn } from "@/lib/cn";

export function GameTable({ lobby }: { lobby: LobbyRow }) {
  const router = useRouter();
  const me = getPlayerId();
  const [state, setState] = useState<FullState | null>(null);
  const [selected, setSelected] = useState<Card | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGameState(lobby.id).then((s) => !cancelled && s && setState(s));
    const supa = getSupabase();
    const ch = supa
      .channel(`game-${lobby.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_states", filter: `lobby_id=eq.${lobby.id}` },
        (payload) => {
          const next = (payload.new as { state?: FullState })?.state;
          if (next) setState(next);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supa.removeChannel(ch);
    };
  }, [lobby.id]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function commit(next: FullState) {
    setState(next);
    setSelected(null);
    try {
      await saveGameState(lobby.id, next);
    } catch (e) {
      flash("Speichern fehlgeschlagen, lade neu...");
      const fresh = await loadGameState(lobby.id);
      if (fresh) setState(fresh);
    }
  }

  const mySeat = state ? state.players.findIndex((p) => p.id === me) : -1;
  const myHand = state ? state.hands[me] ?? [] : [];
  const trumpSuit = state?.trumpSuit ?? null;
  const sortedHand = useMemo(() => sortHand(myHand, trumpSuit), [myHand, trumpSuit]);
  const opponents = useMemo(() => {
    if (!state || mySeat < 0) return state?.players ?? [];
    const arr: typeof state.players = [];
    for (let i = 1; i < state.players.length; i++) {
      arr.push(state.players[(mySeat + i) % state.players.length]);
    }
    return arr;
  }, [state, mySeat]);

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center felt-bg">
        <div className="text-ink-100">Spiel wird geladen…</div>
      </main>
    );
  }

  const isAttacker = mySeat === state.attackerSeat;
  const isDefender = mySeat === state.defenderSeat;
  const isHelper = state.helperSeats.includes(mySeat);
  const undefended = state.battle.filter((b) => b.defense === null);
  const canAttack = (isAttacker || (isHelper && state.battle.length > 0)) && undefended.length === 0;
  const canDefend = isDefender && undefended.length > 0;

  async function onPlayCard() {
    if (!selected || acting || !state) return;
    setActing(true);
    try {
      if (canDefend) {
        const idx = state.battle.findIndex((b) => b.defense === null);
        const r = defend(state, me, idx, selected);
        if (!r.ok) flash(r.error ?? "Fehler");
        else if (r.state) await commit(r.state);
      } else if (canAttack || (isAttacker && state.battle.length === 0)) {
        const r = attack(state, me, [selected]);
        if (!r.ok) flash(r.error ?? "Fehler");
        else if (r.state) await commit(r.state);
      } else {
        flash("Du bist nicht dran.");
      }
    } finally {
      setActing(false);
    }
  }

  async function onTake() {
    if (acting || !state) return;
    setActing(true);
    try {
      const r = take(state, me);
      if (!r.ok) flash(r.error ?? "Fehler");
      else if (r.state) await commit(r.state);
    } finally {
      setActing(false);
    }
  }

  async function onDone() {
    if (acting || !state) return;
    setActing(true);
    try {
      const r = endTurn(state, me);
      if (!r.ok) flash(r.error ?? "Fehler");
      else if (r.state) await commit(r.state);
    } finally {
      setActing(false);
    }
  }

  const yourTurnText = (() => {
    if (state.phase === "finished") return null;
    if (isDefender && undefended.length > 0) return "Verteidige oder nimm auf";
    if (isAttacker && state.battle.length === 0) return "Du greifst an — wähle eine Karte";
    if (isAttacker && undefended.length === 0 && state.battle.length > 0) return "Lege nach oder drücke Fertig";
    if (isHelper && undefended.length === 0 && state.battle.length > 0) return "Du kannst nachlegen";
    return null;
  })();

  return (
    <main className="min-h-screen felt-bg relative overflow-hidden">
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)",
      }} />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <button onClick={() => router.push("/")} className="text-ink-100/70 hover:text-gold text-sm transition">
          ← Verlassen
        </button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-100/60">
          <span>Code</span>
          <span className="font-mono text-gold">{lobby.code}</span>
        </div>
      </div>

      {/* Trump + Deck */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
        <div className="text-[10px] uppercase tracking-widest text-ink-100/60">Trumpf</div>
        <div className="relative">
          {state.trumpCard && state.deckCount > 0 && (
            <div className="absolute -left-1 top-2 rotate-90 origin-bottom-left">
              <PlayingCard card={state.trumpCard} size="md" trump={state.trumpSuit} />
            </div>
          )}
          {state.deckCount > 0 && (
            <div className="ml-16">
              <MiniDeck count={state.deckCount} />
            </div>
          )}
          {state.deckCount === 0 && state.trumpCard && (
            <div className="ml-2">
              <div className="text-[10px] uppercase tracking-widest text-ink-100/60 mb-1">Farbe</div>
              <div className={cn("w-16 h-16 rounded-lg bg-ink-900/50 border border-gold/40 flex items-center justify-center text-5xl",
                state.trumpSuit === "H" || state.trumpSuit === "D" ? "text-ember" : "text-ink-50")}>
                {SUIT_GLYPH[state.trumpSuit!]}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discard pile */}
      {state.discardCount > 0 && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-100/60">Ablage</div>
          <div className="relative w-20 h-[112px]">
            {Array.from({ length: Math.min(state.discardCount, 4) }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-lg bg-ink-900/60 border border-ink-700/50"
                style={{ transform: `translate(${i * 1.5}px, ${-i}px) rotate(${(i - 1.5) * 8}deg)` }}
              />
            ))}
          </div>
          <div className="font-mono text-xs text-ink-300">{state.discardCount}</div>
        </div>
      )}

      {/* Opponents */}
      <div className={cn("relative z-10 grid w-full px-12 pt-8",
        opponents.length === 1 && "grid-cols-1 place-items-center",
        opponents.length === 2 && "grid-cols-2",
        opponents.length === 3 && "grid-cols-3"
      )}>
        {opponents.map((p, i) => {
          const isTheirTurn = p.seat === state.attackerSeat || p.seat === state.defenderSeat;
          const role = p.seat === state.attackerSeat ? "Angreifer" : p.seat === state.defenderSeat ? "Verteidiger" : null;
          return (
            <div key={p.id} className={cn("flex flex-col items-center gap-2",
              opponents.length === 3 && i === 1 && "col-start-2",
              opponents.length === 2 && i === 0 && "items-start",
              opponents.length === 2 && i === 1 && "items-end"
            )}>
              <div className={cn("relative flex items-center gap-3 px-4 py-2 rounded-full transition",
                isTheirTurn ? "bg-gold/20 border border-gold/40" : "bg-ink-900/40 border border-ink-700/40",
                p.isOut && "opacity-40"
              )}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-display text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, hsl(${(p.seat * 90) % 360} 60% 45%), hsl(${(p.seat * 90 + 30) % 360} 60% 35%))` }}
                >
                  {p.nickname[0]?.toUpperCase()}
                </div>
                <div className="text-sm text-ink-50">
                  <div className="font-medium leading-tight">{p.nickname}</div>
                  {role && <div className="text-[10px] text-gold uppercase tracking-widest">{role}</div>}
                  {p.isOut && <div className="text-[10px] text-emerald-400 uppercase tracking-widest">Fertig</div>}
                </div>
                {isTheirTurn && !p.isOut && (
                  <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-gold pulse-ring text-gold" />
                )}
              </div>
              <div className="flex -space-x-6">
                {Array.from({ length: Math.min(p.handCount, 8) }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-9 h-12 rounded-md bg-gradient-to-br from-ember via-ember-dark to-[#5a1d0a] border border-gold/30 card-shadow"
                    style={{ transform: `rotate(${(idx - p.handCount / 2) * 4}deg)` }}
                  />
                ))}
                {p.handCount === 0 && <span className="text-xs text-emerald-400">✓ Out</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Battle area */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-8 px-6">
        <div className="min-h-[180px] w-full max-w-3xl flex items-center justify-center">
          {state.battle.length === 0 ? (
            <div className="text-center">
              <div className="text-ink-100/40 text-sm font-display italic">Tisch ist frei</div>
              {yourTurnText && (
                <motion.div
                  key={yourTurnText}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-gold text-sm tracking-widest uppercase"
                >
                  {yourTurnText}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 justify-center items-center">
              <AnimatePresence>
                {state.battle.map((b, i) => (
                  <motion.div
                    key={`${cardKey(b.attack)}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.6, y: -30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative"
                  >
                    <PlayingCard card={b.attack} size="md" trump={state.trumpSuit} rotation={-4} />
                    {b.defense && (
                      <motion.div
                        initial={{ opacity: 0, x: -10, y: -10, rotate: 0 }}
                        animate={{ opacity: 1, x: 12, y: 12, rotate: 14 }}
                        transition={{ type: "spring", stiffness: 250, damping: 22 }}
                        className="absolute inset-0"
                      >
                        <PlayingCard card={b.defense} size="md" trump={state.trumpSuit} />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="relative z-20 px-6 mb-4 flex items-center justify-center gap-3">
        {isDefender && undefended.length > 0 && state.battle.length > 0 && (
          <button
            onClick={onTake}
            disabled={acting}
            className="px-6 py-3 rounded-lg bg-ember text-ink-50 font-medium hover:bg-ember-light transition shadow-lg shadow-ember/30 disabled:opacity-50"
          >
            Aufnehmen
          </button>
        )}
        {(isAttacker || isHelper) && state.battle.length > 0 && undefended.length === 0 && (
          <button
            onClick={onDone}
            disabled={acting}
            className="px-6 py-3 rounded-lg bg-emerald-600 text-ink-50 font-medium hover:bg-emerald-500 transition shadow-lg disabled:opacity-50"
          >
            Fertig (Bito)
          </button>
        )}
        {selected && (
          <button
            onClick={onPlayCard}
            disabled={acting}
            className="px-6 py-3 rounded-lg bg-gold text-ink-900 font-medium hover:bg-gold-light transition shadow-lg shadow-gold/30 disabled:opacity-50"
          >
            {canDefend ? `${RANK_LABEL[selected.rank]}${SUIT_GLYPH[selected.suit]} schlagen` : `${RANK_LABEL[selected.rank]}${SUIT_GLYPH[selected.suit]} legen`}
          </button>
        )}
      </div>

      {/* My hand */}
      <div className="relative z-20 pb-8 px-6">
        <div className="flex justify-center items-end" style={{ minHeight: "120px" }}>
          <div className="relative flex justify-center" style={{ width: Math.min(sortedHand.length, 14) * 48 + 80 }}>
            <AnimatePresence>
              {sortedHand.map((c, i) => {
                const n = sortedHand.length;
                const center = (n - 1) / 2;
                const offset = i - center;
                const rot = offset * 4;
                const x = offset * Math.min(50, 600 / Math.max(n, 4));
                const y = Math.abs(offset) * 2;
                const isSel = selected && selected.suit === c.suit && selected.rank === c.rank;
                return (
                  <motion.div
                    key={cardKey(c)}
                    layout
                    initial={{ opacity: 0, y: 80, scale: 0.7 }}
                    animate={{ opacity: 1, x, y, rotate: rot, scale: 1 }}
                    exit={{ opacity: 0, y: -80, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24, delay: i * 0.02 }}
                    style={{ position: "absolute", left: "50%", transformOrigin: "bottom center", marginLeft: -40 }}
                  >
                    <PlayingCard
                      card={c}
                      size="md"
                      trump={state.trumpSuit}
                      selectable
                      selected={!!isSel}
                      onClick={() =>
                        setSelected(isSel ? null : c)
                      }
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {sortedHand.length === 0 && state.players.find((p) => p.id === me)?.isOut && (
              <div className="text-center text-emerald-400 font-display text-xl">Du bist raus — gut gespielt!</div>
            )}
          </div>
        </div>
      </div>

      {/* Game over overlay */}
      {state.phase === "finished" && (
        <FinishedOverlay state={state} mySeat={mySeat} onReturn={() => router.push("/")} />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-ink-900/90 border border-ember/40 text-ember-light text-sm shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function FinishedOverlay({ state, mySeat, onReturn }: { state: FullState; mySeat: number; onReturn: () => void }) {
  const durakName = state.durakSeat !== null ? state.players[state.durakSeat]?.nickname : null;
  const youAreDurak = mySeat === state.durakSeat;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="text-center max-w-md px-8"
      >
        <div className="font-display italic text-7xl text-gold mb-4">{youAreDurak ? "Дурак" : "Konec"}</div>
        <p className="text-xl text-ink-100 mb-2">
          {youAreDurak
            ? "Du bist der Narr!"
            : durakName
            ? `${durakName} ist der Narr.`
            : "Spiel beendet."}
        </p>
        <p className="text-ink-300 mb-8 text-sm">
          {youAreDurak ? "Beim nächsten Mal vielleicht." : "Glückwunsch — du bist raus."}
        </p>
        <button
          onClick={onReturn}
          className="px-6 py-3 rounded-lg bg-gold text-ink-900 font-medium hover:bg-gold-light transition"
        >
          Zur Startseite
        </button>
      </motion.div>
    </motion.div>
  );
}
