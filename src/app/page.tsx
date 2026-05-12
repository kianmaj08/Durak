"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { hasSupabaseConfig } from "@/lib/supabase";

export default function Home() {
  const [configured, setConfigured] = useState(true);
  useEffect(() => setConfigured(hasSupabaseConfig()), []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(217, 74, 43, 0.25), transparent), radial-gradient(ellipse 70% 60% at 50% 100%, rgba(20, 61, 52, 0.5), transparent)",
        }}
      />
      <FloatingCards />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center font-display italic text-gold font-bold">
              D
            </div>
            <span className="font-display text-xl tracking-wide">Durak</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-ink-300">
            <a href="#rules" className="hover:text-gold transition">Regeln</a>
            <a href="#about" className="hover:text-gold transition">Über</a>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs tracking-widest uppercase mb-8"
            >
              Дурак · Das russische Kartenspiel
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-6xl md:text-8xl font-medium leading-[0.95] tracking-tight mb-6"
            >
              Wer zuletzt Karten hat,<br />
              <span className="italic text-gold">ist der Narr.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-ink-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Erstelle eine Lobby, teile den 5-stelligen Code oder den QR mit deinen Freunden,
              und spielt das beliebteste Kartenspiel Russlands zusammen — direkt im Browser.
            </motion.p>

            {!configured && (
              <div className="max-w-xl mx-auto mb-8 p-4 rounded-lg border border-ember/30 bg-ember/10 text-sm text-ember-light">
                Supabase ist nicht konfiguriert. Lege <code className="font-mono">.env.local</code> mit den Keys an.
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/create"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gold text-ink-900 font-medium tracking-wide hover:bg-gold-light transition shadow-lg shadow-gold/20"
              >
                Neue Lobby erstellen
                <span className="group-hover:translate-x-1 transition">→</span>
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-ink-300/30 text-ink-100 hover:border-gold hover:text-gold transition"
              >
                Einer Lobby beitreten
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Rules teaser */}
        <section id="rules" className="px-6 py-24 max-w-5xl mx-auto w-full">
          <div className="grid md:grid-cols-3 gap-8">
            <RuleCard
              num="01"
              title="36 Karten, ein Trumpf"
              body="Jeder bekommt 6 Karten. Die letzte aufgedeckte Karte bestimmt die Trumpffarbe — sie schlägt alles andere."
            />
            <RuleCard
              num="02"
              title="Angriff & Verteidigung"
              body="Der Angreifer legt eine Karte. Der Verteidiger schlägt sie — mit höherer Karte derselben Farbe oder mit Trumpf."
            />
            <RuleCard
              num="03"
              title="Wer übrig bleibt, verliert"
              body="Wer als Erster alle Karten los wird, ist raus. Der letzte mit Karten in der Hand ist der Дурак — der Narr."
            />
          </div>
        </section>

        <footer className="mt-auto px-6 py-8 border-t border-ink-700/50 text-center text-xs text-ink-400">
          Spaß-Projekt · Multiplayer via Supabase · Open Source
        </footer>
      </div>
    </main>
  );
}

function RuleCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group p-6 rounded-xl border border-ink-700/50 bg-ink-800/30 backdrop-blur hover:border-gold/40 transition"
    >
      <div className="font-mono text-xs text-gold/60 mb-2 tracking-widest">{num}</div>
      <h3 className="font-display text-2xl mb-3 group-hover:text-gold transition">{title}</h3>
      <p className="text-ink-300 text-sm leading-relaxed">{body}</p>
    </motion.div>
  );
}

function FloatingCards() {
  const cards = [
    { suit: "♠", rank: "A", x: "8%", y: "20%", rot: -15, delay: 0 },
    { suit: "♥", rank: "K", x: "85%", y: "15%", rot: 12, delay: 0.5 },
    { suit: "♦", rank: "Q", x: "10%", y: "75%", rot: 8, delay: 1 },
    { suit: "♣", rank: "B", x: "88%", y: "70%", rot: -18, delay: 1.5 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {cards.map((c, i) => {
        const red = c.suit === "♥" || c.suit === "♦";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ duration: 1.2, delay: c.delay }}
            className="absolute"
            style={{ left: c.x, top: c.y, transform: `rotate(${c.rot}deg)` }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-28 rounded-lg bg-gradient-to-br from-ink-50 to-ink-100 border border-ink-200 card-shadow flex flex-col items-center justify-between p-2"
              style={{ color: red ? "#a83417" : "#1a1813" }}
            >
              <div className="self-start font-display text-lg leading-none">{c.rank}</div>
              <div className="font-display text-3xl">{c.suit}</div>
              <div className="self-end rotate-180 font-display text-lg leading-none">{c.rank}</div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
