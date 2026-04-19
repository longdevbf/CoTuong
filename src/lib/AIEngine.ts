import { GameState, Move } from "./ChessEngine";

const PIECE_SCORES: Record<string, number> = {
  king: 10000, guard: 200, elephant: 200,
  rook: 900, horse: 400, cannon: 450, pawn: 100,
};

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
  if (gs.staleMate) return STALEMATE;

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

function moveOrdering(gs: GameState, moves: Move[]): Move[] {
  const scored = moves.map(move => {
    let s = 0;
    if (move.pieceCaptured !== "--") s += (PIECE_SCORES[move.pieceCaptured.slice(2)] ?? 0) * 2;
    if ([4, 5].includes(move.endRow) && [4, 5].includes(move.endCol)) s += 50;
    if (["horse", "elephant", "guard"].includes(move.pieceMoved.slice(2)) && [0, 9].includes(move.startRow)) s += 30;
    return { s, move };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.move);
}

let nextMove: Move | null = null;

function negaMax(gs: GameState, moves: Move[], depth: number, alpha: number, beta: number, mult: number, maxDepth: number): number {
  if (depth === 0) return mult * scoreBoard(gs);
  let best = -CHECKMATE;
  const ordered = moveOrdering(gs, moves);
  for (const move of ordered) {
    gs.makeMove(move);
    const score = -negaMax(gs, gs.getValidMoves(), depth - 1, -beta, -alpha, -mult, maxDepth);
    gs.undoMove();
    if (score > best) {
      best = score;
      if (depth === maxDepth) nextMove = move;
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

export function findBestMove(gs: GameState, validMoves: Move[]): Move | null {
  nextMove = null;
  const totalPieces = gs.board.flat().filter(p => p !== "--").length;
  let depth = 2;
  if (totalPieces <= 5) depth = 6;
  else if (totalPieces <= 10) depth = 4;
  else if (validMoves.length < 20) depth = 3;

  const ordered = moveOrdering(gs, validMoves);
  negaMax(gs, ordered, depth, -CHECKMATE, CHECKMATE, gs.redToMove ? 1 : -1, depth);
  return nextMove ?? (validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null);
}
