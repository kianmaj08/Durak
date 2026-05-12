"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { findLobbyByCode, joinLobby, LobbyRow } from "@/lib/lobby";
import { getPlayerId, getNickname } from "@/lib/playerId";
import { LobbyRoom } from "@/components/LobbyRoom";
import { GameTable } from "@/components/GameTable";
import { getSupabase } from "@/lib/supabase";

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [lobby, setLobby] = useState<LobbyRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("lobby");

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const found = await findLobbyByCode(code);
      if (cancelled) return;
      if (!found) {
        setError("Lobby nicht gefunden.");
        return;
      }
      setLobby(found);
      setPhase(found.phase);
      const playerId = getPlayerId();
      const nick = getNickname();
      if (!nick) {
        router.replace(`/join?code=${code}`);
        return;
      }
      try {
        await joinLobby(found.id, playerId, nick);
      } catch (e) {
        if (found.phase !== "lobby") {
          setError(e instanceof Error ? e.message : "Beitritt fehlgeschlagen");
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  useEffect(() => {
    if (!lobby) return;
    const supa = getSupabase();
    const ch = supa
      .channel(`lobby-${lobby.id}-phase`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lobbies", filter: `id=eq.${lobby.id}` },
        (payload) => {
          const next = (payload.new as LobbyRow).phase;
          setPhase(next);
        }
      )
      .subscribe();
    return () => {
      supa.removeChannel(ch);
    };
  }, [lobby]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4">Ups.</h1>
          <p className="text-ink-300 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-lg bg-gold text-ink-900 font-medium hover:bg-gold-light transition"
          >
            Zur Startseite
          </button>
        </div>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-ink-300">Lade Lobby…</div>
      </main>
    );
  }

  if (phase === "lobby") {
    return <LobbyRoom lobby={lobby} />;
  }
  return <GameTable lobby={lobby} />;
}
