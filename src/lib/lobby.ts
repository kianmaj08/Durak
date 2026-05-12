"use client";
import { getSupabase } from "./supabase";
import { FullState } from "@/game/types";
import { initGame } from "@/game/engine";

export function generateCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export interface LobbyRow {
  id: string;
  code: string;
  host_id: string;
  phase: string;
  created_at: string;
}

export interface LobbyPlayerRow {
  id: string;
  lobby_id: string;
  player_id: string;
  nickname: string;
  seat: number;
  is_host: boolean;
}

export async function createLobby(playerId: string, nickname: string): Promise<LobbyRow> {
  const supa = getSupabase();
  let code = generateCode();
  for (let tries = 0; tries < 5; tries++) {
    const { data, error } = await supa
      .from("lobbies")
      .insert({ code, host_id: playerId, phase: "lobby" })
      .select()
      .single();
    if (!error && data) {
      await supa.from("lobby_players").insert({
        lobby_id: data.id,
        player_id: playerId,
        nickname,
        seat: 0,
        is_host: true,
      });
      return data;
    }
    code = generateCode();
  }
  throw new Error("Konnte keine eindeutige Lobby erstellen.");
}

export async function findLobbyByCode(code: string): Promise<LobbyRow | null> {
  const supa = getSupabase();
  const { data, error } = await supa
    .from("lobbies")
    .select()
    .eq("code", code)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function joinLobby(
  lobbyId: string,
  playerId: string,
  nickname: string
): Promise<LobbyPlayerRow> {
  const supa = getSupabase();
  const { data: existing } = await supa
    .from("lobby_players")
    .select()
    .eq("lobby_id", lobbyId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (existing) {
    if (existing.nickname !== nickname) {
      await supa
        .from("lobby_players")
        .update({ nickname })
        .eq("id", existing.id);
    }
    return { ...existing, nickname };
  }
  const { data: players } = await supa
    .from("lobby_players")
    .select("seat")
    .eq("lobby_id", lobbyId);
  const usedSeats = new Set((players ?? []).map((p) => p.seat));
  let seat = 0;
  while (usedSeats.has(seat)) seat++;
  if (seat >= 4) throw new Error("Lobby ist voll (max 4).");

  const { data, error } = await supa
    .from("lobby_players")
    .insert({
      lobby_id: lobbyId,
      player_id: playerId,
      nickname,
      seat,
      is_host: false,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Beitritt fehlgeschlagen.");
  return data;
}

export async function leaveLobby(lobbyId: string, playerId: string) {
  const supa = getSupabase();
  await supa
    .from("lobby_players")
    .delete()
    .eq("lobby_id", lobbyId)
    .eq("player_id", playerId);
}

export async function listPlayers(lobbyId: string): Promise<LobbyPlayerRow[]> {
  const supa = getSupabase();
  const { data, error } = await supa
    .from("lobby_players")
    .select()
    .eq("lobby_id", lobbyId)
    .order("seat", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLobby(lobbyId: string): Promise<LobbyRow | null> {
  const supa = getSupabase();
  const { data } = await supa.from("lobbies").select().eq("id", lobbyId).maybeSingle();
  return data;
}

export async function startGame(lobbyId: string): Promise<void> {
  const supa = getSupabase();
  const players = await listPlayers(lobbyId);
  if (players.length < 2) throw new Error("Mindestens 2 Spieler nötig.");
  if (players.length > 4) throw new Error("Max 4 Spieler.");
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const ids = sorted.map((p) => p.player_id);
  const nicks: Record<string, string> = {};
  for (const p of sorted) nicks[p.player_id] = p.nickname;
  const initial = initGame({ playerIds: ids, nicknames: nicks });
  const { error: gErr } = await supa.from("game_states").upsert({
    lobby_id: lobbyId,
    state: initial,
    turn_counter: initial.turnCounter,
    updated_at: new Date().toISOString(),
  });
  if (gErr) throw gErr;
  await supa.from("lobbies").update({ phase: "playing" }).eq("id", lobbyId);
}

export async function loadGameState(lobbyId: string): Promise<FullState | null> {
  const supa = getSupabase();
  const { data } = await supa
    .from("game_states")
    .select("state")
    .eq("lobby_id", lobbyId)
    .maybeSingle();
  return (data?.state as FullState) ?? null;
}

export async function saveGameState(lobbyId: string, state: FullState): Promise<void> {
  const supa = getSupabase();
  const { error } = await supa
    .from("game_states")
    .update({
      state,
      turn_counter: state.turnCounter,
      updated_at: new Date().toISOString(),
    })
    .eq("lobby_id", lobbyId);
  if (error) throw error;
  if (state.phase === "finished") {
    await supa.from("lobbies").update({ phase: "finished" }).eq("id", lobbyId);
  }
}
