"use client";
import { useState } from "react";
import Image from "next/image";

interface MenuProps {
  playerName: string;
  onPlayPvP: () => void;
  onPlayAI: () => void;
  onGuide: () => void;
  onBack: () => void;
}

export default function Menu({ playerName, onPlayPvP, onPlayAI, onGuide, onBack }: MenuProps) {
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [volumeMaster, setVolumeMaster] = useState(50);
  const [volumeBGM, setVolumeBGM] = useState(50);
  const [volumeSFX, setVolumeSFX] = useState(50);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
      <Image src="/assets/img/menubackground.png" alt="background" fill className="object-cover" priority />
      {/* Phủ mờ background để text và khung xịn hơn */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* <- Back button */}
      <button
        onClick={onBack}
        className="absolute top-5 left-5 z-20 px-4 py-2 rounded-full bg-black/50 text-yellow-300 font-bold shadow-lg hover:bg-black/80 transition-all border border-yellow-500/30 flex items-center justify-center gap-2"
        title="Quay lại màn hình chính"
      >
        <span>←</span> Thoát
      </button>

      {/* ? button */}
      <button
        onClick={() => setShowRules(true)}
        className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-yellow-400 text-black font-bold text-xl shadow-lg hover:bg-yellow-300 transition-all border-2 border-yellow-700 flex items-center justify-center"
        title="Luật chơi"
      >
        ?
      </button>

      <div className="relative z-10 flex flex-col items-center gap-6 mt-4">
        {/* Box bo viền style HomeScreen bao gồm cả tên game */}
        <div className="bg-black/60 backdrop-blur-md border border-yellow-600/50 rounded-2xl px-12 py-10 shadow-2xl flex flex-col items-center gap-6 relative min-w-[380px]">
          
          <div className="flex flex-col items-center gap-1 mb-2">
            <h1 className="text-5xl font-bold text-yellow-400 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-widest" style={{ fontFamily: "serif" }}>
              象棋
            </h1>
            <h2 className="text-2xl font-semibold text-yellow-100 drop-shadow-md">Cờ Tướng</h2>
            <div className="w-24 h-0.5 bg-yellow-500/60 mt-2 mb-1" />
            <p className="text-white/80 text-sm mt-1">Chào, <span className="text-yellow-300 font-bold">{playerName}</span>!</p>
          </div>

          <div className="flex justify-center items-center w-full mb-2 relative">
            <h3 className="text-2xl font-bold text-gray-200 tracking-wider">Chế độ chơi</h3>
            <button
              onClick={() => setShowSettings(true)}
              className="absolute right-0 text-yellow-500 hover:text-yellow-300 transition-all hover:rotate-90 drop-shadow-lg"
              title="Cài đặt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
          </div>

          <MenuButton label="Hai người chơi" onClick={onPlayPvP} />
          <MenuButton label="Chơi với máy" onClick={onPlayAI} />
          <MenuButton label="Luật chơi" onClick={onGuide} />
        </div>
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

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-black/80 w-[90vw] max-w-[450px] rounded-2xl p-8 border border-yellow-500/50 shadow-2xl relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-center relative mb-10">
              <button
                onClick={() => setShowSettings(false)}
                className="absolute left-0 text-yellow-500 hover:text-yellow-300 font-bold p-1"
                title="Quay lại"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
              </button>
              <h2 className="text-3xl font-extrabold text-yellow-300 uppercase tracking-wider">Cài đặt</h2>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-8">
              <SliderRow label="Tổng thể" value={volumeMaster} onChange={setVolumeMaster} />
              <SliderRow label="Nhạc nền" value={volumeBGM} onChange={setVolumeBGM} />
              <SliderRow label="Âm thao tác" value={volumeSFX} onChange={setVolumeSFX} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="w-32 py-2 px-1 text-center font-bold text-yellow-200 border border-yellow-500/50 rounded-lg text-sm bg-white/5 shrink-0 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex-1 flex items-center relative group">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400 outline-none"
        />
        {/* Lớp màu phủ slider */}
        <div
          className="absolute left-0 h-1.5 bg-yellow-400 rounded-lg pointer-events-none"
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg shadow-md transition-all duration-150 tracking-wide border border-yellow-400/50"
    >
      {label}
    </button>
  );
}
