import { ChessMove } from '@/lib/types';
import { Chess } from 'chess.js';

// Piece values for sorting captured pieces
export const pieceValues: Record<string, number> = {
  'q': 9, 'r': 5, 'b': 3, 'n': 3, 'p': 1
};

// Render a chess piece as Unicode character
export const renderPiece = (piece: string) => {
  const pieces: Record<string, string> = {
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
  };
  
  return pieces[piece] || piece;
};

// Add proper type for piece counts
type PieceCount = { 
  [key: string]: number;
  p: number; n: number; b: number; r: number; q: number; k: number;
  P: number; N: number; B: number; R: number; Q: number; K: number;
};

// Function to track captured pieces
export const getCapturedPieces = (fen: string) => {
  // Count pieces in the position
  const position = fen.split(' ')[0];
  const pieceCounts: PieceCount = {
    'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0, 'k': 0,
    'P': 0, 'N': 0, 'B': 0, 'R': 0, 'Q': 0, 'K': 0
  };
  
  // Count pieces in the current position
  for (const char of position) {
    if (pieceCounts[char] !== undefined) {
      pieceCounts[char]++;
    }
  }
  
  // Calculate missing pieces (captured)
  const captured: {
    white: string[];
    black: string[];
  } = {
    white: [], // Black captured these white pieces
    black: []  // White captured these black pieces
  };
  
  // Initial piece counts
  const initialCounts: PieceCount = {
    'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1,
    'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1, 'K': 1
  };
  
  // Find captured white pieces (uppercase)
  for (const piece of ['P', 'N', 'B', 'R', 'Q']) {
    const count = initialCounts[piece] - pieceCounts[piece];
    for (let i = 0; i < count; i++) {
      captured.white.push(piece.toLowerCase());
    }
  }
  
  // Find captured black pieces (lowercase)
  for (const piece of ['p', 'n', 'b', 'r', 'q']) {
    const count = initialCounts[piece] - pieceCounts[piece];
    for (let i = 0; i < count; i++) {
      captured.black.push(piece);
    }
  }
  
  // Sort by value (highest first)
  captured.white.sort((a, b) => pieceValues[b] - pieceValues[a]);
  captured.black.sort((a, b) => pieceValues[b] - pieceValues[a]);
  
  return captured;
}; 

export const convertMovesToSAN = (moves: ChessMove[]): string[] => {
  const chess = new Chess();
  const sanMoves: string[] = [];

  for (const move of moves) {
    if (move.white && move.white.trim()) {
      try {
        const result = chess.move(move.white, { strict: false });
        if (result) {
          sanMoves.push(result.san);
        } else {
          // If move fails, add it as-is to maintain move count
          sanMoves.push(move.white);
          console.warn(`Using original notation for white move: ${move.white}`);
        }
      } catch (e) {
        // Add the move as-is to maintain move count
        sanMoves.push(move.white);
        console.warn(`Using original notation for white move: ${move.white}`);
      }
    }

    if (move.black && move.black.trim()) {
      try {
        const result = chess.move(move.black, { strict: false });
        if (result) {
          sanMoves.push(result.san);
        } else {
          // If move fails, add it as-is to maintain move count
          sanMoves.push(move.black);
          console.warn(`Using original notation for black move: ${move.black}`);
        }
      } catch (e) {
        // Add the move as-is to maintain move count
        sanMoves.push(move.black);
        console.warn(`Using original notation for black move: ${move.black}`);
      }
    }
  }

  return sanMoves;
};
// Format moves into PGN-style structure

export const formatMovesForPGN = (moves: ChessMove[]) => {
  const chess = new Chess(); // Start with a fresh chess instance
  const formattedMoves: Array<{
    moveNumber: number;
    white: { san: string; index: number; } | null;
    black: { san: string; index: number; } | null;
  }> = [];

  let moveIndex = -1;

  for (const move of moves) {
    const currentMoveNumber = move.moveNumber;

    // Handle white's move
    if (move.white && move.white.trim()) {
      moveIndex++;
      try {
        // Try to make the move
        const result = chess.move(move.white, { strict: false });

        if (result) {
          formattedMoves.push({
            moveNumber: currentMoveNumber,
            white: { san: result.san, index: moveIndex },
            black: null
          });
        } else {
          console.warn(`Couldn't parse white move: ${move.white}`);
        }
      } catch (e) {
        console.warn(`Error on white move ${currentMoveNumber}. ${move.white}:`, e);
        // Add the move anyway to maintain move count
        formattedMoves.push({
          moveNumber: currentMoveNumber,
          white: { san: move.white, index: moveIndex },
          black: null
        });
      }
    }

    // Handle black's move
    if (move.black && move.black.trim()) {
      moveIndex++;
      try {
        // Try to make the move
        const result = chess.move(move.black, { strict: false });

        if (result) {
          if (formattedMoves.length > 0 && formattedMoves[formattedMoves.length - 1].moveNumber === currentMoveNumber) {
            formattedMoves[formattedMoves.length - 1].black = { san: result.san, index: moveIndex };
          } else {
            formattedMoves.push({
              moveNumber: currentMoveNumber,
              white: null,
              black: { san: result.san, index: moveIndex }
            });
          }
        } else {
          console.warn(`Couldn't parse black move: ${move.black}`);
        }
      } catch (e) {
        console.warn(`Error on black move ${currentMoveNumber}. ${move.black}:`, e);
        // Add the move anyway to maintain move count
        if (formattedMoves.length > 0 && formattedMoves[formattedMoves.length - 1].moveNumber === currentMoveNumber) {
          formattedMoves[formattedMoves.length - 1].black = { san: move.black, index: moveIndex };
        } else {
          formattedMoves.push({
            moveNumber: currentMoveNumber,
            white: null,
            black: { san: move.black, index: moveIndex }
          });
        }
      }
    }
  }

  return formattedMoves;
};

