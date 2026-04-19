"use client";
import { useState } from "react";
import Image from "next/image";

interface MenuProps {
  playerName: string;
  onPlayPvP: () => void;
  onPlayAI: () => void;
  onGuide: () => void;
}

export default function Menu({ playerName, onPlayPvP, onPlayAI, onGuide }: MenuProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
      <Image src="/assets/img/bgmanhinhchinh.png" alt="background" fill className="object-cover" priority />

      {/* ? button */}
      <button
        onClick={() => setShowRules(true)}
        className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-yellow-400 text-black font-bold text-xl shadow-lg hover:bg-yellow-300 transition-all border-2 border-yellow-700 flex items-center justify-center"
        title="Luật chơi"
      >
        ?
      </button>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1 mb-2">
          <h1 className="text-5xl font-bold text-yellow-300 drop-shadow-lg tracking-widest" style={{ fontFamily: "serif" }}>
            象棋
          </h1>
          <h2 className="text-2xl font-semibold text-yellow-100">Cờ Tướng</h2>
          <p className="text-white/60 text-sm mt-1">Chào, <span className="text-yellow-300 font-semibold">{playerName}</span>!</p>
        </div>
        <MenuButton label="Hai người chơi" onClick={onPlayPvP} />
        <MenuButton label="Chơi với máy"   onClick={onPlayAI} />
        <MenuButton label="Luật chơi"       onClick={onGuide} />
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowRules(false)}
        >
          <div className="relative w-[80vw] max-w-3xl" onClick={e => e.stopPropagation()}>
            <Image
              src="/assets/img/luatchoi.jpg"
              alt="Luật chơi"
              width={900}
              height={700}
              className="w-full h-auto rounded-xl shadow-2xl border-2 border-yellow-500"
            />
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg flex items-center justify-center shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-56 py-3 text-xl font-semibold text-black bg-yellow-200 border-2 border-yellow-600 rounded-lg shadow-md hover:bg-yellow-400 hover:text-yellow-900 transition-all duration-150"
    >
      {label}
    </button>
  );
}
