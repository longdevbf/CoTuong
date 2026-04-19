"use client";
import { useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import Menu from "@/components/Menu";
import GameBoard from "@/components/GameBoard";
import Guide from "@/components/Guide";
import { AudioProvider } from "@/contexts/AudioContext";

type Screen = "home" | "menu" | "pvp" | "ai" | "guide";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [playerName, setPlayerName] = useState("Người chơi");

  const handleStart = (name: string) => {
    setPlayerName(name);
    setScreen("menu");
  };

  const renderScreen = () => {
    if (screen === "home") return <HomeScreen onStart={handleStart} />;
    if (screen === "pvp") return <GameBoard playWithAI={false} playerName={playerName} onBack={() => setScreen("menu")} />;
    if (screen === "ai")  return <GameBoard playWithAI={true}  playerName={playerName} onBack={() => setScreen("menu")} />;
    if (screen === "guide") return <Guide onBack={() => setScreen("menu")} />;
  
    return (
      <Menu
        playerName={playerName}
        onPlayPvP={() => setScreen("pvp")}
        onPlayAI={() => setScreen("ai")}
        onGuide={() => setScreen("guide")}
        onBack={() => setScreen("home")}
      />
    );
  };

  return (
    <AudioProvider>
      {renderScreen()}
    </AudioProvider>
  );
}
