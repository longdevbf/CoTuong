"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

interface AudioContextType {
  volumeMaster: number;
  volumeBGM: number;
  volumeSFX: number;
  setVolumeMaster: (v: number) => void;
  setVolumeBGM: (v: number) => void;
  setVolumeSFX: (v: number) => void;
  playSFX: (type: "move" | "capture" | "victory" | "defeat" | "start" | "notify" | "check") => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within AudioProvider");
  return context;
};

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  // Volume states (0 to 100)
  const [volumeMaster, setVolumeMaster] = useState(50);
  const [volumeBGM, setVolumeBGM] = useState(50);
  const [volumeSFX, setVolumeSFX] = useState(50);

  // Audio references
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Khởi tạo Audio đối tượng lúc client side mount
  useEffect(() => {
    bgmRef.current = new Audio("/assets/audio/bgm.mp3");
    bgmRef.current.loop = true;

    sfxRefs.current = {
      move: new Audio("/assets/audio/move-new.mp3"),
      capture: new Audio("/assets/audio/capture-new.mp3"),
      victory: new Audio("/assets/audio/victory.mp3"),
      defeat: new Audio("/assets/audio/defeat.mp3"),
      start: new Audio("/assets/audio/boardstart.mp3"),
      notify: new Audio("/assets/audio/notify.mp3"),
      check: new Audio("/assets/audio/move-check.mp3"),
    };

    // Yêu cầu tương tác người dùng đầu tiên để phát nhạc nền theo chính sách trình duyệt
    const startBGM = () => {
      bgmRef.current?.play().catch(() => {});
      window.removeEventListener("click", startBGM);
      window.removeEventListener("keydown", startBGM);
    };

    window.addEventListener("click", startBGM);
    window.addEventListener("keydown", startBGM);

    return () => {
      window.removeEventListener("click", startBGM);
      window.removeEventListener("keydown", startBGM);
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.src = "";
      }
    };
  }, []);

  // Update effect của Audio object khi thay đổi thanh gạt
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = (volumeBGM / 100) * (volumeMaster / 100);
    }
    
    const sfxVolume = (volumeSFX / 100) * (volumeMaster / 100);
    Object.values(sfxRefs.current).forEach(audio => {
      audio.volume = sfxVolume;
    });
  }, [volumeMaster, volumeBGM, volumeSFX]);

  const playSFX = useCallback((type: "move" | "capture" | "victory" | "defeat" | "start" | "notify" | "check") => {
    const audio = sfxRefs.current[type];
    if (audio) {
      audio.currentTime = 0; // reset
      audio.play().catch(e => console.warn("Lỗi phát SFX:", e));
    }
  }, []);

  return (
    <AudioContext.Provider value={{
      volumeMaster, volumeBGM, volumeSFX,
      setVolumeMaster, setVolumeBGM, setVolumeSFX,
      playSFX
    }}>
      {children}
    </AudioContext.Provider>
  );
};
