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
  const fill = color === 'white' ? '#f8f8f8' : '#2d2d2d';
  const stroke = color === 'white' ? '#333' : '#f8f8f8';

  const renderPiece = () => {
    switch (type) {
      case 'king':
        return (
          <g>
            {/* Crown with detailed points */}
            <path d={`M ${size * 0.15} ${size * 0.4} 
                     L ${size * 0.25} ${size * 0.15} 
                     L ${size * 0.35} ${size * 0.25} 
                     L ${size * 0.45} ${size * 0.1} 
                     L ${size * 0.55} ${size * 0.25} 
                     L ${size * 0.65} ${size * 0.1} 
                     L ${size * 0.75} ${size * 0.25} 
                     L ${size * 0.85} ${size * 0.15} 
                     L ${size * 0.85} ${size * 0.4} 
                     L ${size * 0.15} ${size * 0.4} Z`} 
                  fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Cross on top */}
            <line x1={size * 0.5} y1={size * 0.1} x2={size * 0.5} y2={size * 0.05} stroke={stroke} strokeWidth={2.5} />
            <line x1={size * 0.45} y1={size * 0.075} x2={size * 0.55} y2={size * 0.075} stroke={stroke} strokeWidth={2.5} />
            {/* Neck */}
            <rect x={size * 0.35} y={size * 0.4} width={size * 0.3} height={size * 0.15} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Body */}
            <ellipse cx={size * 0.5} cy={size * 0.6} rx={size * 0.28} ry={size * 0.12} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Base */}
            <rect x={size * 0.1} y={size * 0.72} width={size * 0.8} height={size * 0.18} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
          </g>
        );
      
      case 'queen':
        return (
          <g>
            {/* Crown with more elaborate points */}
            <path d={`M ${size * 0.1} ${size * 0.45} 
                     L ${size * 0.2} ${size * 0.1} 
                     L ${size * 0.3} ${size * 0.2} 
                     L ${size * 0.4} ${size * 0.05} 
                     L ${size * 0.5} ${size * 0.2} 
                     L ${size * 0.6} ${size * 0.05} 
                     L ${size * 0.7} ${size * 0.2} 
                     L ${size * 0.8} ${size * 0.1} 
                     L ${size * 0.9} ${size * 0.45} 
                     L ${size * 0.1} ${size * 0.45} Z`} 
                  fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Crown band */}
            <rect x={size * 0.15} y={size * 0.35} width={size * 0.7} height={size * 0.08} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Neck */}
            <rect x={size * 0.35} y={size * 0.45} width={size * 0.3} height={size * 0.12} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Body */}
            <ellipse cx={size * 0.5} cy={size * 0.62} rx={size * 0.3} ry={size * 0.14} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Base */}
            <rect x={size * 0.1} y={size * 0.76} width={size * 0.8} height={size * 0.18} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
          </g>
        );
      
      case 'rook':
        return (
          <g>
            {/* Tower with detailed crenellations */}
            <rect x={size * 0.2} y={size * 0.25} width={size * 0.6} height={size * 0.45} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Crenellations - more detailed */}
            <rect x={size * 0.1} y={size * 0.25} width={size * 0.12} height={size * 0.18} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <rect x={size * 0.26} y={size * 0.25} width={size * 0.12} height={size * 0.18} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <rect x={size * 0.42} y={size * 0.25} width={size * 0.12} height={size * 0.18} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <rect x={size * 0.58} y={size * 0.25} width={size * 0.12} height={size * 0.18} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <rect x={size * 0.74} y={size * 0.25} width={size * 0.12} height={size * 0.18} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Tower details */}
            <rect x={size * 0.3} y={size * 0.35} width={size * 0.4} height={size * 0.08} fill="none" stroke={stroke} strokeWidth={1} />
            <rect x={size * 0.3} y={size * 0.5} width={size * 0.4} height={size * 0.08} fill="none" stroke={stroke} strokeWidth={1} />
            {/* Base */}
            <rect x={size * 0.1} y={size * 0.7} width={size * 0.8} height={size * 0.2} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
          </g>
        );
      
      case 'bishop':
        return (
          <g>
            {/* Mitre with curved design */}
            <path d={`M ${size * 0.2} ${size * 0.45} 
                     Q ${size * 0.2} ${size * 0.2} ${size * 0.35} ${size * 0.15} 
                     Q ${size * 0.5} ${size * 0.1} ${size * 0.65} ${size * 0.15} 
                     Q ${size * 0.8} ${size * 0.2} ${size * 0.8} ${size * 0.45} 
                     L ${size * 0.2} ${size * 0.45} Z`} 
                  fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Cross on top */}
            <line x1={size * 0.5} y1={size * 0.1} x2={size * 0.5} y2={size * 0.05} stroke={stroke} strokeWidth={2.5} />
            <line x1={size * 0.45} y1={size * 0.075} x2={size * 0.55} y2={size * 0.075} stroke={stroke} strokeWidth={2.5} />
            {/* Neck */}
            <rect x={size * 0.35} y={size * 0.45} width={size * 0.3} height={size * 0.1} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Body with curves */}
            <ellipse cx={size * 0.5} cy={size * 0.6} rx={size * 0.25} ry={size * 0.12} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Base */}
            <rect x={size * 0.1} y={size * 0.72} width={size * 0.8} height={size * 0.18} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
          </g>
        );
      
      case 'knight':
        return (
          <g>
            {/* Horse head with detailed features */}
            <path d={`M ${size * 0.25} ${size * 0.6} 
                     Q ${size * 0.15} ${size * 0.5} ${size * 0.2} ${size * 0.35} 
                     Q ${size * 0.25} ${size * 0.2} ${size * 0.35} ${size * 0.25} 
                     Q ${size * 0.45} ${size * 0.3} ${size * 0.5} ${size * 0.25} 
                     Q ${size * 0.55} ${size * 0.2} ${size * 0.6} ${size * 0.3} 
                     Q ${size * 0.65} ${size * 0.4} ${size * 0.6} ${size * 0.5} 
                     Q ${size * 0.55} ${size * 0.6} ${size * 0.5} ${size * 0.55} 
                     Q ${size * 0.45} ${size * 0.5} ${size * 0.4} ${size * 0.55} 
                     Q ${size * 0.35} ${size * 0.6} ${size * 0.3} ${size * 0.55} 
                     Q ${size * 0.25} ${size * 0.5} ${size * 0.25} ${size * 0.6} Z`} 
                  fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Eye */}
            <circle cx={size * 0.4} cy={size * 0.35} r={size * 0.03} fill={stroke} />
            {/* Mane */}
            <path d={`M ${size * 0.25} ${size * 0.35} 
                     Q ${size * 0.15} ${size * 0.25} ${size * 0.2} ${size * 0.15} 
                     Q ${size * 0.25} ${size * 0.1} ${size * 0.3} ${size * 0.15} 
                     Q ${size * 0.35} ${size * 0.2} ${size * 0.3} ${size * 0.25}`} 
                  fill="none" stroke={stroke} strokeWidth={1.5} />
            {/* Body */}
            <ellipse cx={size * 0.5} cy={size * 0.65} rx={size * 0.25} ry={size * 0.12} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Base */}
            <rect x={size * 0.1} y={size * 0.77} width={size * 0.8} height={size * 0.18} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
          </g>
        );
      
      case 'pawn':
        return (
          <g>
            {/* Head with slight curve */}
            <ellipse cx={size * 0.5} cy={size * 0.35} rx={size * 0.12} ry={size * 0.15} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Neck */}
            <rect x={size * 0.4} y={size * 0.45} width={size * 0.2} height={size * 0.08} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Body with more defined shape */}
            <ellipse cx={size * 0.5} cy={size * 0.58} rx={size * 0.18} ry={size * 0.1} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {/* Base */}
            <rect x={size * 0.1} y={size * 0.68} width={size * 0.8} height={size * 0.22} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
          </g>
        );
      
      default:
        return null;
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderPiece()}
    </svg>
  );
};

export default Piece;
