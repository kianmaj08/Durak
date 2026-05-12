"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { findLobbyByCode, joinLobby } from "@/lib/lobby";
import { getPlayerId, setNickname, getNickname } from "@/lib/playerId";

function JoinForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [code, setCode] = useState("");
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const presetCode = sp.get("code");
    if (presetCode) setCode(presetCode.replace(/\D/g, "").slice(0, 5));
    const existing = getNickname();
    if (existing) setNick(existing);
  }, [sp]);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{5}$/.test(code)) {
      setError("Code muss aus 5 Ziffern bestehen.");
      return;
    }
    if (!nick.trim() || nick.trim().length < 2) {
      setError("Nickname (min. 2 Zeichen).");
      return;
    }
    setLoading(true);
    try {
      const lobby = await findLobbyByCode(code);
      if (!lobby) {
        setError("Keine Lobby mit diesem Code gefunden.");
        setLoading(false);
        return;
      }
      const playerId = getPlayerId();
      setNickname(nick.trim());
      await joinLobby(lobby.id, playerId, nick.trim());
      router.push(`/play/${lobby.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Beitritt");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-md"
    >
      <button onClick={() => router.back()} className="text-ink-400 text-sm mb-8 hover:text-gold transition">
        ← Zurück
      </button>
      <h1 className="font-display text-5xl mb-2">Lobby beitreten</h1>
      <p className="text-ink-300 mb-8">Gib den 5-stelligen Code ein, den dein Freund mit dir geteilt hat.</p>

      <form onSubmit={onJoin} className="space-y-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-400 mb-3">Lobby-Code</label>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3, 4].map((i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code[i] ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  const newCode = (code.slice(0, i) + v + code.slice(i + 1)).slice(0, 5);
                  setCode(newCode);
                  if (v && i < 4) {
                    const next = document.getElementById(`code-${i + 1}`);
                    next?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !code[i] && i > 0) {
                    document.getElementById(`code-${i - 1}`)?.focus();
                  }
                }}
                id={`code-${i}`}
                autoFocus={i === 0}
                className="w-12 h-14 text-center text-2xl font-mono rounded-lg bg-ink-800 border border-ink-700 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition"
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-400 mb-2">Dein Nickname</label>
          <input
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={16}
            placeholder="z.B. Lena"
            className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition"
          />
        </div>
        {error && <div className="text-sm text-ember-light">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 rounded-lg bg-gold text-ink-900 font-medium hover:bg-gold-light transition disabled:opacity-50"
        >
          {loading ? "Trete bei..." : "Beitreten →"}
        </button>
      </form>
    </motion.div>
  );
}

export default function JoinPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900" />
      <Suspense fallback={<div className="text-ink-300">Laden...</div>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
