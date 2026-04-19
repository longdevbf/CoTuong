"use client";
import { useState } from "react";
import Image from "next/image";

interface HomeScreenProps {
  onStart: (name: string) => void;
}

export default function HomeScreen({ onStart }: HomeScreenProps) {
  const [name, setName] = useState("");
  const [showRules, setShowRules] = useState(false);

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onStart(trimmed);
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <Image
        src="/assets/img/bgmanhinhchinh.png"
        alt="background"
        fill
        className="object-cover"
        priority
      />

      {/* ? button top-right */}
      <button
        onClick={() => setShowRules(true)}
        className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-yellow-400 text-black font-bold text-xl shadow-lg hover:bg-yellow-300 transition-all border-2 border-yellow-700 flex items-center justify-center"
        title="Luật chơi"
      >
        ?
      </button>

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-6 bg-black/60 backdrop-blur-sm border border-yellow-600/50 rounded-2xl px-12 py-10 shadow-2xl min-w-[360px]">
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-5xl font-bold text-yellow-300 drop-shadow-lg tracking-widest" style={{ fontFamily: "serif" }}>
            象棋
          </h1>
          <h2 className="text-2xl font-semibold text-yellow-100 tracking-wide">Cờ Tướng</h2>
          <div className="w-24 h-0.5 bg-yellow-500/60 mt-1" />
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-yellow-200 text-sm font-medium tracking-wide">Tên người chơi</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleStart()}
            placeholder="Nhập tên của bạn..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-yellow-500/50 text-white placeholder-white/40 text-base outline-none focus:border-yellow-400 focus:bg-white/15 transition-all"
          />
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-800/50 disabled:cursor-not-allowed text-black font-bold text-lg shadow-md transition-all duration-150 tracking-wide"
        >
          Bắt đầu chơi
        </button>

        {/* Rules hint */}
        <p className="text-white/40 text-xs">
          Nhấn{" "}
          <button onClick={() => setShowRules(true)} className="text-yellow-400 underline hover:text-yellow-300">
            ?
          </button>{" "}
          để xem luật chơi
        </p>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowRules(false)}
        >
          <div
            className="relative w-[80vw] max-w-3xl"
            onClick={e => e.stopPropagation()}
          >
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
