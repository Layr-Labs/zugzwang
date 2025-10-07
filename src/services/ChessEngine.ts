import { ChessPiece, PieceType, PieceColor, ChessSquare, ChessMove, ChessGameState } from '../types/Chess';

export class ChessEngine {
  private static instance: ChessEngine;

  private constructor() {}

  public static getInstance(): ChessEngine {
    if (!ChessEngine.instance) {
      ChessEngine.instance = new ChessEngine();
    }
    return ChessEngine.instance;
  }

  /**
   * Create initial chess position
   */
  public createInitialPosition(): ChessGameState {
    const board: ChessSquare[][] = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => ({ piece: null }))
    );

    // Black pieces (top of board)
    board[0][0] = { piece: { type: 'rook', color: 'black' } };
    board[0][1] = { piece: { type: 'knight', color: 'black' } };
    board[0][2] = { piece: { type: 'bishop', color: 'black' } };
    board[0][3] = { piece: { type: 'queen', color: 'black' } };
    board[0][4] = { piece: { type: 'king', color: 'black' } };
    board[0][5] = { piece: { type: 'bishop', color: 'black' } };
    board[0][6] = { piece: { type: 'knight', color: 'black' } };
    board[0][7] = { piece: { type: 'rook', color: 'black' } };

    // Black pawns
    for (let col = 0; col < 8; col++) {
      board[1][col] = { piece: { type: 'pawn', color: 'black' } };
    }

    // White pawns
    for (let col = 0; col < 8; col++) {
      board[6][col] = { piece: { type: 'pawn', color: 'white' } };
    }

    // White pieces (bottom of board)
    board[7][0] = { piece: { type: 'rook', color: 'white' } };
    board[7][1] = { piece: { type: 'knight', color: 'white' } };
    board[7][2] = { piece: { type: 'bishop', color: 'white' } };
    board[7][3] = { piece: { type: 'queen', color: 'white' } };
    board[7][4] = { piece: { type: 'king', color: 'white' } };
    board[7][5] = { piece: { type: 'bishop', color: 'white' } };
    board[7][6] = { piece: { type: 'knight', color: 'white' } };
    board[7][7] = { piece: { type: 'rook', color: 'white' } };

    return {
      board,
      currentPlayer: 'white',
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      gameStatus: 'active',
      castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
      },
      halfMoveClock: 0,
      fullMoveNumber: 1
    };
  }

  /**
   * Get all valid moves for a piece at the given position
   */
  public getValidMoves(gameState: ChessGameState, row: number, col: number): { row: number; col: number }[] {
    const square = gameState.board[row][col];
    if (!square.piece || square.piece.color !== gameState.currentPlayer) {
      return [];
    }

    console.log('🔍 [CHESS_ENGINE] Getting valid moves for piece:', {
      piece: `${square.piece.color} ${square.piece.type}`,
      position: { row, col }
    });

    // Step 1: Get all raw moves for the piece
    const rawMoves = this.getRawMoves(gameState, row, col);
    console.log('📋 [CHESS_ENGINE] Raw moves found:', rawMoves.length);

    // Step 2: Filter out moves that would put the king in check
    const validMoves: { row: number; col: number }[] = [];
    
    for (const move of rawMoves) {
      console.log('🔍 [CHESS_ENGINE] Checking move:', move);
      
      // Simulate the move
      const tempGameState = this.deepCopyGameState(gameState);
      const piece = tempGameState.board[row][col].piece!;
      
      // Make the move on the temporary board
      tempGameState.board[move.row][move.col].piece = piece;
      tempGameState.board[row][col].piece = null;
      
      // Check if this move puts the king in check
      const kingInCheck = this.isKingInCheckAfterMove(tempGameState, piece.color);
      
      if (!kingInCheck) {
        console.log('✅ [CHESS_ENGINE] Move is valid:', move);
        validMoves.push(move);
      } else {
        console.log('❌ [CHESS_ENGINE] Move puts king in check, removing:', move);
      }
    }

    console.log('📊 [CHESS_ENGINE] Final valid moves:', validMoves.length);
    return validMoves;
  }

  /**
   * Get raw moves for a piece without check validation (used for check detection)
   */
  private getRawMoves(gameState: ChessGameState, row: number, col: number): { row: number; col: number }[] {
    const square = gameState.board[row][col];
    if (!square.piece) {
      return [];
    }

    const validMoves: { row: number; col: number }[] = [];
    const piece = square.piece;

    // Use a simplified approach to avoid circular dependencies
    try {
      switch (piece.type) {
        case 'pawn':
          this.getPawnMoves(gameState, row, col, validMoves);
          break;
        case 'rook':
          this.getRookMoves(gameState, row, col, validMoves);
          break;
        case 'knight':
          this.getKnightMoves(gameState, row, col, validMoves);
          break;
        case 'bishop':
          this.getBishopMoves(gameState, row, col, validMoves);
          break;
        case 'queen':
          this.getQueenMoves(gameState, row, col, validMoves);
          break;
        case 'king':
          this.getKingMoves(gameState, row, col, validMoves);
          break;
      }
    } catch (error) {
      console.error('💥 [CHESS_ENGINE] Error in getRawMoves:', error);
      return [];
    }

    // Return raw moves without check validation
    return validMoves;
  }

  /**
   * Make a move and return the new game state
   */
  public makeMove(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number, promotionPiece?: PieceType): { success: boolean; newGameState?: ChessGameState; move?: ChessMove; error?: string } {
    console.log('♟️ [CHESS_ENGINE] makeMove called:', {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      promotionPiece: promotionPiece,
      currentPlayer: gameState.currentPlayer,
      gameStatus: gameState.gameStatus,
      fullMoveNumber: gameState.fullMoveNumber
    });

    // Validate move
    console.log('🔍 [CHESS_ENGINE] Getting valid moves for piece...');
    const validMoves = this.getValidMoves(gameState, fromRow, fromCol);
    console.log('📋 [CHESS_ENGINE] Valid moves found:', {
      count: validMoves.length,
      moves: validMoves
    });

    const isValidMove = validMoves.some(move => move.row === toRow && move.col === toCol);
    console.log('✅ [CHESS_ENGINE] Move validation:', {
      isValidMove: isValidMove,
      targetMove: { row: toRow, col: toCol }
    });

    if (!isValidMove) {
      console.log('❌ [CHESS_ENGINE] Invalid move - not in valid moves list');
      return { success: false, error: 'Invalid move' };
    }

    // Additional validation: prevent capturing the king
    const targetPiece = gameState.board[toRow][toCol].piece;
    if (targetPiece && targetPiece.type === 'king') {
      console.log('❌ [CHESS_ENGINE] Invalid move - cannot capture king');
      return { success: false, error: 'Cannot capture king' };
    }

    // Create new game state
    console.log('🔄 [CHESS_ENGINE] Creating deep copy of game state...');
    const newGameState = this.deepCopyGameState(gameState);
    const piece = newGameState.board[fromRow][fromCol].piece!;
    const capturedPiece = newGameState.board[toRow][toCol].piece;

    console.log('♟️ [CHESS_ENGINE] Piece details:', {
      movingPiece: piece ? `${piece.color} ${piece.type}` : 'none',
      capturedPiece: capturedPiece ? `${capturedPiece.color} ${capturedPiece.type}` : 'none',
      fromSquare: { row: fromRow, col: fromCol },
      toSquare: { row: toRow, col: toCol }
    });

    // Create move object
    const move: ChessMove = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece,
      capturedPiece: capturedPiece || undefined
    };

    console.log('📝 [CHESS_ENGINE] Move object created:', {
      from: move.from,
      to: move.to,
      piece: move.piece ? `${move.piece.color} ${move.piece.type}` : 'none',
      capturedPiece: move.capturedPiece ? `${move.capturedPiece.color} ${move.capturedPiece.type}` : 'none'
    });

    // Handle special moves
    console.log('🎭 [CHESS_ENGINE] Handling special moves...');
    this.handleSpecialMoves(newGameState, move);

    // Execute the move
    console.log('⚡ [CHESS_ENGINE] Executing move on board...');
    newGameState.board[toRow][toCol].piece = piece;
    newGameState.board[fromRow][fromCol].piece = null;

    // Update captured pieces
    if (capturedPiece) {
      console.log('🏆 [CHESS_ENGINE] Adding captured piece:', `${capturedPiece.color} ${capturedPiece.type}`);
      newGameState.capturedPieces[piece.color].push(capturedPiece);
    }

    // Update game state
    console.log('🔄 [CHESS_ENGINE] Updating game state...');
    const previousPlayer = newGameState.currentPlayer;
    newGameState.currentPlayer = piece.color === 'white' ? 'black' : 'white';
    newGameState.moveHistory.push(move);
    newGameState.lastMove = move;
    newGameState.halfMoveClock = capturedPiece || piece.type === 'pawn' ? 0 : newGameState.halfMoveClock + 1;
    if (piece.color === 'black') {
      newGameState.fullMoveNumber++;
    }

    console.log('📊 [CHESS_ENGINE] Game state updated:', {
      previousPlayer: previousPlayer,
      currentPlayer: newGameState.currentPlayer,
      fullMoveNumber: newGameState.fullMoveNumber,
      halfMoveClock: newGameState.halfMoveClock,
      moveHistoryLength: newGameState.moveHistory.length
    });

    // Check for check/checkmate/stalemate
    console.log('🔍 [CHESS_ENGINE] Checking game status...');
    const previousStatus = newGameState.gameStatus;
    this.updateGameStatus(newGameState);
    console.log('🎯 [CHESS_ENGINE] Game status updated:', {
      previousStatus: previousStatus,
      newStatus: newGameState.gameStatus,
      winner: newGameState.winner
    });

    console.log('✅ [CHESS_ENGINE] Move completed successfully');
    return { success: true, newGameState, move };
  }

  /**
   * Check if a move would put the king in check
   */
  private wouldPutKingInCheck(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const tempGameState = this.deepCopyGameState(gameState);
    const piece = tempGameState.board[fromRow][fromCol].piece!;
    
    console.log('🔍 [CHESS_ENGINE] Checking if move would put king in check:', {
      piece: `${piece.color} ${piece.type}`,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol }
    });
    
    // Make the move temporarily
    tempGameState.board[toRow][toCol].piece = piece;
    tempGameState.board[fromRow][fromCol].piece = null;

    // Check if the moving player's king is in check after the move
    const wouldBeInCheck = this.isKingInCheckAfterMove(tempGameState, piece.color);
    console.log('🔍 [CHESS_ENGINE] Move would put king in check:', wouldBeInCheck);
    
    return wouldBeInCheck;
  }

  /**
   * Check if the king is in check after a move (simple, no circular dependencies)
   */
  private isKingInCheckAfterMove(gameState: ChessGameState, color: PieceColor): boolean {
    const kingPosition = this.findKing(gameState, color);
    if (!kingPosition) {
      return false;
    }

    console.log('🔍 [CHESS_ENGINE] Checking if king is in check after move:', {
      color: color,
      kingPosition: kingPosition
    });

    // Check if any opponent piece can attack the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = gameState.board[row][col];
        if (square.piece && square.piece.color === opponentColor) {
          // Check if this piece can attack the king using simple attack patterns
          if (this.canPieceAttackSquare(gameState, row, col, kingPosition.row, kingPosition.col)) {
            console.log('⚠️ [CHESS_ENGINE] King is in check!', {
              attackingPiece: `${square.piece.color} ${square.piece.type}`,
              attackingFrom: { row, col },
              kingPosition: kingPosition
            });
            return true;
          }
        }
      }
    }
    
    console.log('✅ [CHESS_ENGINE] King is not in check');
    return false;
  }

  /**
   * Check if a piece can attack a specific square (simple attack patterns)
   */
  private canPieceAttackSquare(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const piece = gameState.board[fromRow][fromCol].piece;
    if (!piece) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    switch (piece.type) {
      case 'pawn':
        return this.canPawnAttackSquare(fromRow, fromCol, toRow, toCol, piece.color);
      case 'rook':
        return this.canRookAttackSquare(gameState, fromRow, fromCol, toRow, toCol);
      case 'knight':
        return this.canKnightAttackSquare(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return this.canBishopAttackSquare(gameState, fromRow, fromCol, toRow, toCol);
      case 'queen':
        return this.canQueenAttackSquare(gameState, fromRow, fromCol, toRow, toCol);
      case 'king':
        return this.canKingAttackSquare(fromRow, fromCol, toRow, toCol);
      default:
        return false;
    }
  }

  /**
   * Find the king of the given color
   */
  private findKing(gameState: ChessGameState, color: PieceColor): { row: number; col: number } | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = gameState.board[row][col];
        if (square.piece && square.piece.type === 'king' && square.piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  /**
   * Update game status (check, checkmate, stalemate)
   */
  private updateGameStatus(gameState: ChessGameState): void {
    const currentPlayer = gameState.currentPlayer;
    const isInCheck = this.isKingInCheckAfterMove(gameState, currentPlayer);
    
    if (isInCheck) {
      // Check if it's checkmate
      const hasValidMoves = this.hasValidMoves(gameState, currentPlayer);
      if (hasValidMoves) {
        gameState.gameStatus = 'check';
      } else {
        gameState.gameStatus = 'checkmate';
        gameState.winner = currentPlayer === 'white' ? 'black' : 'white';
      }
    } else {
      // Check if it's stalemate
      const hasValidMoves = this.hasValidMoves(gameState, currentPlayer);
      if (!hasValidMoves) {
        gameState.gameStatus = 'stalemate';
      } else {
        gameState.gameStatus = 'active';
      }
    }
  }

  /**
   * Check if the current player has any valid moves
   */
  private hasValidMoves(gameState: ChessGameState, color: PieceColor): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = gameState.board[row][col];
        if (square.piece && square.piece.color === color) {
          const validMoves = this.getValidMoves(gameState, row, col);
          if (validMoves.length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Handle special moves (castling, en passant, promotion)
   */
  private handleSpecialMoves(gameState: ChessGameState, move: ChessMove): void {
    const piece = move.piece;
    const from = move.from;
    const to = move.to;

    // Castling
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      move.isCastling = true;
      const rookCol = to.col > from.col ? 7 : 0;
      const newRookCol = to.col > from.col ? 5 : 3;
      const rook = gameState.board[from.row][rookCol].piece!;
      gameState.board[from.row][newRookCol].piece = rook;
      gameState.board[from.row][rookCol].piece = null;
      
      // Update castling rights
      gameState.castlingRights[piece.color].kingSide = false;
      gameState.castlingRights[piece.color].queenSide = false;
    }

    // En passant
    if (piece.type === 'pawn' && gameState.enPassantTarget && 
        to.row === gameState.enPassantTarget.row && to.col === gameState.enPassantTarget.col) {
      move.isEnPassant = true;
      const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
      const capturedPawn = gameState.board[capturedPawnRow][to.col].piece!;
      gameState.board[capturedPawnRow][to.col].piece = null;
      move.capturedPiece = capturedPawn;
    }

    // Promotion
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
      move.isPromotion = true;
      move.promotionPiece = 'queen'; // Default to queen
      gameState.board[to.row][to.col].piece = { type: 'queen', color: piece.color };
    }

    // Update en passant target
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      gameState.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
    } else {
      gameState.enPassantTarget = undefined;
    }
  }

  // Move generation methods for each piece type
  private getPawnMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[]): void {
    const piece = gameState.board[row][col].piece!;
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;

    // Forward move
    if (this.isValidSquare(row + direction, col) && !gameState.board[row + direction][col].piece) {
      validMoves.push({ row: row + direction, col });
      
      // Double move from starting position
      if (row === startRow && !gameState.board[row + 2 * direction][col].piece) {
        validMoves.push({ row: row + 2 * direction, col });
      }
    }

    // Capture moves
    for (const colOffset of [-1, 1]) {
      const newRow = row + direction;
      const newCol = col + colOffset;
      if (this.isValidSquare(newRow, newCol)) {
        const targetSquare = gameState.board[newRow][newCol];
        if (targetSquare.piece && targetSquare.piece.color !== piece.color) {
          validMoves.push({ row: newRow, col: newCol });
        }
      }
    }

    // En passant
    if (gameState.enPassantTarget) {
      const epRow = gameState.enPassantTarget.row;
      const epCol = gameState.enPassantTarget.col;
      if (row === epRow && Math.abs(col - epCol) === 1) {
        validMoves.push({ row: epRow, col: epCol });
      }
    }
  }

  private getRookMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[]): void {
    this.addLinearMoves(gameState, row, col, validMoves, [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ]);
  }

  private getKnightMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[]): void {
    const piece = gameState.board[row][col].piece!;
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [rowOffset, colOffset] of knightMoves) {
      const newRow = row + rowOffset;
      const newCol = col + colOffset;
      if (this.isValidSquare(newRow, newCol)) {
        const targetSquare = gameState.board[newRow][newCol];
        if (!targetSquare.piece || targetSquare.piece.color !== piece.color) {
          validMoves.push({ row: newRow, col: newCol });
        }
      }
    }
  }

  private getBishopMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[]): void {
    this.addLinearMoves(gameState, row, col, validMoves, [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ]);
  }

  private getQueenMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[]): void {
    this.addLinearMoves(gameState, row, col, validMoves, [
      [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
    ]);
  }

  private getKingMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[]): void {
    const piece = gameState.board[row][col].piece!;
    
    // Regular king moves
    for (const [rowOffset, colOffset] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
      const newRow = row + rowOffset;
      const newCol = col + colOffset;
      if (this.isValidSquare(newRow, newCol)) {
        const targetSquare = gameState.board[newRow][newCol];
        if (!targetSquare.piece || targetSquare.piece.color !== piece.color) {
          validMoves.push({ row: newRow, col: newCol });
        }
      }
    }

    // Castling
    if (!this.isKingInCheckAfterMove(gameState, piece.color)) {
      const castlingRights = gameState.castlingRights[piece.color];
      
      // King-side castling
      if (castlingRights.kingSide && 
          !gameState.board[row][5].piece && 
          !gameState.board[row][6].piece &&
          gameState.board[row][7].piece?.type === 'rook' &&
          gameState.board[row][7].piece?.color === piece.color) {
        validMoves.push({ row, col: 6 });
      }
      
      // Queen-side castling
      if (castlingRights.queenSide && 
          !gameState.board[row][1].piece && 
          !gameState.board[row][2].piece &&
          !gameState.board[row][3].piece &&
          gameState.board[row][0].piece?.type === 'rook' &&
          gameState.board[row][0].piece?.color === piece.color) {
        validMoves.push({ row, col: 2 });
      }
    }
  }

  private addLinearMoves(gameState: ChessGameState, row: number, col: number, validMoves: { row: number; col: number }[], directions: number[][]): void {
    const piece = gameState.board[row][col].piece!;
    
    for (const [rowOffset, colOffset] of directions) {
      let newRow = row + rowOffset;
      let newCol = col + colOffset;
      
      while (this.isValidSquare(newRow, newCol)) {
        const targetSquare = gameState.board[newRow][newCol];
        
        if (!targetSquare.piece) {
          validMoves.push({ row: newRow, col: newCol });
        } else {
          if (targetSquare.piece.color !== piece.color) {
            validMoves.push({ row: newRow, col: newCol });
          }
          break;
        }
        
        newRow += rowOffset;
        newCol += colOffset;
      }
    }
  }

  private isValidSquare(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  // Attack pattern methods for each piece type
  private canPawnAttackSquare(fromRow: number, fromCol: number, toRow: number, toCol: number, color: PieceColor): boolean {
    const direction = color === 'white' ? -1 : 1;
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);
    
    // Pawns attack diagonally forward
    return rowDiff === direction && colDiff === 1;
  }

  private canRookAttackSquare(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    // Must be on same row or column
    if (fromRow !== toRow && fromCol !== toCol) return false;
    
    // Check if path is clear
    return this.isPathClear(gameState, fromRow, fromCol, toRow, toCol);
  }

  private canKnightAttackSquare(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    // Knight moves in L-shape
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  private canBishopAttackSquare(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    // Must be diagonal
    if (rowDiff !== colDiff) return false;
    
    // Check if path is clear
    return this.isPathClear(gameState, fromRow, fromCol, toRow, toCol);
  }

  private canQueenAttackSquare(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    // Queen combines rook and bishop moves
    return this.canRookAttackSquare(gameState, fromRow, fromCol, toRow, toCol) ||
           this.canBishopAttackSquare(gameState, fromRow, fromCol, toRow, toCol);
  }

  private canKingAttackSquare(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    // King moves one square in any direction
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
  }

  private isPathClear(gameState: ChessGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (gameState.board[currentRow][currentCol].piece) {
        return false; // Path is blocked
      }
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true; // Path is clear
  }

  private deepCopyGameState(gameState: ChessGameState): ChessGameState {
    return JSON.parse(JSON.stringify(gameState));
  }
}
