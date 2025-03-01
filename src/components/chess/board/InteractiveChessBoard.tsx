'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { PlayerInfo } from '@/lib/types';
import { ChessMove } from '@/lib/types';
import { getCapturedPieces } from '../utils/ChessBoardUtils';
import ChessBoardWithPlayers from './ChessBoardWithPlayers';
import MoveList from '../notation/MoveList';
import MoveTable from '../notation/MoveTable';
import NavigationControls from '../navigation/NavigationControls';

interface InteractiveChessBoardProps {
  moves: ChessMove[];
  playerInfo: PlayerInfo;
  onMovesUpdate: (moves: ChessMove[]) => void;
  onPlayerInfoUpdate: (info: Partial<PlayerInfo>) => void;
}

interface FormattedMove {
  moveNumber: number;
  white: { san: string; index: number } | null;
  black: { san: string; index: number } | null;
}

// Add this interface for verified moves
interface VerifiedMove {
  moveNumber: number;
  white: { san: string; index: number; isValid: boolean } | null;
  black: { san: string; index: number; isValid: boolean } | null;
}

// First, modify the ChessMove interface to track original moves
interface ChessMove {
  moveNumber: number;
  white: string;
  black: string;
  originalWhite?: string; // Store original move when replaced
  originalBlack?: string; // Store original move when replaced
}

const InteractiveChessBoard: React.FC<InteractiveChessBoardProps> = ({ moves: initialMoves, playerInfo, onMovesUpdate, onPlayerInfoUpdate }) => {
  const [chess] = useState<Chess>(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [currentPosition, setCurrentPosition] = useState<string>(chess.fen());
  const [capturedPieces, setCapturedPieces] = useState<{white: string[], black: string[]}>({white: [], black: []});
  const [verifiedMoves, setVerifiedMoves] = useState<VerifiedMove[]>([]);
  const [invalidMoves, setInvalidMoves] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMoveIndex, setEditingMoveIndex] = useState<number | null>(null);
  const [moveHistory, setMoveHistory] = useState<ChessMove[][]>([initialMoves]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeView, setActiveView] = useState<'table' | 'list'>('table');
  const [moves, setMoves] = useState<ChessMove[]>(initialMoves);
  // Add state for suggested moves - will be used to show arrows
  const [suggestedMove, setSuggestedMove] = useState<string | null>(null);
  const [suggestionMoveIndex, setSuggestionMoveIndex] = useState<number | null>(null);

  // Add an effect to update moves when initialMoves changes
  useEffect(() => {
    console.log('initialMoves changed:', initialMoves);
    setMoves(initialMoves);
  }, [initialMoves]);

  // Debug logging
  useEffect(() => {
    console.log('First 5 moves:');
    moves.slice(0, 5).forEach(move => {
      console.log(`Move ${move.moveNumber}:`);
      console.log(`  White: ${move.white}`);
      console.log(`  Black: ${move.black}`);
    });
  }, [moves]);

  // Format moves for display without validation
  const formatMovesSimple = (moves: ChessMove[]): FormattedMove[] => {
    let moveIndex = -1;
    return moves.map(move => {
      const result: FormattedMove = { 
        moveNumber: move.moveNumber,
        white: null,
        black: null
      };
      
      if (move.white) {
        moveIndex++;
        result.white = { san: move.white, index: moveIndex };
      }
      if (move.black) {
        moveIndex++;
        result.black = { san: move.black, index: moveIndex };
      }
      return result;
    });
  };

  // Verify all moves on initialization
  useEffect(() => {
    const verifyAllMoves = () => {
      const verificationChess = new Chess();
      const verified: VerifiedMove[] = [];
      const invalid = new Set<number>();
      let moveIndex = -1;

      for (const move of moves) {
        const verifiedMove: VerifiedMove = {
          moveNumber: move.moveNumber,
          white: null,
          black: null
        };

        // Verify white's move
        if (move.white) {
          moveIndex++;
          let isValid = false;
          try {
            const result = verificationChess.move(move.white);
            isValid = !!result;
            if (!isValid) {
              invalid.add(moveIndex);
            }
          } catch (e) {
            invalid.add(moveIndex);
          }
          verifiedMove.white = { san: move.white, index: moveIndex, isValid };
        }

        // Verify black's move
        if (move.black) {
          moveIndex++;
          let isValid = false;
          try {
            const result = verificationChess.move(move.black);
            isValid = !!result;
            if (!isValid) {
              invalid.add(moveIndex);
            }
          } catch (e) {
            invalid.add(moveIndex);
          }
          verifiedMove.black = { san: move.black, index: moveIndex, isValid };
        }

        verified.push(verifiedMove);
      }

      return { verified, invalid };
    };

    const { verified, invalid } = verifyAllMoves();
    setVerifiedMoves(verified);
    setInvalidMoves(invalid);
    console.log('Verified moves:', verified);
    console.log('Invalid moves:', invalid);
  }, [moves]);

  // Add this function before the goToMove definition
  const getMoveInfo = (index: number) => {
    // Even indices (0, 2, 4...) are white's moves
    // Odd indices (1, 3, 5...) are black's moves
    const color = index % 2 === 0 ? 'white' : 'black';
    // Move number starts at 1 and increments after each full move (white + black)
    const moveNumber = Math.floor(index / 2) + 1;
    return { moveNumber, color };
  };

  // The goToMove function will now have access to getMoveInfo
  const goToMove = useCallback((index: number) => {
    if (index < -1 || index >= getTotalMoveCount()) return;
    
    setCurrentMoveIndex(index);
    const chess = new Chess();
    
    // Process moves up to the selected index
    let validMovesMade = 0;
    const newInvalidMoves = new Set<number>();
    
    for (let i = 0; i <= index; i++) {
      const { moveNumber, color } = getMoveInfo(i);
      const moveIdx = Math.floor(i / 2);
      const moveText = color === 'white' ? moves[moveIdx]?.white : moves[moveIdx]?.black;
      
      if (!moveText) continue;
      
      try {
        const result = chess.move(moveText, { strict: false });
        if (!result) {
          newInvalidMoves.add(i);
          console.warn(`Invalid move at index ${i}: ${moveText}`);
        } else {
          validMovesMade++;
        }
      } catch (e) {
        newInvalidMoves.add(i);
        console.warn(`Error processing move at index ${i}: ${moveText}`, e);
      }
    }
    
    // Update the board position with the valid moves
    setCurrentPosition(chess.fen());
    setInvalidMoves(newInvalidMoves);
    setCapturedPieces(getCapturedPieces(chess.fen()));
    
    // If we couldn't make all the moves, indicate the invalid state visually
    if (validMovesMade < index + 1) {
      console.warn(`Not all moves were valid. Made ${validMovesMade} valid moves out of ${index + 1} total.`);
    }
  }, [moves]);

  // Navigation functions
  const goToStart = useCallback(() => goToMove(-1), [goToMove]);
  
  const goToEnd = useCallback(() => {
    const lastIndex = moves.reduce((count, move) => {
      return count + (move.white ? 1 : 0) + (move.black ? 1 : 0);
    }, -1);
    goToMove(lastIndex);
  }, [goToMove, moves]);
  
  const goToPrevious = useCallback(() => {
    if (currentMoveIndex > -1) {
      goToMove(currentMoveIndex - 1);
    }
  }, [currentMoveIndex, goToMove]);
  
  const goToNext = useCallback(() => {
    const totalMoves = moves.reduce((count, move) => {
      return count + (move.white ? 1 : 0) + (move.black ? 1 : 0);
    }, 0);
    if (currentMoveIndex < totalMoves - 1) {
      goToMove(currentMoveIndex + 1);
    }
  }, [currentMoveIndex, goToMove, moves]);

  // Get description of current move
  const getMoveDescription = useCallback(() => {
    if (currentMoveIndex === -1) return 'Initial position';
    
    for (const move of verifiedMoves) {
      if (move.white && move.white.index === currentMoveIndex) {
        return `${move.moveNumber}. ${move.white.san}`;
      }
      if (move.black && move.black.index === currentMoveIndex) {
        return `${move.moveNumber}... ${move.black.san}`;
      }
    }
    return `Move ${currentMoveIndex + 1}`;
  }, [currentMoveIndex, verifiedMoves]);

  // Also update the historyLength calculation in NavigationControls
  const getTotalMoveCount = useCallback(() => {
    return moves.reduce((count, move) => {
      return count + (move.white ? 1 : 0) + (move.black ? 1 : 0);
    }, 0);
  }, [moves]);

  // Add this function before the handleMoveEdit callback
  const verifyMove = useCallback((move: string, moveIndex: number) => {
    const verificationChess = new Chess();
    
    // Apply all moves up to this point
    for (let i = 0; i < moveIndex; i++) {
      const currentMove = moves[Math.floor(i / 2)];
      try {
        if (i % 2 === 0 && currentMove.white) {
          verificationChess.move(currentMove.white);
        } else if (i % 2 === 1 && currentMove.black) {
          verificationChess.move(currentMove.black);
        }
      } catch (e) {
        console.warn(`Error applying move ${i}:`, e);
      }
    }

    // Try to apply the new move
    try {
      const result = verificationChess.move(move);
      if (result) {
        // Move is valid
        const newInvalidMoves = new Set(invalidMoves);
        newInvalidMoves.delete(moveIndex);
        setInvalidMoves(newInvalidMoves);

        // Update verifiedMoves
        const newVerifiedMoves = [...verifiedMoves];
        const moveObj = newVerifiedMoves[Math.floor(moveIndex / 2)];
        if (moveIndex % 2 === 0) {
          moveObj.white = { san: move, index: moveIndex, isValid: true };
        } else {
          moveObj.black = { san: move, index: moveIndex, isValid: true };
        }
        setVerifiedMoves(newVerifiedMoves);
        return true;
      }
    } catch (e) {
      console.warn(`Invalid move ${move} at position ${moveIndex}:`, e);
    }

    // Move is invalid
    const newInvalidMoves = new Set(invalidMoves);
    newInvalidMoves.add(moveIndex);
    setInvalidMoves(newInvalidMoves);

    // Update verifiedMoves
    const newVerifiedMoves = [...verifiedMoves];
    const moveObj = newVerifiedMoves[Math.floor(moveIndex / 2)];
    if (moveIndex % 2 === 0) {
      moveObj.white = { san: move, index: moveIndex, isValid: false };
    } else {
      moveObj.black = { san: move, index: moveIndex, isValid: false };
    }
    setVerifiedMoves(newVerifiedMoves);
    return false;
  }, [moves, invalidMoves, verifiedMoves]);

  // Update handleMoveEdit to use verifyMove
  const handleMoveEdit = useCallback((moveIndex: number, color: 'white' | 'black', newMove: string) => {
    // Create new moves array without mutating the original
    const newMoves = moves.map(move => ({...move}));
    const moveObj = newMoves[Math.floor(moveIndex / 2)];
    
    // Store original move before replacing
    if (color === 'white') {
      if (moveObj.white && moveObj.white !== newMove) {
        moveObj.originalWhite = moveObj.white;
      }
      moveObj.white = newMove;
    } else {
      if (moveObj.black && moveObj.black !== newMove) {
        moveObj.originalBlack = moveObj.black;
      }
      moveObj.black = newMove;
    }

    // Verify the new move
    verifyMove(newMove, moveIndex);
    
    // Add to history before updating moves
    setMoveHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newMoves];
    });
    setHistoryIndex(prev => prev + 1);
    
    // Update moves state and notify parent
    setMoves(newMoves);
    onMovesUpdate(newMoves);
    
    // Clear any active suggestions
    setSuggestedMove(null);
    setSuggestionMoveIndex(null);
    
    // Force re-validation of all moves
    setTimeout(() => {
      validateAllMoves();
    }, 50);
    
    // If this was the current move, update the board position
    if (moveIndex === currentMoveIndex) {
      goToMove(currentMoveIndex);
    }
  }, [moves, verifyMove, historyIndex, onMovesUpdate, goToMove, currentMoveIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setMoves(moveHistory[historyIndex - 1]);
    }
  }, [historyIndex, moveHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < moveHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setMoves(moveHistory[historyIndex + 1]);
    }
  }, [historyIndex, moveHistory]);
  
  // Add a handler for suggestion hover
  const handleSuggestionHover = useCallback((moveIndex: number, move: string | null) => {
    setSuggestionMoveIndex(move ? moveIndex : null);
    setSuggestedMove(move);
  }, []);

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  // Add a function to validate all moves
  const validateAllMoves = useCallback(() => {
    const chess = new Chess();
    const newInvalidMoves = new Set<number>();
    
    let moveIndex = 0;
    for (const move of moves) {
      if (move.white) {
        try {
          const result = chess.move(move.white, { strict: false });
          if (!result) newInvalidMoves.add(moveIndex);
        } catch (e) {
          newInvalidMoves.add(moveIndex);
        }
        moveIndex++;
      }
      
      if (move.black) {
        try {
          const result = chess.move(move.black, { strict: false });
          if (!result) newInvalidMoves.add(moveIndex);
        } catch (e) {
          newInvalidMoves.add(moveIndex);
        }
        moveIndex++;
      }
    }
    
    setInvalidMoves(newInvalidMoves);
    return newInvalidMoves.size === 0;
  }, [moves]);

  // Update the handleBoardEdit function to support changing moves via the board
  const handleBoardEdit = (newPosition: string) => {
    // First, ensure we have a valid move index selected
    if (currentMoveIndex < 0) {
      console.log("No move selected - cannot edit");
      // If no move is selected, start a new game
      setCurrentMoveIndex(0);
      // TODO: Consider handling this case better
    }

    console.log("handleBoardEdit called with position:", newPosition);
    
    // First, determine which move is being edited based on currentMoveIndex
    const { moveNumber, color } = getMoveInfo(currentMoveIndex);
    const arrayIdx = Math.floor(currentMoveIndex / 2);
    
    // Create a chess instance for the position before the current move
    const chess = new Chess();
    
    // Replay the game up to the previous move
    for (let i = 0; i < currentMoveIndex; i++) {
      const { moveNumber: mn, color: c } = getMoveInfo(i);
      const idx = Math.floor(i / 2);
      const moveText = c === 'white' ? moves[idx]?.white : moves[idx]?.black;
      
      if (moveText) {
        try {
          chess.move(moveText, { strict: false });
        } catch (e) {
          console.warn('Error replaying move:', e);
        }
      }
    }
    
    // Find what move was made to get from the previous position to newPosition
    const previousFen = chess.fen();
    const legalMoves = chess.moves({ verbose: true });
    
    // Try each legal move to see which one results in the new position
    let foundMove: string | null = null;
    
    for (const move of legalMoves) {
      const testChess = new Chess(previousFen);
      testChess.move(move);
      
      // Compare the board positions (ignore irrelevant parts of FEN like castling rights)
      if (testChess.fen().split(' ')[0] === newPosition.split(' ')[0]) {
        foundMove = move.san;
        break;
      }
    }
    
    if (foundMove) {
      // We found the move that was made on the board
      const updatedMoves = [...moves];
      
      // Update the current move, preserving the original
      if (color === 'white') {
        if (!updatedMoves[arrayIdx]) {
          updatedMoves[arrayIdx] = { moveNumber, white: foundMove, black: '' };
        } else {
          // Store original move before replacing
          if (updatedMoves[arrayIdx].white && updatedMoves[arrayIdx].white !== foundMove) {
            updatedMoves[arrayIdx].originalWhite = updatedMoves[arrayIdx].white;
          }
          updatedMoves[arrayIdx].white = foundMove;
        }
      } else {
        // Store original move before replacing
        if (updatedMoves[arrayIdx].black && updatedMoves[arrayIdx].black !== foundMove) {
          updatedMoves[arrayIdx].originalBlack = updatedMoves[arrayIdx].black;
        }
        updatedMoves[arrayIdx].black = foundMove;
      }
      
      // Apply the move and update position
      setMoves(updatedMoves); 
      setCurrentPosition(newPosition);
      
      // Add to history
      setMoveHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, updatedMoves];
      });
      setHistoryIndex(prev => prev + 1);
      
      // Update captured pieces and notify parents
      setCapturedPieces(getCapturedPieces(newPosition));
      onMovesUpdate(updatedMoves);
      
      // Verify the new move for validity
      verifyMove(foundMove, currentMoveIndex);
      
      // Clear any active suggestions
      setSuggestedMove(null);
      setSuggestionMoveIndex(null);
      
      console.log("Updated moves:", updatedMoves);
      
      // Force a re-render of children components - don't advance to next move automatically
      // This allows the user to see the move they just made
      setTimeout(() => {
        // Revalidate moves and update status
        validateAllMoves();
      }, 50);
      
      return true;
    }
    
    return false;
  };

  // Add debug log before rendering MoveTable
  console.log('About to render MoveTable with moves:', moves);

    
  // Call validateAllMoves when moves change
  useEffect(() => {
    validateAllMoves();
  }, [moves, validateAllMoves]);

  // Add this helper function to find similar moves
  const findSimilarMove = (invalidMove: string, legalMoves: any[]): string | null => {
    if (!invalidMove || !legalMoves.length) return null;
    
    // Try to identify common errors and fix them
    
    // 1. Check for simple typos in piece names (N/K/Q/R/B/P)
    const normalizedMove = invalidMove
      .replace(/^([^a-h])/, (match, piece) => {
        // Common OCR errors for pieces
        if ('0O'.includes(piece)) return 'O'; // Zero to O for castling
        if ('l1I'.includes(piece)) return 'N'; // l or 1 or I to N (knight)
        if ('o0'.includes(piece)) return 'O'; // o or 0 to O (castling)
        return piece;
      });
    
    // 2. For castling, normalize common variations
    const castlingNormalized = normalizedMove
      .replace(/^0-0-0/, 'O-O-O')
      .replace(/^0-0/, 'O-O')
      .replace(/^o-o-o/i, 'O-O-O')
      .replace(/^o-o/i, 'O-O');
    
    // 3. Check for exact match after normalization
    for (const move of legalMoves) {
      if (move.san === castlingNormalized) {
        return move.san;
      }
    }
    
    // 4. Compare move without specifiers (+, #, etc)
    const baseMove = castlingNormalized.replace(/[+#=]/g, '');
    for (const move of legalMoves) {
      if (move.san.replace(/[+#=]/g, '') === baseMove) {
        return move.san;
      }
    }
    
    // 5. Similar squares (e.g., e4 vs e5, d4 vs f4)
    // This handles common OCR and transcription errors
    if (/^[a-h][1-8]$/.test(baseMove)) {
      // Simple pawn move, find similar squares
      const file = baseMove[0];
      const rank = parseInt(baseMove[1]);
      
      for (const move of legalMoves) {
        if (move.san.length === 2) { // Simple pawn move
          const moveFile = move.san[0];
          const moveRank = parseInt(move.san[1]);
          
          // Adjacent file or rank
          if ((moveFile === file && Math.abs(moveRank - rank) === 1) || 
              (moveRank === rank && Math.abs(moveFile.charCodeAt(0) - file.charCodeAt(0)) === 1)) {
            return move.san;
          }
        }
      }
    }
    
    // 6. Find pieces moving to the target square
    const targetSquareMatch = invalidMove.match(/[a-h][1-8]$/);
    if (targetSquareMatch) {
      const targetSquare = targetSquareMatch[0];
      const candidateMoves = legalMoves.filter(m => m.san.endsWith(targetSquare));
      
      if (candidateMoves.length === 1) {
        // If there's only one piece that can move to this square, it's likely the intended move
        return candidateMoves[0].san;
      }
    }
    
    // If all of the above failed, return the first legal move as last resort
    // This ensures the game can continue
    return legalMoves.length > 0 ? legalMoves[0].san : null;
  };

  return (
    <div className="card bg-white shadow-md">
      <div className="card-body p-3 sm:p-5">
        <div className="flex flex-col lg:flex-row justify-center items-start gap-4 sm:gap-5 max-w-6xl mx-auto">
          {/* Chess Board with optimized width */}
          <div className="w-full lg:w-auto">
            <div className="bg-gray-50 rounded-lg flex items-center justify-center h-auto">
              <ChessBoardWithPlayers
                currentPosition={currentPosition}
                capturedPieces={capturedPieces}
                whitePlayerName={playerInfo.whitePlayer || 'White'}
                blackPlayerName={playerInfo.blackPlayer || 'Black'}
                onPositionChange={(newPosition) => {
                  console.log("Position changed via board:", newPosition);
                  handleBoardEdit(newPosition);
                }}
                isEditMode={true}
                suggestedMove={suggestedMove}
              />
            </div>
          </div>
          
          {/* Move list with proper sizing */}
          <div className="w-full lg:w-[350px]">
            <div className="flex flex-col h-auto">
              {/* Game metadata moved here */}
              <div className="mb-3">
                <h2 className="text-lg font-medium mb-1">
                  {playerInfo.event || 'Chess Game'}
                </h2>
                <div className="text-sm text-gray-700 flex flex-wrap justify-start items-center gap-1 sm:gap-3">
                  <span className="font-medium">
                    {playerInfo.whitePlayer || 'White'} vs {playerInfo.blackPlayer || 'Black'}
                  </span>
                  {playerInfo.date && (
                    <span className="text-gray-500">
                      {playerInfo.date}
                    </span>
                  )}
                  {playerInfo.result && playerInfo.result !== '*' && (
                    <span className="font-medium">{playerInfo.result}</span>
                  )}
                </div>
                {invalidMoves.size > 0 && (
                  <div className="flex justify-start mt-2">
                    <button
                      onClick={() => {
                        // Create a copy of moves for correction
                        const correctedMoves = [...moves];
                        const chess = new Chess();
                        
                        // Process moves sequentially to maintain valid game state
                        for (let moveIdx = 0; moveIdx < getTotalMoveCount(); moveIdx++) {
                          const { moveNumber, color } = getMoveInfo(moveIdx);
                          const arrayIdx = Math.floor(moveIdx / 2);
                          
                          // If this is not an invalid move, just apply it and continue
                          if (!invalidMoves.has(moveIdx)) {
                            try {
                              const moveText = color === 'white' 
                                ? correctedMoves[arrayIdx].white 
                                : correctedMoves[arrayIdx].black;
                              
                              if (moveText) chess.move(moveText, { strict: false });
                            } catch (e) {
                              console.warn(`Unexpected error with valid move at ${moveIdx}`, e);
                            }
                            continue;
                          }
                          
                          // This is an invalid move that needs correction
                          const invalidMoveText = color === 'white' 
                            ? correctedMoves[arrayIdx].white 
                            : correctedMoves[arrayIdx].black;
                          
                          if (!invalidMoveText) continue;
                          
                          // Get all legal moves in this position
                          const legalMoves = chess.moves({ verbose: true });
                          
                          // Try to find the best match using similarity heuristics
                          const suggestion = findSimilarMove(invalidMoveText, legalMoves);
                          
                          if (suggestion) {
                            // Apply the suggested move
                            chess.move(suggestion);
                            
                            // Update the corrected moves array
                            if (color === 'white') {
                              correctedMoves[arrayIdx].white = suggestion;
                            } else {
                              correctedMoves[arrayIdx].black = suggestion;
                            }
                          } else {
                            // If we can't find a similar move, mark it for user attention
                            if (color === 'white') {
                              correctedMoves[arrayIdx].white = `[${invalidMoveText}?]`;
                            } else {
                              correctedMoves[arrayIdx].black = `[${invalidMoveText}?]`;
                            }
                          }
                        }
                        
                        // Update moves with corrections
                        setMoves(correctedMoves);
                        onMovesUpdate(correctedMoves);
                        
                        // Highlight any remaining problematic moves
                        validateAllMoves();
                      }}
                      className="text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 border border-blue-100"
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Auto-correct {invalidMoves.size} invalid {invalidMoves.size === 1 ? 'move' : 'moves'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex border-b mb-2">
                <button
                  onClick={() => setActiveView('table')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeView === 'table' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setActiveView('list')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeView === 'list' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  List View
                </button>
              </div>
              
              <div className="bg-white rounded-lg overflow-auto max-h-[500px]">
                {activeView === 'table' ? (
                  <MoveTable
                    moves={moves}
                    currentMoveIndex={currentMoveIndex}
                    goToMove={goToMove}
                    playerInfo={playerInfo}
                    invalidMoves={invalidMoves}
                    onMoveEdit={handleMoveEdit}
                    onSuggestionHover={handleSuggestionHover}
                  />
                ) : (
                  <MoveList
                    formattedMoves={formatMovesSimple(moves)}
                    currentMoveIndex={currentMoveIndex}
                    goToMove={goToMove}
                    playerInfo={playerInfo}
                    invalidMoves={invalidMoves}
                    onMoveEdit={handleMoveEdit}
                    moves={moves}
                    onSuggestionHover={handleSuggestionHover}
                  />
                )}
              </div>
              
              {/* Navigation controls */}
              <div className="mt-4">
                <NavigationControls
                  currentMoveIndex={currentMoveIndex}
                  historyLength={getTotalMoveCount()}
                  goToStart={goToStart}
                  goToPrevious={goToPrevious}
                  goToNext={goToNext}
                  goToEnd={goToEnd}
                  moveDescription={getMoveDescription()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveChessBoard;