"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createLobby } from "@/lib/lobby";
import { getPlayerId, setNickname, getNickname } from "@/lib/playerId";

export default function CreatePage() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getNickname();
    if (existing) setNick(existing);
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nick.trim() || nick.trim().length < 2) {
      setError("Nickname (min. 2 Zeichen)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const playerId = getPlayerId();
      setNickname(nick.trim());
      const lobby = await createLobby(playerId, nick.trim());
      router.push(`/play/${lobby.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <button onClick={() => router.back()} className="text-ink-400 text-sm mb-8 hover:text-gold transition">
          ← Zurück
        </button>
        <h1 className="font-display text-5xl mb-2">Neue Lobby</h1>
        <p className="text-ink-300 mb-8">Wähle deinen Nickname. Du bekommst danach einen 5-stelligen Code und einen QR-Code.</p>
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-400 mb-2">Dein Nickname</label>
            <input
              type="text"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={16}
              autoFocus
              placeholder="z.B. Sascha"
              className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 text-ink-50 transition"
            />
          </div>
          {error && <div className="text-sm text-ember-light">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-gold text-ink-900 font-medium hover:bg-gold-light transition disabled:opacity-50"
          >
            {loading ? "Erstelle..." : "Lobby öffnen →"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
