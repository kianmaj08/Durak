"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LobbyRow, LobbyPlayerRow, listPlayers, startGame, leaveLobby } from "@/lib/lobby";
import { getPlayerId } from "@/lib/playerId";
import { getSupabase } from "@/lib/supabase";
import { QRCodeDisplay } from "./QRCode";

export function LobbyRoom({ lobby }: { lobby: LobbyRow }) {
  const router = useRouter();
  const [players, setPlayers] = useState<LobbyPlayerRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [origin, setOrigin] = useState("");

  const me = getPlayerId();
  const isHost = lobby.host_id === me;
  const joinUrl = origin ? `${origin}/join?code=${lobby.code}` : "";

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listPlayers(lobby.id).then((p) => !cancelled && setPlayers(p));
    const supa = getSupabase();
    const ch = supa
      .channel(`lobby-${lobby.id}-players`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobby_players", filter: `lobby_id=eq.${lobby.id}` },
        async () => {
          const next = await listPlayers(lobby.id);
          setPlayers(next);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supa.removeChannel(ch);
    };
  }, [lobby.id]);

  async function copyCode() {
    await navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onStart() {
    setError(null);
    setStarting(true);
    try {
      await startGame(lobby.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte Spiel nicht starten");
      setStarting(false);
    }
  }

  async function onLeave() {
    try {
      await leaveLobby(lobby.id, me);
    } catch {}
    router.push("/");
  }

  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900" />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 50% 40% at 20% 0%, rgba(217, 74, 43, 0.15), transparent), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(201, 166, 74, 0.12), transparent)",
      }} />

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <button
          onClick={onLeave}
          className="text-ink-400 hover:text-gold text-sm transition mb-8"
        >
          ← Lobby verlassen
        </button>

        <div className="grid md:grid-cols-[1.2fr_1fr] gap-12">
          {/* Left: Invite */}
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs tracking-widest uppercase mb-4">
              Lobby offen
            </div>
            <h1 className="font-display text-5xl md:text-6xl mb-2">Warte auf Spieler</h1>
            <p className="text-ink-300 mb-8">Teile den Code oder den QR — beide bringen deine Freunde direkt rein.</p>

            <div className="rounded-2xl border border-ink-700/50 bg-ink-800/50 backdrop-blur p-6 mb-4">
              <div className="text-xs uppercase tracking-widest text-ink-400 mb-3">Lobby-Code</div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {lobby.code.split("").map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="w-14 h-16 rounded-lg bg-gradient-to-b from-ink-900 to-ink-800 border border-gold/30 flex items-center justify-center font-mono text-3xl font-semibold text-gold shadow-inner"
                    >
                      {d}
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={copyCode}
                  className="ml-auto px-4 py-2 rounded-lg border border-ink-600 hover:border-gold hover:text-gold text-sm transition"
                  title="Code kopieren"
                >
                  {copied ? "Kopiert!" : "Kopieren"}
                </button>
              </div>
            </div>

            {joinUrl && (
              <div className="rounded-2xl border border-ink-700/50 bg-ink-800/50 backdrop-blur p-6 flex items-center gap-6">
                <div className="bg-ink-100 p-2 rounded-lg">
                  <QRCodeDisplay value={joinUrl} size={140} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Direkt-Link</div>
                  <div className="text-ink-200 text-sm font-mono break-all mb-3 line-clamp-2">{joinUrl}</div>
                  <button
                    onClick={copyLink}
                    className="text-xs px-3 py-1.5 rounded-md border border-ink-600 hover:border-gold hover:text-gold transition"
                  >
                    Link kopieren
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Players */}
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400 mb-3">
              Spieler ({players.length}/4)
            </div>
            <ul className="space-y-3 mb-6">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-ink-800/50 border border-ink-700/50"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-display text-lg font-medium"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(p.seat * 90) % 360} 60% 45%), hsl(${(p.seat * 90 + 30) % 360} 60% 35%))`,
                      }}
                    >
                      {p.nickname[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{p.nickname}</div>
                      <div className="text-xs text-ink-400">
                        {p.is_host ? "Host" : "Spieler"} · Platz {p.seat + 1}
                      </div>
                    </div>
                    {p.player_id === me && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold">Du</span>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
              {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
                <li
                  key={`empty-${i}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-ink-700/50 text-ink-500 italic text-sm"
                >
                  Warte auf Spieler...
                </li>
              ))}
            </ul>

            {isHost ? (
              <>
                <button
                  onClick={onStart}
                  disabled={players.length < 2 || starting}
                  className="w-full px-6 py-4 rounded-xl bg-gold text-ink-900 font-medium hover:bg-gold-light transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {starting
                    ? "Starte..."
                    : players.length < 2
                    ? "Mindestens 2 Spieler nötig"
                    : `Spiel starten (${players.length} Spieler) →`}
                </button>
                {error && <div className="text-sm text-ember-light mt-3">{error}</div>}
              </>
            ) : (
              <div className="px-6 py-4 rounded-xl border border-ink-700/50 bg-ink-800/30 text-center text-ink-300 text-sm">
                Warte, bis der Host startet…
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
