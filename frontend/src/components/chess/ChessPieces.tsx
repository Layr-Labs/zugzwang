import React from 'react';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

interface PieceProps {
  piece: ChessPiece;
  size?: number;
}

const Piece: React.FC<PieceProps> = ({ piece, size = 40 }) => {
  const { type, color } = piece;
  
  // Get the SVG file path based on piece type and color
  const getSvgPath = (type: PieceType, color: PieceColor): string => {
    const colorSuffix = color === 'white' ? 'w' : 'b';
    return `/pieces/${type}-${colorSuffix}.svg`;
  };

  return (
    <img
      src={getSvgPath(type, color)}
      alt={`${color} ${type}`}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
};

export default Piece;