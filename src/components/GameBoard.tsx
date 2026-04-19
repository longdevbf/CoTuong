"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import NextImage from "next/image";
import { GameState, Move, createMove, movesEqual } from "@/lib/ChessEngine";
import { findBestMove } from "@/lib/AIEngine";
import { SQ_SIZE, WIDTH_BOARD, HEIGHT_BOARD, RED_PIECES, BLACK_PIECES } from "@/lib/constants";
import WinScreen from "./WinScreen";

import { useAudio } from "@/contexts/AudioContext";

interface GameBoardProps {
  playWithAI: boolean;
  playerName: string;
  onBack: () => void;
}

const PIECE_IMGS: Record<string, HTMLImageElement> = {};
let boardImg: HTMLImageElement | null = null;
let canMoveImg: HTMLImageElement | null = null;
let imagesLoaded = false;

function loadImages(): Promise<void> {
  if (imagesLoaded) return Promise.resolve();
  return new Promise(resolve => {
    let count = 0;
    const total = RED_PIECES.length + BLACK_PIECES.length + 2;
    const done = () => { if (++count === total) { imagesLoaded = true; resolve(); } };

    boardImg = new Image(); boardImg.onload = done;
    boardImg.src = "/assets/img/banco.png";
    canMoveImg = new Image(); canMoveImg.onload = done;
    canMoveImg.src = "/assets/img/CanMove.png";

    for (const p of RED_PIECES) {
      const img = new Image(); img.onload = done;
      img.src = `/assets/img/Red/${p}.png`;
      PIECE_IMGS[p] = img;
    }
    for (const p of BLACK_PIECES) {
      const img = new Image(); img.onload = done;
      img.src = `/assets/img/Black/${p}.png`;
      PIECE_IMGS[p] = img;
    }
  });
}

export default function GameBoard({ playWithAI, playerName, onBack }: GameBoardProps) {
  const { playSFX } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef(new GameState());
  const validMovesRef = useRef<Move[]>([]);
  const sqSelectedRef = useRef<[number, number] | null>(null);
  const playerClicksRef = useRef<[number, number][]>([]);
  const [winMessage, setWinMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [redToMove, setRedToMove] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [tick, setTick] = useState(0); // Add tick to force re-render
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player is always Red (bottom), opponent is Black (top)
  const opponentName = playWithAI ? "Máy tính" : "Người chơi 2";
  const opponentAvatar = playWithAI ? "/assets/img/mayheader.png" : "/assets/img/denheader.png";
  const playerAvatar = "/assets/img/userheader.png";

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !boardImg || !canMoveImg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gsRef.current;
    const sq = sqSelectedRef.current;
    const validMoves = validMovesRef.current;

    ctx.drawImage(boardImg, 0, 0, WIDTH_BOARD, HEIGHT_BOARD);

    if (sq) {
      const [r, c] = sq;
      if (gs.board[r][c] !== "--") {
        ctx.fillStyle = "rgba(0,100,255,0.4)";
        ctx.fillRect(c * SQ_SIZE, r * SQ_SIZE, SQ_SIZE, SQ_SIZE);

        for (const move of validMoves) {
          if (move.startRow !== r || move.startCol !== c) continue;
          let color = "rgba(0,220,0,0.45)";
          if (move.pieceCaptured !== "--") {
            const enemyKing = gs.redToMove ? "b_king" : "r_king";
            color = move.pieceCaptured === enemyKing ? "rgba(220,0,0,0.5)" : "rgba(255,140,0,0.45)";
          }
          ctx.fillStyle = color;
          ctx.fillRect(move.endCol * SQ_SIZE, move.endRow * SQ_SIZE, SQ_SIZE, SQ_SIZE);
          const dotX = move.endCol * SQ_SIZE + (SQ_SIZE - 15) / 2;
          const dotY = move.endRow * SQ_SIZE + (SQ_SIZE - 15) / 2;
          ctx.drawImage(canMoveImg!, dotX, dotY, 15, 15);
        }
      }
    }

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = gs.board[r][c];
        if (piece !== "--" && PIECE_IMGS[piece])
          ctx.drawImage(PIECE_IMGS[piece], c * SQ_SIZE, r * SQ_SIZE, SQ_SIZE, SQ_SIZE);
      }
    }
  }, []);

  const handleGameEnd = (gs: GameState, isCheckMate: boolean) => {
    if (isCheckMate) {
      const playerWon = !gs.redToMove;
      playSFX(playerWon ? "victory" : "defeat");
      setWinMessage(gs.redToMove ? "Đen thắng!" : "Đỏ thắng!");
    } else {
      playSFX("defeat");
      setWinMessage("Hòa cờ!");
    }
  };

  const scheduleAI = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setAiThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const gs = gsRef.current;
      const moves = validMovesRef.current;
      if (moves.length === 0) { setAiThinking(false); return; }
      const aiMove = findBestMove(gs, moves);
      if (aiMove) {
        gs.makeMove(aiMove);
        playSFX(aiMove.pieceCaptured !== "--" ? "capture" : "move");
        
        validMovesRef.current = gs.getValidMoves();
        setRedToMove(gs.redToMove);
        setTick(t => t + 1); // Update UI
        if (gs.checkMate || gs.staleMate) handleGameEnd(gs, gs.checkMate);
        draw();
      }
      setAiThinking(false);
    }, 300);
  }, [draw, playSFX]);

  useEffect(() => {
    loadImages().then(() => {
      gsRef.current = new GameState();
      validMovesRef.current = gsRef.current.getValidMoves();
      setReady(true);
      setTick(0);
      playSFX("start");
    });
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [playSFX]);

  useEffect(() => { if (ready) draw(); }, [ready, draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (winMessage) return;
    const gs = gsRef.current;
    const isHumanTurn = gs.redToMove || !playWithAI;
    if (!isHumanTurn) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH_BOARD / rect.width;
    const scaleY = HEIGHT_BOARD / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / SQ_SIZE);
    const row = Math.floor(y / SQ_SIZE);

    if (row < 0 || row >= 10 || col < 0 || col >= 9) return;

    const sq = sqSelectedRef.current;
    if (sq && sq[0] === row && sq[1] === col) {
      sqSelectedRef.current = null;
      playerClicksRef.current = [];
      draw();
      return;
    }

    sqSelectedRef.current = [row, col];
    playerClicksRef.current.push([row, col]);

    if (playerClicksRef.current.length === 2) {
      const [start, end] = playerClicksRef.current;
      const move = createMove(start, end, gs.board);
      const validMove = validMovesRef.current.find(m => movesEqual(m, move));
      if (validMove) {
        gs.makeMove(validMove);
        playSFX(validMove.pieceCaptured !== "--" ? "capture" : "move");

        validMovesRef.current = gs.getValidMoves();
        sqSelectedRef.current = null;
        playerClicksRef.current = [];
        setRedToMove(gs.redToMove);
        setTick(t => t + 1); // Update UI

        if (gs.checkMate || gs.staleMate) {
          handleGameEnd(gs, gs.checkMate);
        } else if (playWithAI) {
          scheduleAI();
        }
      } else {
        playerClicksRef.current = [[row, col]];
      }
    }
    draw();
  }, [winMessage, playWithAI, draw, scheduleAI, playSFX]);

  const handleRestart = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    gsRef.current = new GameState();
    validMovesRef.current = gsRef.current.getValidMoves();
    sqSelectedRef.current = null;
    playerClicksRef.current = [];
    setRedToMove(true);
    setAiThinking(false);
    setWinMessage(null);
    setTick(t => t + 1); // Force clear captured items tray
    draw();
  }, [draw]);

  // Whose turn label for sidebar
  const isMyTurn = redToMove; // player is always Red
  const turnLabel = playWithAI
    ? (redToMove ? "Lượt của bạn" : "Máy đang đi...")
    : (redToMove ? "Lượt Đỏ" : "Lượt Đen");

  const moveLog = gsRef.current?.moveLog || [];
  const playerCaptured = moveLog.filter(m => m.pieceMoved.startsWith("r") && m.pieceCaptured !== "--").map(m => m.pieceCaptured);
  const opponentCaptured = moveLog.filter(m => m.pieceMoved.startsWith("b") && m.pieceCaptured !== "--").map(m => m.pieceCaptured);

  return (
    <div className="relative w-full h-screen bg-[#120800] overflow-hidden flex items-center justify-between px-8 md:px-16">
      <NextImage src="/assets/img/gamebackground.png" alt="game background" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-black/50 z-0" />
      
      {/* ── LEFT COLUMN: Opponent & Back ── */}
      <div className="relative z-10 w-[180px] h-full flex flex-col justify-between py-6">
        <div className="flex flex-col gap-3">
          <PlayerCard
            avatar={opponentAvatar}
            name={opponentName}
            color="Đen (黑)"
            isActive={!redToMove}
            thinking={aiThinking && !redToMove}
          />
          <CapturedTray pieces={opponentCaptured} side="top" />
        </div>

        <button
          onClick={onBack}
          className="self-start px-5 py-3 bg-red-700/80 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/50 transition-all border border-red-500/50 flex items-center gap-2"
        >
          <span>←</span> Thoát
        </button>
      </div>

      {/* ── CENTER COLUMN: Board ── */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 h-full flex-1">
        {/* Turn indicator */}
        <div className={`px-8 py-2 rounded-full text-base font-bold shadow-xl border transition-all duration-300 text-center tracking-wide ${
          isMyTurn
            ? "bg-red-700/80 border-red-400 text-white shadow-red-900/50"
            : "bg-gray-800/80 border-gray-500 text-gray-200 shadow-black/50"
        }`}>
          {aiThinking ? "Máy đang nghĩ..." : turnLabel}
        </div>

        {ready ? (
          <div className="relative shadow-2xl rounded bg-black/20">
            <canvas
              ref={canvasRef}
              width={WIDTH_BOARD}
              height={HEIGHT_BOARD}
              className="block cursor-pointer"
              style={{ maxHeight: "calc(100vh - 140px)", width: "auto" }}
              onClick={handleClick}
            />
            {winMessage && (
              <WinScreen message={winMessage} onBack={onBack} onRestart={handleRestart} />
            )}
          </div>
        ) : (
          <div className="text-white text-2xl font-bold animate-pulse">Đang tải bàn cờ...</div>
        )}

        {/* Restart Button */}
        <button
          onClick={handleRestart}
          className="px-6 py-2 bg-yellow-600/80 hover:bg-yellow-500 text-white rounded-full text-sm font-bold shadow-lg shadow-yellow-900/50 transition-all border border-yellow-500/50"
        >
          ↺ Ván mới
        </button>
      </div>

      {/* ── RIGHT COLUMN: Player ── */}
      <div className="relative z-10 w-[180px] h-full flex flex-col justify-end py-6">
        <div className="flex flex-col gap-3">
          <CapturedTray pieces={playerCaptured} side="bottom" />
          <PlayerCard
            avatar={playerAvatar}
            name={playerName}
            color="Đỏ (紅)"
            isActive={redToMove}
            thinking={false}
          />
        </div>
      </div>
    </div>
  );
}

function CapturedTray({ pieces, side }: { pieces: string[], side: "top" | "bottom" }) {
  if (pieces.length === 0) return <div className="h-16" />; // space placeholder
  
  // Group pieces
  const groupedPieces = pieces.reduce((acc, p) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`flex flex-wrap gap-2 p-3 rounded-2xl border bg-black/40 shadow-inner ${
      side === "top" ? "border-gray-600/50" : "border-red-900/50"
    } min-h-[4rem] justify-center items-start`}>
      {Object.entries(groupedPieces).map(([p, count]) => (
        <div key={p} className="flex flex-col items-center relative">
          <div className="relative w-7 h-7 drop-shadow-md">
             <NextImage 
               src={`/assets/img/${p.startsWith("r") ? "Red" : "Black"}/${p}.png`} 
               fill 
               alt={p} 
               className="object-cover" 
             />
          </div>
          {count > 1 && (
            <span className="text-[10px] font-bold text-yellow-400 mt-0.5 -mb-2">x{count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PlayerCard({
  avatar, name, color, isActive, thinking,
}: {
  avatar: string;
  name: string;
  color: string;
  isActive: boolean;
  thinking: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
      isActive
        ? "border-yellow-400 bg-yellow-900/40 shadow-yellow-500/20"
        : "border-white/10 bg-white/5"
    }`}>
      {/* Avatar */}
      <div className={`relative flex-shrink-0 rounded-full overflow-hidden border-4 transition-all duration-300 ${
        isActive ? "border-yellow-400 shadow-lg shadow-yellow-500/40" : "border-white/20"
      }`} style={{ width: 52, height: 52 }}>
        <NextImage src={avatar} alt={name} fill className="object-cover" />
        {isActive && (
          <div className="absolute inset-0 rounded-full ring-2 ring-yellow-300 ring-offset-1 ring-offset-transparent animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col items-center gap-0.5 w-full">
        <span className="text-white font-bold text-xs truncate max-w-full text-center">{name}</span>
        <span className="text-xs font-medium text-gray-300 text-center">{color}</span>
        {isActive && (
          <span className="text-xs text-yellow-300 font-semibold mt-0.5">
            {thinking ? "Đang suy nghĩ..." : "● Đến lượt"}
          </span>
        )}
      </div>
    </div>
  );
}
