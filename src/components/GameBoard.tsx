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

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function GameBoard({ playWithAI, playerName, onBack }: GameBoardProps) {
  const { 
    volumeMaster, setVolumeMaster, 
    volumeBGM, setVolumeBGM, 
    volumeSFX, setVolumeSFX,
    playSFX 
  } = useAudio();
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  // Time management state
  const gameDuration = 10;
  const [redTime, setRedTime] = useState(10 * 60000);
  const [blackTime, setBlackTime] = useState(10 * 60000);
  const lastTickRef = useRef(0);

  // Animation state
  const [animatingMove, setAnimatingMove] = useState<Move | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const isAnimatingRef = useRef(false);

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

    // Draw last move marker (previous position)
    const lastMove = gs.moveLog[gs.moveLog.length - 1];
    if (lastMove) {
      const centerX = lastMove.startCol * SQ_SIZE + SQ_SIZE / 2;
      const centerY = lastMove.startRow * SQ_SIZE + SQ_SIZE / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255, 215, 0, 0.4)"; // Semi-transparent gold
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }


    // Draw check indicator
    if (gs.inCheck()) {
      const [kr, kc] = gs.redToMove ? gs.redKingLocation : gs.blackKingLocation;
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 4;
      // Pulsing effect using animationProgress if animating, otherwise static
      const pulse = 2 + Math.abs(Math.sin(tick / 5)) * 2; 
      ctx.strokeRect(kc * SQ_SIZE + pulse, kr * SQ_SIZE + pulse, SQ_SIZE - pulse * 2, SQ_SIZE - pulse * 2);
      
      ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
      ctx.fillRect(kc * SQ_SIZE, kr * SQ_SIZE, SQ_SIZE, SQ_SIZE);
    }


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
        if (piece !== "--" && PIECE_IMGS[piece]) {
          // If this piece is currently animating, don't draw it at its board position
          if (animatingMove && r === animatingMove.startRow && c === animatingMove.startCol) continue;
          ctx.drawImage(PIECE_IMGS[piece], c * SQ_SIZE, r * SQ_SIZE, SQ_SIZE, SQ_SIZE);
        }
      }
    }

    // Draw the animating piece
    if (animatingMove && PIECE_IMGS[animatingMove.pieceMoved]) {
      const { startRow, startCol, endRow, endCol, pieceMoved } = animatingMove;
      
      // Easing: Ease-In-Out
      const ease = animationProgress < 0.5 
        ? 2 * animationProgress * animationProgress 
        : 1 - Math.pow(-2 * animationProgress + 2, 2) / 2;

      const currentX = startCol * SQ_SIZE + (endCol - startCol) * SQ_SIZE * ease;
      const currentY = startRow * SQ_SIZE + (endRow - startRow) * SQ_SIZE * ease;

      // Lift effect: shadow + scale
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      const scale = 1.1;
      const offset = (SQ_SIZE * (scale - 1)) / 2;
      ctx.drawImage(
        PIECE_IMGS[pieceMoved], 
        currentX - offset, 
        currentY - offset, 
        SQ_SIZE * scale, 
        SQ_SIZE * scale
      );
      ctx.restore();
    }
  }, [animatingMove, animationProgress]);

  const handleGameEnd = useCallback((
    gs: GameState, 
    isCheckMate: boolean, 
    isTimeOut: boolean = false, 
    timeOutMsg: string = "",
    customMsg: string = ""
  ) => {
    if (customMsg) {
      if (customMsg.includes("Đỏ thắng")) playSFX("victory");
      else if (customMsg.includes("Đen thắng")) playSFX("defeat");
      else playSFX("notify"); // Hòa
      setWinMessage(customMsg);
    } else if (isTimeOut) {
      const playerWon = gs.redToMove;
      playSFX(playerWon ? "victory" : "defeat");
      setWinMessage(timeOutMsg);
    } else if (isCheckMate) {
      const playerWon = !gs.redToMove;
      playSFX(playerWon ? "victory" : "defeat");
      setWinMessage(gs.redToMove ? "Đen thắng!" : "Đỏ thắng!");
    } else {
      playSFX("notify");
      setWinMessage("Hòa cờ!");
    }
  }, [playSFX]);

  const performMove = useCallback((move: Move) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setAnimatingMove(move);
    setAnimationProgress(0);

    const duration = 250; // ms
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        const gs = gsRef.current;
        gs.makeMove(move);
        playSFX(move.pieceCaptured !== "--" ? "capture" : "move");

        validMovesRef.current = gs.getValidMoves();
        sqSelectedRef.current = null;
        playerClicksRef.current = [];
        setRedToMove(gs.redToMove);
        setTick(t => t + 1); // Update UI
        
        setAnimatingMove(null);
        setAnimationProgress(0);
        isAnimatingRef.current = false;

        // Play check sound if the move resulted in a check
        if (gs.inCheck() && !gs.checkMate) {
          playSFX("check");
        }

        // Bí tử = Thua (tương đương checkMate đối với hàm handleGameEnd cũ)
        if (gs.checkMate || gs.staleMate) {
          handleGameEnd(gs, true); // Truyền isCheckMate = true để xử thắng/thua luôn
        } else if (gs.lossByPerpetualCheck) {
          const winner = gs.redToMove ? "Đỏ thắng" : "Đen thắng";
          const loser = gs.redToMove ? "Đen" : "Đỏ";
          handleGameEnd(gs, false, false, "", `${winner} (Phe ${loser} vi phạm Trường chiếu)!`);
        } else if (gs.drawBy60Moves) {
          handleGameEnd(gs, false, false, "", "Hòa cờ (Luật 60 nước không ăn quân)!");
        } else if (gs.drawByRepetition) {
          handleGameEnd(gs, false, false, "", "Hòa cờ (Lặp lại trạng thái trò chơi 3 lần)!");
        } else if (playWithAI && !gs.redToMove) {
          scheduleAI();
        }
      }
    };

    requestAnimationFrame(animate);
  }, [playSFX, playWithAI, handleGameEnd]); // Note: scheduleAI is defined later, might need careful ordering or ref.

  const scheduleAI = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setAiThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const gs = gsRef.current;
      const moves = validMovesRef.current;
      if (moves.length === 0) { setAiThinking(false); return; }
      // Truyền thêm blackTime cho AI để AI không nghĩ quá lố số giờ còn lại
      const aiMove = findBestMove(gs, moves);
      if (aiMove) {
        performMove(aiMove);
      }
      setAiThinking(false);
    }, 50); // Giảm delay ảo xuống 50ms để không bị trừ lố thời gian
  }, [performMove]);

  useEffect(() => {
    loadImages().then(() => {
      gsRef.current = new GameState();
      validMovesRef.current = gsRef.current.getValidMoves();
      setReady(true);
      setTick(0);
      lastTickRef.current = Date.now();
      playSFX("start");
    });
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [playSFX]);

  useEffect(() => { if (ready) draw(); }, [ready, draw]);

  useEffect(() => {
    if (!ready || winMessage || animatingMove) {
      lastTickRef.current = Date.now();
      return;
    }
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      if (redToMove) {
        setRedTime(prev => {
          const next = Math.max(0, prev - elapsed);
          if (next === 0 && prev > 0) {
            setTimeout(() => handleGameEnd(gsRef.current, false, true, "Đen thắng do Đỏ hết thời gian!"), 0);
          }
          return next;
        });
      } else {
        setBlackTime(prev => {
          const next = Math.max(0, prev - elapsed);
          if (next === 0 && prev > 0) {
            setTimeout(() => handleGameEnd(gsRef.current, false, true, "Đỏ thắng do Đen hết thời gian!"), 0);
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [ready, winMessage, animatingMove, redToMove, handleGameEnd]);

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
        performMove(validMove);
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
    setRedTime(gameDuration * 60000);
    setBlackTime(gameDuration * 60000);
    lastTickRef.current = Date.now();
    setTick(t => t + 1); // Force clear captured items tray
    draw();
  }, [draw, gameDuration]);

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
      
      {/* ── TOP RIGHT: Guide & Settings ── */}
      <div className="absolute top-5 right-5 z-20 flex gap-3">
        {/* Guide button */}
        <button
          onClick={() => {
            playSFX("notify");
            setShowRules(true);
          }}
          className="w-10 h-10 rounded-full bg-yellow-400 text-black font-bold text-xl shadow-lg hover:bg-yellow-300 transition-all border-2 border-yellow-700 flex items-center justify-center"
          title="Luật chơi"
        >
          ?
        </button>

        {/* Settings button */}
        <button
          onClick={() => {
            playSFX("notify");
            setShowSettings(true);
          }}
          className="w-10 h-10 rounded-full bg-black/50 text-yellow-500 hover:text-yellow-300 transition-all flex items-center justify-center shadow-lg border border-yellow-500/30 backdrop-blur-sm"
          title="Cài đặt"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>
      
      {/* ── LEFT COLUMN: Opponent & Back ── */}
      <div className="relative z-10 w-[180px] h-full flex flex-col justify-between py-6">
        <div className="flex flex-col gap-3">
          <PlayerCard
            avatar={opponentAvatar}
            name={opponentName}
            color="Đen (黑)"
            isActive={!redToMove}
            thinking={aiThinking && !redToMove}
            timeLeft={blackTime}
          />
          <CapturedTray pieces={opponentCaptured} side="top" />
        </div>

        <button
          onClick={() => {
            playSFX("notify");
            onBack();
          }}
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
            timeLeft={redTime}
          />
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div
          className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            playSFX("notify");
            setShowRules(false);
          }}
        >
          <div className="relative w-[80vw] max-w-3xl" onClick={e => e.stopPropagation()}>
            <NextImage
              src="/assets/img/luatchoi.jpg"
              alt="Luật chơi"
              width={900}
              height={700}
              className="w-full h-auto rounded-xl shadow-2xl border-2 border-yellow-500"
            />
            <button
              onClick={() => {
                playSFX("notify");
                setShowRules(false);
              }}
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
          className="absolute inset-0 z-[101] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            playSFX("notify");
            setShowSettings(false);
          }}
        >
          <div
            className="bg-black/80 w-[90vw] max-w-[450px] rounded-2xl p-8 border border-yellow-500/50 shadow-2xl relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-center relative mb-10">
              <button
                onClick={() => {
                  playSFX("notify");
                  setShowSettings(false);
                }}
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

              <div className="flex items-center justify-between gap-6">
                <div className="w-32 py-2 px-1 text-center font-bold text-yellow-200 border border-yellow-500/50 rounded-lg text-sm bg-white/5 shrink-0 uppercase tracking-wide">
                  Thời gian
                </div>
                <div className="flex-1 flex gap-2">
                  <div className="flex-1 py-1.5 font-bold rounded-lg border bg-yellow-500 text-black border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)] text-center">
                    10 Phút
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
  avatar, name, color, isActive, thinking, timeLeft
}: {
  avatar: string;
  name: string;
  color: string;
  isActive: boolean;
  thinking: boolean;
  timeLeft: number;
}) {
  const isDanger = timeLeft <= 60000 && timeLeft > 0;
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
        <div className={`text-2xl font-black tracking-widest my-0.5 ${
          isDanger ? "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "text-yellow-400 drop-shadow-md"
        }`} style={{ fontFamily: "monospace" }}>
          {formatTime(timeLeft)}
        </div>
        {isActive && (
          <span className="text-xs text-yellow-300 font-semibold mt-0.5">
            {thinking ? "Đang suy nghĩ..." : "● Đến lượt"}
          </span>
        )}
      </div>
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
