'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';

interface EditableCellProps {
  value: string;
  isInvalid: boolean;
  isSelected: boolean;
  onEdit: (newValue: string) => void;
  onClick: () => void;
  onKeyNav?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  showSuggestions?: boolean;
  onSuggestionHover?: (move: string | null) => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  isInvalid,
  isSelected,
  onEdit,
  onClick,
  onKeyNav,
  showSuggestions = true,
  onSuggestionHover
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const cellRef = useRef<HTMLDivElement>(null);
  const [suggestionVisible, setSuggestionVisible] = useState(false);

  // Get move suggestions while typing
  useEffect(() => {
    if (isEditing && showSuggestions) {
      const chess = new Chess();
      try {
        const legalMoves = chess.moves({ verbose: true });
        const filtered = legalMoves
          .map(move => move.san)
          .filter(move => move.toLowerCase().startsWith(editValue.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filtered);
      } catch {
        setSuggestions([]);
      }
    }
  }, [editValue, isEditing, showSuggestions]);

  // Add a new function to provide move suggestions
  const getSuggestionForInvalidMove = (invalidMove: string) => {
    if (!invalidMove) return [];
    
    try {
      // Create a chess instance to test moves
      const chess = new Chess();
      
      // If we're in a multi-move context, we'd need to apply previous moves first
      // For simplicity, we'll just suggest based on the starting position
      
      const legalMoves = chess.moves();
      
      // Simple fuzzy matching for suggestions
      return legalMoves.filter(move => {
        // Normalize moves for comparison
        const normalizedInvalid = invalidMove.toLowerCase().replace(/[+#=?!]/g, '');
        const normalizedLegal = move.toLowerCase().replace(/[+#=?!]/g, '');
        
        // Exact match without annotations
        if (normalizedInvalid === normalizedLegal) return true;
        
        // Starting character match (e.g., "Nf" for "Nf3")
        if (normalizedLegal.startsWith(normalizedInvalid)) return true;
        
        // Contains the same characters in roughly the same order
        let matchCount = 0;
        let lastMatchIdx = -1;
        
        for (const char of normalizedInvalid) {
          const idx = normalizedLegal.indexOf(char, lastMatchIdx + 1);
          if (idx > -1) {
            matchCount++;
            lastMatchIdx = idx;
          }
        }
        
        // If most characters matched in order
        return matchCount >= normalizedInvalid.length * 0.7;
      }).slice(0, 5); // Limit to 5 suggestions
    } catch (e) {
      return [];
    }
  };
  
  // Update the suggestions logic
  useEffect(() => {
    if (isEditing) {
      // ... existing suggestion logic ...
    } else if (isInvalid && value) {
      // Provide suggestions for invalid moves that already exist
      const invalidSuggestions = getSuggestionForInvalidMove(value);
      setSuggestions(invalidSuggestions);
      setSuggestionVisible(invalidSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setSuggestionVisible(false);
    }
  }, [isEditing, editValue, isInvalid, value]);

  // Add keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (onKeyNav) {
        onKeyNav(e.shiftKey ? 'left' : 'right');
      }
    } else if (e.key === 'ArrowUp' && onKeyNav) {
      onKeyNav('up');
    } else if (e.key === 'ArrowDown' && onKeyNav) {
      onKeyNav('down');
    } else if (e.key === 'ArrowLeft' && onKeyNav) {
      onKeyNav('left');
    } else if (e.key === 'ArrowRight' && onKeyNav) {
      onKeyNav('right');
    } else if (e.key === 'Enter') {
      if (selectedSuggestion >= 0) {
        onEdit(suggestions[selectedSuggestion]);
      } else {
        onEdit(editValue);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  return (
    <div
      ref={cellRef}
      className={`
        relative min-w-[2.5rem] h-7 px-2 mx-1 
        inline-flex items-center justify-center
        cursor-pointer select-none rounded
        ${isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-gray-50/80'}
        ${isInvalid ? 'text-red-500' : 'text-gray-900'}
        transition-colors duration-100
      `}
      onClick={onClick}
      onDoubleClick={() => setIsEditing(true)}
      tabIndex={0}
      onKeyDown={!isEditing ? handleKeyDown : undefined}
    >
      {isEditing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setSelectedSuggestion(-1);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setIsEditing(false);
              if (editValue !== value) {
                onEdit(editValue);
              }
            }}
            className="w-full h-full px-1 text-center bg-transparent outline-none"
            autoFocus
            size={Math.max(4, editValue.length)}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-32 z-20 bg-white shadow-lg rounded-md border border-gray-200 mt-1">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={suggestion}
                  className={`px-2 py-1 cursor-pointer text-sm
                    ${selectedSuggestion === idx ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => {
                    onEdit(suggestion);
                    setIsEditing(false);
                    if (onSuggestionHover) onSuggestionHover(null);
                  }}
                  onMouseEnter={() => onSuggestionHover && onSuggestionHover(suggestion)}
                  onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <span className="truncate">
          {value || '-'}
        </span>
      )}
      {isInvalid && !isEditing && (
        <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-red-300" />
      )}
      {isInvalid && !isEditing && suggestions.length > 0 && (
        <button
          className="absolute -right-2 -top-2 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center border border-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            setSuggestionVisible(true);
          }}
        >
          ?
        </button>
      )}
      {!isEditing && suggestionVisible && suggestions.length > 0 && (
        <div className="absolute top-full left-0 w-32 z-20 bg-white shadow-lg rounded-md border border-gray-200 mt-1">
          {suggestions.map((suggestion, idx) => (
            <div
              key={suggestion}
              className="px-2 py-1 cursor-pointer text-sm hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(suggestion);
                setSuggestionVisible(false);
                if (onSuggestionHover) onSuggestionHover(null);
              }}
              onMouseEnter={() => onSuggestionHover && onSuggestionHover(suggestion)}
              onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 