"use client";

const KEY = "durak.playerId";

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      "p_" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("durak.nickname") ?? "";
}

export function setNickname(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("durak.nickname", name);
}
