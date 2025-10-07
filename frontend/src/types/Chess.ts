export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export interface ChessSquare {
  piece: ChessPiece | null;
  isHighlighted?: boolean;
  isSelected?: boolean;
  isLastMove?: boolean;
}

export interface ChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: ChessPiece;
  capturedPiece?: ChessPiece;
  isCastling?: boolean;
  isEnPassant?: boolean;
  isPromotion?: boolean;
  promotionPiece?: PieceType;
}

export interface ChessGameState {
  board: ChessSquare[][];
  currentPlayer: PieceColor;
  moveHistory: ChessMove[];
  capturedPieces: { white: ChessPiece[]; black: ChessPiece[] };
  gameStatus: 'active' | 'check' | 'checkmate' | 'stalemate' | 'draw';
  winner?: PieceColor;
  lastMove?: ChessMove;
  castlingRights: {
    white: { kingSide: boolean; queenSide: boolean };
    black: { kingSide: boolean; queenSide: boolean };
  };
  enPassantTarget?: { row: number; col: number };
  halfMoveClock: number;
  fullMoveNumber: number;
}

export interface MoveRequest {
  gameId: string;
  from: { row: number; col: number };
  to: { row: number; col: number };
  promotionPiece?: PieceType;
}

export interface MoveResponse {
  success: boolean;
  move?: ChessMove;
  gameState?: ChessGameState;
  error?: string;
  validMoves?: { row: number; col: number }[];
}
