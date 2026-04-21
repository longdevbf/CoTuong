import { GameState, Move, movesEqual, PIECE_TO_INDEX, ZOBRIST_TABLE, ZOBRIST_SIDE } from "./ChessEngine";

const PIECE_SCORES: Record<string, number> = {
  king: 10000, guard: 200, elephant: 200,
  rook: 900, horse: 400, cannon: 450, pawn: 100,
};

// Transposition Table
const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;
type TTEntry = { depth: number; score: number; flag: number; bestMove: Move | null };
const transpositionTable = new Map<bigint, TTEntry>();

const MAX_TT_SIZE = 500000;
const INF = 1000000;

// Heuristics
let killerMoves: (Move | null)[][] = []; // [depth][2]
let history: number[][][] = []; // [piece_index][row][col]
let nodesVisited = 0;
let startTime = 0;
const TIME_LIMIT = 4800; // 4.8s to be safe

const KING_SCORES = [
  [0,0,0,15,20,15,0,0,0],[0,0,0,10,10,10,0,0,0],[0,0,0,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],[0,0,0,1,1,1,0,0,0],[0,0,0,10,10,10,0,0,0],
  [0,0,0,15,20,15,0,0,0],
];
const ROOK_SCORES = [
  [150,160,150,160,150,160,150,160,150],[160,170,160,160,150,160,160,170,160],
  [170,180,170,170,160,170,170,180,170],[170,190,200,220,240,220,200,190,170],
  [180,220,210,240,250,240,210,220,180],[180,220,210,240,250,240,210,220,180],
  [180,220,210,240,250,240,210,220,180],[170,190,200,220,240,220,200,190,170],
  [170,180,170,190,250,190,170,180,170],[160,170,160,150,150,150,160,170,160],
];
const GUARD_SCORES = [
  [0,0,0,30,0,30,0,0,0],[0,0,0,0,22,0,0,0,0],[0,0,0,30,0,30,0,0,0],
  [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],[0,0,0,30,0,30,0,0,0],[0,0,0,0,22,0,0,0,0],
  [0,0,0,30,0,30,0,0,0],
];
const ELEPHANT_SCORES = [
  [0,0,30,0,0,0,30,0,0],[0,0,0,0,0,0,0,0,0],[20,0,0,0,35,0,0,0,20],
  [0,0,0,0,0,0,0,0,0],[0,0,25,0,0,0,25,0,0],[0,0,25,0,0,0,25,0,0],
  [0,0,0,0,0,0,0,0,0],[20,0,0,0,35,0,0,0,20],[0,0,0,0,0,0,0,0,0],
  [0,0,30,0,0,0,30,0,0],
];
const HORSE_SCORES = [
  [60,70,75,70,60,70,75,70,60],[70,75,75,70,50,70,75,75,70],
  [80,80,90,90,80,90,90,80,80],[80,90,100,100,90,100,100,90,80],
  [90,100,100,110,100,110,100,100,90],[90,110,110,120,100,120,110,110,90],
  [90,100,120,130,110,130,120,100,90],[90,100,120,125,120,125,120,100,90],
  [80,110,125,90,70,90,125,110,80],[70,80,90,80,70,80,90,80,70],
];
const CANNON_SCORES = [
  [80,90,80,70,60,70,80,90,80],[80,90,80,70,65,70,80,90,80],
  [90,100,80,80,70,80,80,100,90],[90,100,90,90,110,90,90,100,90],
  [90,100,90,110,130,110,90,100,90],[90,110,90,110,130,110,90,110,90],
  [90,110,90,110,130,110,90,110,90],[100,120,90,80,80,80,90,120,100],
  [110,125,100,70,60,70,100,125,110],[125,130,100,70,60,70,100,130,125],
];
const PAWN_SCORES = [
  [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  [10,0,10,0,15,0,10,0,10],[10,0,15,0,15,0,15,0,10],
  [15,20,20,20,20,20,20,20,15],[20,25,25,30,30,30,25,25,20],
  [25,30,30,40,40,40,30,30,25],[25,30,40,50,60,50,40,30,25],
  [10,10,10,20,25,20,10,10,10],
];

const CHECKMATE = 1000;
const STALEMATE = 0;

function getPositionScore(piece: string, row: number, col: number): number {
  const type = piece.slice(2);
  const isRed = piece[0] === "r";
  const r = isRed ? 9 - row : row;
  switch (type) {
    case "king": return KING_SCORES[r][col];
    case "guard": return GUARD_SCORES[r][col];
    case "elephant": return ELEPHANT_SCORES[r][col];
    case "rook": return ROOK_SCORES[r][col];
    case "horse": return HORSE_SCORES[r][col];
    case "cannon": return CANNON_SCORES[r][col];
    case "pawn": return PAWN_SCORES[r][col];
  }
  return 0;
}

function scoreBoard(gs: GameState): number {
  if (gs.checkMate) {
    return gs.redToMove ? -CHECKMATE - gs.moveLog.length : CHECKMATE + gs.moveLog.length;
  }
  if (gs.staleMate) {
    return gs.redToMove ? -CHECKMATE - gs.moveLog.length : CHECKMATE + gs.moveLog.length;
  }
  if (gs.lossByPerpetualCheck) {
    // Người vừa đi phạm luật trường chiếu -> Người hiện tại thắng
    return gs.redToMove ? CHECKMATE + gs.moveLog.length : -CHECKMATE - gs.moveLog.length;
  }
  if (gs.drawBy60Moves || gs.drawByRepetition) return STALEMATE;

  let score = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = gs.board[row][col];
      if (piece === "--") continue;
      const base = PIECE_SCORES[piece.slice(2)] ?? 0;
      const pos = getPositionScore(piece, row, col);
      if (piece[0] === "r") score += base + pos;
      else score -= base + pos;
    }
  }
  return score;
}

function quiescence(gs: GameState, alpha: number, beta: number, mult: number): number {
  nodesVisited++;
  if (nodesVisited % 1024 === 0) {
    if (Date.now() - startTime > TIME_LIMIT) throw "TIME_UP";
  }

  const standPat = mult * scoreBoard(gs);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  // Use getValidMoves but filter for captures to stay legal
  const moves = gs.getValidMoves().filter(m => m.pieceCaptured !== "--");
  if (moves.length === 0) return standPat;

  const scored = moves.map(move => {
    const victim = PIECE_SCORES[move.pieceCaptured.slice(2)] ?? 0;
    const attacker = PIECE_SCORES[move.pieceMoved.slice(2)] ?? 0;
    return { s: victim * 10 - attacker, move };
  });
  scored.sort((a, b) => b.s - a.s);

  for (const item of scored) {
    gs.makeMove(item.move);
    let score: number;
    try {
      score = -quiescence(gs, -beta, -alpha, -mult);
    } finally {
      gs.undoMove();
    }

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function moveOrdering(gs: GameState, moves: Move[], depth: number, ttBestMove: Move | null): Move[] {
  const scored = moves.map(move => {
    let s = 0;
    // 1. TT Best Move
    if (ttBestMove && movesEqual(move, ttBestMove)) s = 1000000;
    // 2. MVV-LVA
    else if (move.pieceCaptured !== "--") {
      const victim = PIECE_SCORES[move.pieceCaptured.slice(2)] ?? 0;
      const attacker = PIECE_SCORES[move.pieceMoved.slice(2)] ?? 0;
      s = 100000 + (victim * 10 - attacker);
    }
    // 3. Killer Moves
    else if (killerMoves[depth]) {
      if (killerMoves[depth][0] && movesEqual(move, killerMoves[depth][0]!)) s = 90000;
      else if (killerMoves[depth][1] && movesEqual(move, killerMoves[depth][1]!)) s = 80000;
      else s = history[PIECE_TO_INDEX[move.pieceMoved]][move.endRow][move.endCol] ?? 0;
    }
    // 4. History Heuristic
    else {
      s = history[PIECE_TO_INDEX[move.pieceMoved]][move.endRow][move.endCol] ?? 0;
    }
    return { s, move };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.move);
}

function negaMax(gs: GameState, depth: number, alpha: number, beta: number, mult: number, hash: bigint, currentDepth: number): number {
  nodesVisited++;
  if (nodesVisited % 1024 === 0) {
    if (Date.now() - startTime > TIME_LIMIT) throw "TIME_UP";
  }

  // TT Lookup
  const ttEntry = transpositionTable.get(hash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === TT_EXACT) return ttEntry.score;
    if (ttEntry.flag === TT_ALPHA && ttEntry.score <= alpha) return alpha;
    if (ttEntry.flag === TT_BETA && ttEntry.score >= beta) return beta;
  }

  if (depth === 0) return quiescence(gs, alpha, beta, mult);
  
  if (gs.lossByPerpetualCheck) return CHECKMATE - currentDepth;
  if (gs.drawBy60Moves || gs.drawByRepetition) return STALEMATE;

  const moves = gs.getValidMoves();
  if (moves.length === 0) {
    const score = mult * scoreBoard(gs);
    // Win: higher score (closer to INF), subtract depth to prefer shorter paths
    if (score > 500) return score - currentDepth;
    // Loss: lower score (closer to -INF), add depth to prefer longer paths
    if (score < -500) return score + currentDepth;
    return 0; // Stalemate
  }

  const ordered = moveOrdering(gs, moves, depth, ttEntry?.bestMove ?? null);
  let bestScore = -INF;
  let bestMove: Move | null = null;
  const initialAlpha = alpha;

  for (const move of ordered) {
    // Incremental Hash Update
    const pIdx = PIECE_TO_INDEX[move.pieceMoved];
    let nextHash = hash ^ ZOBRIST_TABLE[move.startRow][move.startCol][pIdx];
    if (move.pieceCaptured !== "--") {
      nextHash ^= ZOBRIST_TABLE[move.endRow][move.endCol][PIECE_TO_INDEX[move.pieceCaptured]];
    }
    nextHash ^= ZOBRIST_TABLE[move.endRow][move.endCol][pIdx];
    nextHash ^= ZOBRIST_SIDE;

    gs.makeMove(move);
    let score: number;
    try {
      score = -negaMax(gs, depth - 1, -beta, -alpha, -mult, gs.currentHash, currentDepth + 1);
    } finally {
      gs.undoMove();
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) {
      // Beta Cutoff - Store Killer Moves and History
      if (move.pieceCaptured === "--") {
        if (!killerMoves[depth]) killerMoves[depth] = [null, null];
        if (killerMoves[depth][0] && !movesEqual(move, killerMoves[depth][0]!)) {
          killerMoves[depth][1] = killerMoves[depth][0];
          killerMoves[depth][0] = move;
        } else if (!killerMoves[depth][0]) {
          killerMoves[depth][0] = move;
        }
        const histIdx = PIECE_TO_INDEX[move.pieceMoved];
        if (history[histIdx]) {
          history[histIdx][move.endRow][move.endCol] += depth * depth;
        }
      }
      break;
    }
  }

  // Store TT
  let flag = TT_EXACT;
  if (bestScore <= initialAlpha) flag = TT_ALPHA;
  else if (bestScore >= beta) flag = TT_BETA;

  if (transpositionTable.size > MAX_TT_SIZE) transpositionTable.clear();
  transpositionTable.set(hash, { depth, score: bestScore, flag, bestMove });

  return bestScore;
}

export function findBestMove(gs: GameState, validMoves: Move[]): Move | null {
  startTime = Date.now();
  nodesVisited = 0;
  killerMoves = new Array(64).fill(null).map(() => [null, null]);

  // If new game, clear TT
  if (gs.moveLog.length === 0) transpositionTable.clear();
  
  // Initialize history table if not already done
  if (history.length === 0) {
    history = new Array(14).fill(null).map(() => 
      new Array(10).fill(null).map(() => 
        new Array(9).fill(0)
      )
    );
  }

  let finalBestMove: Move | null = null;
  let rootMoves = [...validMoves];
  const hash = gs.currentHash;

  try {
    for (let depth = 1; depth <= 64; depth++) {
      // Improve Root Move Ordering
      if (finalBestMove) {
        rootMoves = [
          finalBestMove,
          ...rootMoves.filter(m => !movesEqual(m, finalBestMove!))
        ];
      }

      negaMax(gs, depth, -INF, INF, gs.redToMove ? 1 : -1, hash, 0);
      
      const entry = transpositionTable.get(hash);
      if (entry && entry.bestMove) {
        finalBestMove = entry.bestMove;
      }
      
      if (entry && Math.abs(entry.score) > CHECKMATE) break;
    }
  } catch (e) {
    if (e !== "TIME_UP") throw e;
  }

  return finalBestMove ?? (validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null);
}
