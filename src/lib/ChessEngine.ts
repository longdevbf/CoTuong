export interface Move {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  pieceMoved: string;
  pieceCaptured: string;
  moveID: number;
}

export function createMove(startSq: [number, number], endSq: [number, number], board: string[][]): Move {
  const [startRow, startCol] = startSq;
  const [endRow, endCol] = endSq;
  return {
    startRow, startCol, endRow, endCol,
    pieceMoved: board[startRow][startCol],
    pieceCaptured: board[endRow][endCol],
    moveID: startRow * 1000 + startCol * 100 + endRow * 10 + endCol,
  };
}

export function movesEqual(a: Move, b: Move): boolean {
  return a.startRow === b.startRow && a.startCol === b.startCol &&
    a.endRow === b.endRow && a.endCol === b.endCol;
}

export function getMoveNotation(move: Move): string {
  const rf = (r: number, c: number) => `${c}${9 - r}`;
  return rf(move.startRow, move.startCol) + rf(move.endRow, move.endCol);
}

export class GameState {
  board: string[][];
  redToMove: boolean;
  moveLog: Move[];
  redKingLocation: [number, number];
  blackKingLocation: [number, number];
  checkMate: boolean;
  staleMate: boolean;

  constructor() {
    this.board = [
      ["b_rook", "b_horse", "b_elephant", "b_guard", "b_king", "b_guard", "b_elephant", "b_horse", "b_rook"],
      ["--", "--", "--", "--", "--", "--", "--", "--", "--"],
      ["--", "b_cannon", "--", "--", "--", "--", "--", "b_cannon", "--"],
      ["b_pawn", "--", "b_pawn", "--", "b_pawn", "--", "b_pawn", "--", "b_pawn"],
      ["--", "--", "--", "--", "--", "--", "--", "--", "--"],
      ["--", "--", "--", "--", "--", "--", "--", "--", "--"],
      ["r_pawn", "--", "r_pawn", "--", "r_pawn", "--", "r_pawn", "--", "r_pawn"],
      ["--", "r_cannon", "--", "--", "--", "--", "--", "r_cannon", "--"],
      ["--", "--", "--", "--", "--", "--", "--", "--", "--"],
      ["r_rook", "r_horse", "r_elephant", "r_guard", "r_king", "r_guard", "r_elephant", "r_horse", "r_rook"],
    ];
    this.redToMove = true;
    this.moveLog = [];
    this.redKingLocation = [9, 4];
    this.blackKingLocation = [0, 4];
    this.checkMate = false;
    this.staleMate = false;
  }

  makeMove(move: Move): void {
    this.board[move.startRow][move.startCol] = "--";
    this.board[move.endRow][move.endCol] = move.pieceMoved;
    this.moveLog.push(move);
    if (move.pieceMoved === "r_king") this.redKingLocation = [move.endRow, move.endCol];
    else if (move.pieceMoved === "b_king") this.blackKingLocation = [move.endRow, move.endCol];
    this.redToMove = !this.redToMove;
  }

  undoMove(): void {
    if (this.moveLog.length === 0) return;
    const move = this.moveLog.pop()!;
    this.board[move.startRow][move.startCol] = move.pieceMoved;
    this.board[move.endRow][move.endCol] = move.pieceCaptured;
    this.redToMove = !this.redToMove;
    if (move.pieceMoved === "r_king") this.redKingLocation = [move.startRow, move.startCol];
    else if (move.pieceMoved === "b_king") this.blackKingLocation = [move.startRow, move.startCol];
    this.checkMate = false;
    this.staleMate = false;
  }

  getValidMoves(): Move[] {
    const possibleMoves = this.getAllPossibleMoves();
    const validMoves: Move[] = [];

    for (const move of possibleMoves) {
      this.makeMove(move);
      // Check if move was legal for the side that just moved
      this.redToMove = !this.redToMove;
      const remainsInCheck = this.inCheck();
      const kingsFacing = this._kingsAreFacing();
      this.redToMove = !this.redToMove;

      if (!remainsInCheck && !kingsFacing) {
        validMoves.push(move);
      }
      this.undoMove();
    }

    if (validMoves.length === 0) {
      if (this.inCheck()) this.checkMate = true;
      else this.staleMate = true;
    }
    return validMoves;
  }

  private _kingsAreFacing(): boolean {
    if (this.redKingLocation[1] !== this.blackKingLocation[1]) return false;
    const col = this.redKingLocation[1];
    const startRow = Math.min(this.redKingLocation[0], this.blackKingLocation[0]);
    const endRow = Math.max(this.redKingLocation[0], this.blackKingLocation[0]);
    for (let row = startRow + 1; row < endRow; row++) {
      if (this.board[row][col] !== "--") return false;
    }
    return true;
  }

  inCheck(): boolean {
    if (this.redToMove) return this._isSquareUnderAttack(...this.redKingLocation);
    return this._isSquareUnderAttack(...this.blackKingLocation);
  }

  private _isSquareUnderAttack(r: number, c: number): boolean {
    this.redToMove = !this.redToMove;
    const oppMoves = this.getAllPossibleMoves();
    this.redToMove = !this.redToMove;
    return oppMoves.some(m => m.endRow === r && m.endCol === c);
  }

  getAllPossibleMoves(): Move[] {
    const moves: Move[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece === "--") continue;
        const color = piece[0];
        if ((color === "r" && this.redToMove) || (color === "b" && !this.redToMove)) {
          const type = piece.slice(2);
          this._getMoves(type, r, c, moves);
        }
      }
    }
    return moves;
  }

  private _getMoves(type: string, r: number, c: number, moves: Move[]): void {
    switch (type) {
      case "pawn": this._getPawnMoves(r, c, moves); break;
      case "rook": this._getRookMoves(r, c, moves); break;
      case "horse": this._getHorseMoves(r, c, moves); break;
      case "elephant": this._getElephantMoves(r, c, moves); break;
      case "guard": this._getGuardMoves(r, c, moves); break;
      case "king": this._getKingMoves(r, c, moves); break;
      case "cannon": this._getCannonMoves(r, c, moves); break;
    }
  }

  private _valid(r: number, c: number): boolean {
    return r >= 0 && r < 10 && c >= 0 && c < 9;
  }

  private _inPalace(r: number, c: number, isRed: boolean): boolean {
    if (isRed) return r >= 7 && r <= 9 && c >= 3 && c <= 5;
    return r >= 0 && r <= 2 && c >= 3 && c <= 5;
  }

  private _getPawnMoves(r: number, c: number, moves: Move[]): void {
    const dirs: [number, number][] = [];
    const enemyColor = this.redToMove ? "b" : "r";
    if (this.redToMove) {
      dirs.push([-1, 0]);
      if (r <= 4) dirs.push([0, -1], [0, 1]);
    } else {
      dirs.push([1, 0]);
      if (r >= 5) dirs.push([0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (!this._valid(nr, nc)) continue;
      const ep = this.board[nr][nc];
      if (ep === "--" || ep[0] === enemyColor)
        moves.push(createMove([r, c], [nr, nc], this.board));
    }
  }

  private _getRookMoves(r: number, c: number, moves: Move[]): void {
    const enemyColor = this.redToMove ? "b" : "r";
    for (const [dr, dc] of [[-1, 0], [0, -1], [1, 0], [0, 1]] as [number, number][]) {
      for (let i = 1; i < 10; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (!this._valid(nr, nc)) break;
        const ep = this.board[nr][nc];
        if (ep === "--") { moves.push(createMove([r, c], [nr, nc], this.board)); continue; }
        if (ep[0] === enemyColor) moves.push(createMove([r, c], [nr, nc], this.board));
        break;
      }
    }
  }

  private _getHorseMoves(r: number, c: number, moves: Move[]): void {
    const allyColor = this.redToMove ? "r" : "b";
    const dirs: [number, number][] = [[-2, -1], [-2, 1], [-1, 2], [1, 2], [2, -1], [2, 1], [-1, -2], [1, -2]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (!this._valid(nr, nc)) continue;
      // check leg blocking
      if (Math.abs(dr) === 2) { if (this.board[r + Math.trunc(dr / 2)][c] !== "--") continue; }
      else { if (this.board[r][c + Math.trunc(dc / 2)] !== "--") continue; }
      const ep = this.board[nr][nc];
      if (ep === "--" || ep[0] !== allyColor) moves.push(createMove([r, c], [nr, nc], this.board));
    }
  }

  private _getElephantMoves(r: number, c: number, moves: Move[]): void {
    const allyColor = this.redToMove ? "r" : "b";
    for (const [dr, dc] of [[-2, -2], [-2, 2], [2, 2], [2, -2]] as [number, number][]) {
      const nr = r + dr, nc = c + dc;
      if (!this._valid(nr, nc)) continue;
      if (this.board[r + dr / 2][c + dc / 2] !== "--") continue;
      if (this.redToMove && nr < 5) continue;
      if (!this.redToMove && nr > 4) continue;
      const ep = this.board[nr][nc];
      if (ep === "--" || ep[0] !== allyColor) moves.push(createMove([r, c], [nr, nc], this.board));
    }
  }

  private _getGuardMoves(r: number, c: number, moves: Move[]): void {
    const allyColor = this.redToMove ? "r" : "b";
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, 1], [1, -1]] as [number, number][]) {
      const nr = r + dr, nc = c + dc;
      if (!this._valid(nr, nc)) continue;
      if (!this._inPalace(nr, nc, this.redToMove)) continue;
      const ep = this.board[nr][nc];
      if (ep === "--" || ep[0] !== allyColor) moves.push(createMove([r, c], [nr, nc], this.board));
    }
  }

  private _getKingMoves(r: number, c: number, moves: Move[]): void {
    const allyColor = this.redToMove ? "r" : "b";
    for (const [dr, dc] of [[-1, 0], [0, -1], [1, 0], [0, 1]] as [number, number][]) {
      const nr = r + dr, nc = c + dc;
      if (!this._valid(nr, nc)) continue;
      if (!this._inPalace(nr, nc, this.redToMove)) continue;
      // check kings facing
      if (nc === c) {
        const [eKr, eKc] = this.redToMove ? this.blackKingLocation : this.redKingLocation;
        if (c === eKc) {
          let blocked = false;
          const startR = Math.min(nr, eKr), endR = Math.max(nr, eKr);
          for (let rr = startR + 1; rr < endR; rr++) {
            if (this.board[rr][c] !== "--") { blocked = true; break; }
          }
          if (!blocked) continue;
        }
      }
      const ep = this.board[nr][nc];
      if (ep === "--" || ep[0] !== allyColor) moves.push(createMove([r, c], [nr, nc], this.board));
    }
  }

  private _getCannonMoves(r: number, c: number, moves: Move[]): void {
    const enemyColor = this.redToMove ? "b" : "r";
    for (const [dr, dc] of [[-1, 0], [0, -1], [1, 0], [0, 1]] as [number, number][]) {
      let hasScreen = false;
      for (let i = 1; i < 10; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (!this._valid(nr, nc)) break;
        const ep = this.board[nr][nc];
        if (!hasScreen) {
          if (ep === "--") moves.push(createMove([r, c], [nr, nc], this.board));
          else hasScreen = true;
        } else {
          if (ep !== "--") {
            if (ep[0] === enemyColor) moves.push(createMove([r, c], [nr, nc], this.board));
            break;
          }
        }
      }
    }
  }
}
