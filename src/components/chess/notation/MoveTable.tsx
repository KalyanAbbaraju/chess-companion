import React, { useState, useRef, useEffect } from 'react';
import { PlayerInfo } from '@/lib/types';
import { ChessMove } from '@/lib/types';
import { Chess } from 'chess.js';
import { EditableCell } from './EditableCell';

interface MoveTableProps {
  moves: ChessMove[];
  currentMoveIndex: number;
  goToMove: (index: number) => void;
  playerInfo: PlayerInfo;
  invalidMoves: Set<number>;
  onMoveEdit: (moveIndex: number, color: 'white' | 'black', newMove: string) => void;
  onSuggestionHover?: (moveIndex: number, move: string | null) => void;
}

const MoveTable: React.FC<MoveTableProps> = ({
  moves,
  currentMoveIndex,
  goToMove,
  playerInfo,
  invalidMoves,
  onMoveEdit,
  onSuggestionHover
}) => {
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);

  // Set selected cell based on currentMoveIndex
  useEffect(() => {
    if (currentMoveIndex >= 0) {
      const row = Math.floor(currentMoveIndex / 2);
      const col = currentMoveIndex % 2 + 1; // +1 because col 0 is move number
      setSelectedCell({row, col});
    } else {
      setSelectedCell(null);
    }
  }, [currentMoveIndex]);

  // Handle keyboard navigation
  const handleKeyNav = (row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const totalRows = moves.length;
    
    switch (direction) {
      case 'up':
        if (row > 0) {
          const newRow = row - 1;
          const newCol = col;
          const moveIndex = newRow * 2 + (newCol - 1);
          goToMove(moveIndex);
        }
        break;
      case 'down':
        if (row < totalRows - 1) {
          const newRow = row + 1;
          const newCol = col;
          const moveIndex = newRow * 2 + (newCol - 1);
          goToMove(moveIndex);
        }
        break;
      case 'left':
        if (col > 1) {
          const newRow = row;
          const newCol = 1;
          const moveIndex = newRow * 2;
          goToMove(moveIndex);
        } else if (row > 0) {
          const newRow = row - 1;
          const newCol = 2;
          const moveIndex = newRow * 2 + 1;
          goToMove(moveIndex);
        }
        break;
      case 'right':
        if (col < 2) {
          const newRow = row;
          const newCol = 2;
          const moveIndex = newRow * 2 + 1;
          goToMove(moveIndex);
        } else if (row < totalRows - 1) {
          const newRow = row + 1;
          const newCol = 1;
          const moveIndex = newRow * 2;
          goToMove(moveIndex);
        }
        break;
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white h-full">
      {/* Scrollable content */}
      <div className="overflow-y-auto h-full scrollbar-thin scrollbar-thumb-gray-300">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-blue-50 border-b border-gray-200">
              <th className="w-12 py-3 px-3 text-primary text-sm font-semibold text-left">#</th>
              <th className="py-3 px-3 text-primary text-sm font-semibold text-center">White</th>
              <th className="py-3 px-3 text-primary text-sm font-semibold text-center">Black</th>
            </tr>
          </thead>
          <colgroup>
            <col style={{width: '20%'}} />
            <col style={{width: '40%'}} />
            <col style={{width: '40%'}} />
          </colgroup>
          <tbody>
            {moves.map((move, idx) => (
              <tr 
                key={`move-${move.moveNumber}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50/50"
              >
                <td className="py-1 px-2 text-left text-gray-500 text-sm">
                  {move.moveNumber}
                </td>
                <td className="p-0">
                  <div className="relative">
                    {move.originalWhite && (
                      <span className="absolute top-0 left-2 line-through text-gray-500 z-10 pointer-events-none">
                        {move.originalWhite}
                      </span>
                    )}
                    <EditableCell
                      value={move.white || ''}
                      isInvalid={invalidMoves.has(idx * 2)}
                      isSelected={currentMoveIndex === idx * 2}
                      onEdit={(newValue) => onMoveEdit(idx * 2, 'white', newValue)}
                      onClick={() => goToMove(idx * 2)}
                      onKeyNav={(direction) => handleKeyNav(idx, 1, direction)}
                      onSuggestionHover={(move) => onSuggestionHover && onSuggestionHover(idx * 2, move)}
                    />
                  </div>
                </td>
                <td className="p-0">
                  <div className="relative">
                    {move.originalBlack && (
                      <span className="absolute top-0 left-2 line-through text-gray-500 z-10 pointer-events-none">
                        {move.originalBlack}
                      </span>
                    )}
                    <EditableCell
                      value={move.black || ''}
                      isInvalid={invalidMoves.has(idx * 2 + 1)}
                      isSelected={currentMoveIndex === idx * 2 + 1}
                      onEdit={(newValue) => onMoveEdit(idx * 2 + 1, 'black', newValue)}
                      onClick={() => goToMove(idx * 2 + 1)}
                      onKeyNav={(direction) => handleKeyNav(idx, 2, direction)}
                      onSuggestionHover={(move) => onSuggestionHover && onSuggestionHover(idx * 2 + 1, move)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MoveTable; 