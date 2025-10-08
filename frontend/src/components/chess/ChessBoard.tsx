import React from 'react';
import Piece, { ChessPiece, PieceType, PieceColor } from './ChessPieces';

export interface ChessSquare {
  piece: ChessPiece | null;
  isHighlighted?: boolean;
  isSelected?: boolean;
  isLastMove?: boolean;
}

interface ChessBoardProps {
  squares: ChessSquare[][];
  onSquareClick?: (row: number, col: number) => void;
  size?: number;
  validMoves?: { row: number; col: number }[];
  selectedSquare?: { row: number; col: number } | null;
}

const ChessBoard: React.FC<ChessBoardProps> = ({ 
  squares, 
  onSquareClick, 
  size = 480,
  validMoves = [],
  selectedSquare = null
}) => {
  const squareSize = size / 8;

  const getSquareColor = (row: number, col: number) => {
    const isLight = (row + col) % 2 === 0;
    return isLight ? '#EBEBD0' : '#769656';
  };

  const getSquareHighlightColor = (row: number, col: number, square: ChessSquare) => {
    // Selected square
    if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
      return '#ffeb3b';
    }
    
    // Valid move squares
    if (validMoves.some(move => move.row === row && move.col === col)) {
      return square.piece ? '#ff6b6b' : '#4caf50'; // Red for captures, green for empty squares
    }
    
    // Last move
    if (square.isLastMove) return '#4caf50';
    
    // Other highlights
    if (square.isHighlighted) return '#81c784';
    
    return 'transparent';
  };

  const renderSquare = (row: number, col: number) => {
    const square = squares[row][col];
    const backgroundColor = getSquareColor(row, col);
    const highlightColor = getSquareHighlightColor(row, col, square);
    
    return (
      <div
        key={`${row}-${col}`}
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: squareSize,
          height: squareSize,
          backgroundColor: highlightColor !== 'transparent' ? highlightColor : backgroundColor,
        }}
        onClick={() => onSquareClick?.(row, col)}
      >
        {square.piece && (
          <Piece 
            piece={square.piece} 
            size={squareSize * 0.8} 
          />
        )}
      </div>
    );
  };

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 8; row++) {
      const rowSquares = [];
      for (let col = 0; col < 8; col++) {
        rowSquares.push(renderSquare(row, col));
      }
      board.push(
        <div key={row} className="flex">
          {rowSquares}
        </div>
      );
    }
    return board;
  };

  return (
    <div className="inline-block">
      {renderBoard()}
    </div>
  );
};

// Helper function to create initial chess position
export const createInitialPosition = (): ChessSquare[][] => {
  const squares: ChessSquare[][] = Array(8).fill(null).map(() => 
    Array(8).fill(null).map(() => ({ piece: null }))
  );

  // Black pieces (top of board)
  squares[0][0] = { piece: { type: 'rook', color: 'black' } };
  squares[0][1] = { piece: { type: 'knight', color: 'black' } };
  squares[0][2] = { piece: { type: 'bishop', color: 'black' } };
  squares[0][3] = { piece: { type: 'queen', color: 'black' } };
  squares[0][4] = { piece: { type: 'king', color: 'black' } };
  squares[0][5] = { piece: { type: 'bishop', color: 'black' } };
  squares[0][6] = { piece: { type: 'knight', color: 'black' } };
  squares[0][7] = { piece: { type: 'rook', color: 'black' } };

  // Black pawns
  for (let col = 0; col < 8; col++) {
    squares[1][col] = { piece: { type: 'pawn', color: 'black' } };
  }

  // White pawns
  for (let col = 0; col < 8; col++) {
    squares[6][col] = { piece: { type: 'pawn', color: 'white' } };
  }

  // White pieces (bottom of board)
  squares[7][0] = { piece: { type: 'rook', color: 'white' } };
  squares[7][1] = { piece: { type: 'knight', color: 'white' } };
  squares[7][2] = { piece: { type: 'bishop', color: 'white' } };
  squares[7][3] = { piece: { type: 'queen', color: 'white' } };
  squares[7][4] = { piece: { type: 'king', color: 'white' } };
  squares[7][5] = { piece: { type: 'bishop', color: 'white' } };
  squares[7][6] = { piece: { type: 'knight', color: 'white' } };
  squares[7][7] = { piece: { type: 'rook', color: 'white' } };

  return squares;
};

export default ChessBoard;
