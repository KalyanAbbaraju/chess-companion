import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { PlayerInfo } from '@/lib/types';

interface FormattedMove {
  moveNumber: number;
  white: { san: string; index: number } | null;
  black: { san: string; index: number } | null;
}

interface MoveListProps {
  formattedMoves: FormattedMove[];
  currentMoveIndex: number;
  goToMove: (index: number) => void;
  playerInfo: PlayerInfo;
  invalidMoves: Set<number>;
  onMoveEdit: (moveIndex: number, color: 'white' | 'black', newMove: string) => void;
  moves: any[]; // Assuming this is the type of the moves array
  onSuggestionHover?: (moveIndex: number, move: string | null) => void;
}

const EditableMove: React.FC<{
  move: { san: string; index: number } | null;
  isInvalid: boolean;
  isSelected: boolean;
  onEdit: (newValue: string) => void;
  onClick: () => void;
  originalSan?: string;
  onSuggestionHover?: (move: string | null) => void;
}> = ({ move, isInvalid, isSelected, onEdit, onClick, originalSan, onSuggestionHover }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(move?.san || '');
  const [isValidMove, setIsValidMove] = useState(true);

  useEffect(() => {
    if (isEditing) {
      const chess = new Chess();
      try {
        const isValid = chess.move(editValue, { strict: false });
        setIsValidMove(!!isValid);
      } catch {
        setIsValidMove(false);
      }
    }
  }, [editValue, isEditing]);

  if (!move) return null;

  return (
    <div 
      className={`cursor-pointer px-2 py-1 rounded ${
        isSelected ? 'bg-blue-100' : isInvalid ? 'bg-red-50' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      onMouseEnter={() => onSuggestionHover && onSuggestionHover(move.san)}
      onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
    >
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            if (editValue !== move.san) {
              onEdit(editValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsEditing(false);
              if (editValue !== move.san) {
                onEdit(editValue);
              }
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue(move.san);
            }
          }}
          className={`
            w-full text-center bg-transparent
            outline-none border-none
            ${isValidMove ? 'text-gray-900' : 'text-red-500'}
          `}
          size={4}
          autoFocus
        />
      ) : (
        <div className="flex items-center">
          {originalSan && (
            <span className="line-through text-gray-500 mr-1">{originalSan}</span>
          )}
          <span className={isInvalid ? 'text-red-500' : ''}>{move?.san || ''}</span>
        </div>
      )}
    </div>
  );
};

const MoveList: React.FC<MoveListProps> = ({
  formattedMoves,
  currentMoveIndex,
  goToMove,
  playerInfo,
  invalidMoves,
  onMoveEdit,
  moves,
  onSuggestionHover
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm h-full">
      <div className="p-3 overflow-y-auto h-full">
        <div className="flex flex-wrap">
          {formattedMoves.map((move, idx) => (
            <React.Fragment key={`move-list-${move.moveNumber}-${idx}`}>
              <span className="text-gray-500 font-medium mr-1">{move.moveNumber}.</span>
              {move.white && (
                <EditableMove
                  move={move.white}
                  isInvalid={invalidMoves.has(move.white!.index)}
                  isSelected={currentMoveIndex === move.white!.index}
                  onEdit={(newValue) => onMoveEdit(move.white!.index, 'white', newValue)}
                  onClick={() => goToMove(move.white!.index)}
                  originalSan={moves[Math.floor(move.white!.index / 2)]?.originalWhite}
                  onSuggestionHover={(move) => onSuggestionHover && onSuggestionHover(move.white!.index, move)}
                />
              )}
              {move.black && (
                <EditableMove
                  move={move.black}
                  isInvalid={invalidMoves.has(move.black!.index)}
                  isSelected={currentMoveIndex === move.black!.index}
                  onEdit={(newValue) => onMoveEdit(move.black!.index, 'black', newValue)}
                  onClick={() => goToMove(move.black!.index)}
                  originalSan={moves[Math.floor(move.black!.index / 2)]?.originalBlack}
                  onSuggestionHover={(move) => onSuggestionHover && onSuggestionHover(move.black!.index, move)}
                />
              )}
              <span className="mr-2"></span>
            </React.Fragment>
          ))}
          
          {/* Result */}
          {playerInfo.result && playerInfo.result !== '*' && (
            <div className="ml-2 font-medium text-gray-900">
              {playerInfo.result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoveList;