import React, { memo, useEffect, useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { renderPiece } from '../utils/ChessBoardUtils';
import { Chess } from 'chess.js';
import { PlayerInfo } from '@/lib/types';

interface ChessBoardWithPlayersProps {
  currentPosition: string;
  whitePlayerName: string;
  blackPlayerName: string;
  onPositionChange?: (position: string) => void;
  isEditMode?: boolean;
  capturedPieces?: {
    white: string[];
    black: string[];
  };
  suggestedMove?: string | null;
  currentTurn?: 'w' | 'b';
}

export const chessboardStyles = `
  #notationChessboard .notation-322f9 {
    font-size: 14px !important;
    font-weight: bold !important;
    color: #333 !important;
    opacity: 1 !important;
  }
`;

const ChessBoardWithPlayers: React.FC<ChessBoardWithPlayersProps> = ({
  currentPosition,
  whitePlayerName,
  blackPlayerName,
  onPositionChange,
  isEditMode = false,
  capturedPieces = { white: [], black: [] },
  suggestedMove = null,
  currentTurn = 'w'
}) => {
  // We'll maintain our own internal Chess.js instance for state tracking
  const chessRef = useRef(new Chess());
  const [boardPosition, setBoardPosition] = useState(currentPosition);
  const prevPositionRef = useRef(currentPosition);
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1024 });
  const [customArrows, setCustomArrows] = useState<any[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<any[]>([]);
  const [dragStartSquare, setDragStartSquare] = useState<string | null>(null);
  const [isRemovingArrow, setIsRemovingArrow] = useState(false);
  
  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Effect to show suggestion arrows when a move is suggested
  useEffect(() => {
    if (!suggestedMove) {
      // Clear suggestion arrows and highlights when no suggestion is active
      // Store previous user arrows in a ref if needed
      setCustomArrows([]);
      setHighlightedSquares([]);
      return;
    }
    
    try {
      // Create a chess instance with the current position
      const chess = new Chess(currentPosition);
      
      // Try to find the move in the legal moves
      const legalMoves = chess.moves({ verbose: true });
      const moveData = legalMoves.find(m => m.san === suggestedMove);
      
      if (moveData) {
        // Create an arrow from the source to the target square with a green color
        setCustomArrows([[moveData.from, moveData.to, 'rgb(75, 181, 67)']]);
        
        // Highlight the from and to squares
        setHighlightedSquares([
          { [moveData.from]: { background: 'rgba(75, 181, 67, 0.4)' } },
          { [moveData.to]: { background: 'rgba(75, 181, 67, 0.4)' } }
        ]);
      } else {
        // Clear arrows if the move isn't legal in the current position
        setCustomArrows([]);
        setHighlightedSquares([]);
      }
    } catch (e) {
      console.warn('Error creating suggestion arrow:', e);
      // Clear any previous arrows on error
      setCustomArrows([]);
      setHighlightedSquares([]);
    }
  }, [suggestedMove, currentPosition]);

  // When the current FEN position changes from props, update smoothly
  useEffect(() => {
    if (prevPositionRef.current !== currentPosition) {
      prevPositionRef.current = currentPosition;
      
      // If there's a big change in position, just reset the board
      if (!isSimilarPosition(boardPosition, currentPosition)) {
        // Full reset for major position changes
        chessRef.current.load(currentPosition);
        setBoardPosition(currentPosition);
        return;
      }
      
      // Try to find the move that led to this position for animation
      try {
        const fromChess = new Chess(boardPosition);
        const moves = fromChess.moves({ verbose: true });
        
        // Find the move that leads to the new position
        for (const move of moves) {
          const testChess = new Chess(boardPosition);
          testChess.move(move);
          
          if (testChess.fen().split(' ')[0] === currentPosition.split(' ')[0]) {
            // We found the move - update our internal chess reference
            chessRef.current.load(boardPosition);
            chessRef.current.move(move);
            setBoardPosition(currentPosition);
            return;
          }
        }
        
        // If we can't find a smooth transition, just update the position
        chessRef.current.load(currentPosition);
        setBoardPosition(currentPosition);
      } catch (e) {
        // Fallback to direct update if something goes wrong
        chessRef.current.load(currentPosition);
        setBoardPosition(currentPosition);
      }
    }
  }, [currentPosition, boardPosition]);

  // Add this effect to handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Clear all arrows when pressing Escape
      if (e.key === 'Escape') {
        setCustomArrows([]);
        setDragStartSquare(null);
        setHighlightedSquares([]);
      }
      
      // Toggle remove mode with Alt/Option key
      if (e.key === 'Alt') {
        setIsRemovingArrow(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsRemovingArrow(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper function to check if positions are similar (same pieces, small changes)
  const isSimilarPosition = (pos1: string, pos2: string) => {
    const board1 = pos1.split(' ')[0]; // Just the piece positions
    const board2 = pos2.split(' ')[0];
    
    // Calculate difference in piece counts
    let diffCount = 0;
    for (let i = 0; i < Math.min(board1.length, board2.length); i++) {
      if (board1[i] !== board2[i]) diffCount++;
    }
    
    // If too many differences, consider it a major position change
    return diffCount < 4; // Threshold for "similar" positions
  };

  // Modify the handleMove function to be more user-friendly
  const handleMove = (from: string, to: string, promotion?: string) => {
    try {
      // Create a fresh chess instance with the current position
      const chess = new Chess(currentPosition);
      console.log("Current position:", currentPosition);
      console.log("Moving from", from, "to", to, promotion ? `with promotion ${promotion}` : "");
      
      // Get the piece that's being moved
      const piece = chess.get(from);
      console.log("Piece at source:", piece);
      
      // First check if this is a valid move without throwing errors
      const possibleMoves = chess.moves({ verbose: true });
      console.log("Possible moves:", possibleMoves.map(m => `${m.from}->${m.to} (${m.san})`).join(', '));
      
      // Find move with exact matching from and to squares
      const exactMatch = possibleMoves.find(move => 
        move.from === from && move.to === to && (!promotion || move.promotion === promotion)
      );
      
      if (exactMatch) {
        // We have an exact match, use it
        console.log("Found exact match:", exactMatch.san);
        const moveResult = chess.move(exactMatch);
        console.log("Move result:", moveResult);
        const newPosition = chess.fen();
        console.log("New position:", newPosition);
        
        // Update local board immediately for instant visual feedback
        setBoardPosition(newPosition);
        
        // Then notify parent
        if (onPositionChange) {
          onPositionChange(newPosition);
        }
        return true;
      } 
      
      // If we're here, try a more flexible approach for piece moves like knight
      const matchingMoves = possibleMoves.filter(move => 
        move.from === from && move.to === to
      );
      
      if (matchingMoves.length > 0) {
        // Use the first available matching move
        console.log("Using alternative match:", matchingMoves[0].san);
        const moveResult = chess.move(matchingMoves[0]);
        console.log("Move result:", moveResult);
        const newPosition = chess.fen();
        
        // Update local board immediately for instant visual feedback
        setBoardPosition(newPosition);
        
        // Then notify parent
        if (onPositionChange) {
          onPositionChange(newPosition);
        }
        return true;
      } else {
        // Debug information
        console.warn("Invalid move attempt:", from, "to", to);
        console.log("Available moves from this square:", possibleMoves
          .filter(m => m.from === from)
          .map(m => `${m.to} (${m.san})`)
          .join(', '));
        
        // Flash the square to indicate invalid move
        setHighlightedSquares([{
          [from]: { background: 'rgba(255, 0, 0, 0.3)' }
        }]);
        
        // Clear the highlight after a short delay
        setTimeout(() => {
          setHighlightedSquares([]);
        }, 500);
        
        return false;
      }
    } catch (error) {
      console.error("Error in handleMove:", error);
      return false;
    }
  };

  // Add this helper function near the top of the component
  const renderCondensedCapturedPieces = (pieces: string[]) => {
    if (pieces.length === 0) return null;
    
    // Group pieces by type and count them
    const pieceCounts: Record<string, number> = {};
    pieces.forEach(piece => {
      const pieceType = piece.replace(/[wb]/g, ''); // Remove color information
      pieceCounts[pieceType] = (pieceCounts[pieceType] || 0) + 1;
    });
    
    // Convert to array of [piece, count] pairs and sort by value (higher value pieces first)
    const pieceOrder = ['q', 'r', 'b', 'n', 'p'];
    const sortedPieces = Object.entries(pieceCounts)
      .sort((a, b) => pieceOrder.indexOf(a[0]) - pieceOrder.indexOf(b[0]));
    
    return (
      <div className="flex items-center text-xs">
        {sortedPieces.map(([pieceType, count], index) => (
          <div key={`piececount-${pieceType}`} className="flex items-center mx-1">
            <span>{renderPiece(pieceType)}</span>
            <span className="ml-1 text-gray-600">×{count}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 shadow-lg">
      {/* Black player information - make layout responsive */}
      <div className="w-full flex flex-col mb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-white bg-gray-800 h-8 w-8 rounded-full flex items-center justify-center mr-2">
              {renderPiece('♖')}
            </div>
            <div className="font-medium">{blackPlayerName}</div>
          </div>
          {/* Show score horizontally on larger screens only */}
          <div className="hidden sm:flex items-center">
            {capturedPieces.white.length > 0 && (
              <div className="flex items-center text-sm">
                {capturedPieces.white.map((piece, index) => (
                  <span key={`white-captured-${index}`} className="mx-0.5">
                    {renderPiece(piece)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Show condensed captured pieces below player name on mobile */}
        <div className="flex sm:hidden mt-1 ml-10">
          {capturedPieces.white.length > 0 && renderCondensedCapturedPieces(capturedPieces.white)}
        </div>
      </div>
      
      {/* Chess board with notation */}
      <div className="mx-auto flex justify-center">
        <Chessboard 
          position={boardPosition}
          onPieceDrop={(sourceSquare, targetSquare, piece) => {
            // Log the attempt
            console.log("Attempting move:", sourceSquare, "to", targetSquare, piece);
            
            // Check if this might be a promotion
            let promotion = undefined;
            if (piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1')) {
              promotion = 'q'; // Default to queen promotion
              console.log("Auto-promoting to queen");
            }
            
            // Try to make the move
            const result = handleMove(sourceSquare, targetSquare, promotion);
            
            // Log the result for debugging
            console.log("Move result:", result);
            
            // This is important - return true allows the move on the visual board
            return result;
          }}
          boardWidth={windowSize.width > 768 ? Math.min(650, windowSize.width * 0.45) : Math.min(320, windowSize.width * 0.85)}
          areArrowsAllowed={true}
          showBoardNotation={true}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
            maxWidth: '100%',
            margin: '0 auto'
          }}
          customDarkSquareStyle={{ backgroundColor: '#b58863' }}
          customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
          id="notationChessboard"
          boardOrientation="white"
          animationDuration={300}
          arePiecesDraggable={true}
          arePremovesAllowed={false}
          customArrowColor="rgba(0, 102, 255, 0.5)"
          customArrows={customArrows}
          onSquareClick={(square) => {
            if (dragStartSquare && dragStartSquare !== square) {
              handleMove(dragStartSquare, square);
              setDragStartSquare(null);
            } else {
              setDragStartSquare(square);
              
              const moves = new Chess(currentPosition).moves({
                square,
                verbose: true
              });
              
              if (moves.length > 0) {
                setHighlightedSquares(
                  moves.map(move => ({
                    [move.to]: {
                      background: 'rgba(0, 255, 0, 0.2)'
                    }
                  }))
                );
              }
            }
          }}
          onSquareRightClick={(square) => {
            if (dragStartSquare && dragStartSquare !== square) {
              // Check if this arrow already exists to remove it
              const arrowExists = customArrows.findIndex(
                arrow => arrow[0] === dragStartSquare && arrow[1] === square
              );
              
              if (arrowExists >= 0) {
                // Remove the arrow
                const newArrows = [...customArrows];
                newArrows.splice(arrowExists, 1);
                setCustomArrows(newArrows);
              } else {
                // Add new arrow
                setCustomArrows([...customArrows, [dragStartSquare, square]]);
              }
              
              setDragStartSquare(null);
              setHighlightedSquares([]);
            }
          }}
          customSquareStyles={
            Object.assign({}, ...highlightedSquares, 
              dragStartSquare ? {
                [dragStartSquare]: {
                  background: 'rgba(255, 255, 0, 0.4)'
                }
              } : {}
            )
          }
        />
      </div>
      
      {/* Touchpad instructions */}
      <div className="text-xs text-center text-gray-500 mt-1 px-2">
        <p>Touchpad: Tap to select piece, tap destination to move</p>
        <p>For arrows: Two-finger click to draw/remove arrows • Press Esc to clear all arrows</p>
      </div>
      
      {/* White player information - make layout responsive */}
      <div className="w-full flex flex-col mt-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-gray-800 bg-white h-8 w-8 rounded-full flex items-center justify-center border border-gray-300 mr-2">
              {renderPiece('♙')}
            </div>
            <div className="font-medium">{whitePlayerName}</div>
          </div>
          {/* Show score horizontally on larger screens only */}
          <div className="hidden sm:flex items-center">
            {capturedPieces.black.length > 0 && (
              <div className="flex items-center text-sm">
                {capturedPieces.black.map((piece, index) => (
                  <span key={`black-captured-${index}`} className="mx-0.5">
                    {renderPiece(piece)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Show condensed captured pieces below player name on mobile */}
        <div className="flex sm:hidden mt-1 ml-10">
          {capturedPieces.black.length > 0 && renderCondensedCapturedPieces(capturedPieces.black)}
        </div>
      </div>

      {/* Add a clear arrows button */}
      <div className="absolute top-1 right-1 z-10">
        <button
          onClick={() => setCustomArrows([])}
          className="bg-white rounded-full p-1 shadow-sm text-gray-500 hover:text-gray-700"
          title="Clear arrows"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default memo(ChessBoardWithPlayers); 