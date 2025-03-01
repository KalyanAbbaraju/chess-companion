// Enhanced status for OCR processing
export type OCRStatus = 
  | 'success'           // All processing completed successfully
  | 'partial_success'   // Some content was recognized but with issues
  | 'low_confidence'    // Content recognized but with low confidence
  | 'invalid_moves'     // Recognized moves don't form a valid game
  | 'failure'           // Failed to process
  | 'no_text_found';    // No chess notation found in images

// Move validation issues
export interface MoveValidation {
  moveIndex: number;      // Index in the moves array
  issue: string;          // Description of the issue
  suggestions?: string[]; // Possible corrections
  confidence?: number;    // Confidence score (0-1)
}

// Engine analysis (like Stockfish)
export interface EngineAnalysis {
  moveIndex: number;       // Index in the moves array
  evaluation: number;      // Centipawn evaluation
  bestMove?: string;       // Best move in the position 
  depth?: number;          // Search depth
  comments?: string;       // Engine commentary
}

// Enhanced OCR result interface
export interface OCRResult {
  // Core data
  moves: ChessMove[];            // Recognized chess moves
  playerInfo: PlayerInfo;        // Extracted player information
  rawText?: string[];            // Original OCR text for debugging
  
  // Status and quality information
  status: OCRStatus;             // Overall processing status
  confidence?: number;           // Overall confidence score (0-1)
  processingTime?: number;       // Time taken in milliseconds
  
  // Validation and enhancement
  moveValidation?: MoveValidation[];  // Issues with recognized moves
  engineAnalysis?: EngineAnalysis[];  // Engine feedback on moves
  
  // Errors and warnings
  errors?: string[];             // Critical errors during processing
  warnings?: string[];           // Non-critical issues
  
  // Additional metadata
  metadata?: Record<string, any>; // Provider-specific additional data
}

// Standard interface for OCR engine function signatures
export type OCRProcessor = (
  images: string[],
  onProgress: (progress: number, currentIndex: number) => void
) => Promise<OCRResult>;

export interface ChessMove {
  moveNumber: number;
  white: string;
  black: string;
  originalWhite?: string; // For tracking original moves
  originalBlack?: string; // For tracking original moves
}

// New structure for variations and move trees
export interface ChessMoveNode {
  id: string;           // Unique identifier for the move
  moveNumber: number;   // Full move number
  move: string;         // Move in SAN notation
  color: 'w' | 'b';     // White or black
  fen: string;          // FEN position after this move
  comment?: string;     // Optional comment
  annotation?: string;  // Optional annotation (!?, !, !!, etc.)
  original?: string;    // Original move if corrected
  isMainLine: boolean;  // Is this part of the main line or a variation
  parentId: string | null; // Parent move ID (null for initial position)
  variations: string[][]; // Change from ChessMoveNode[][] to string[][]
}

// Full game representation with move tree
export interface ChessGameTree {
  id: string;
  rootPosition: string; // Initial FEN position
  currentNode: string;  // Current selected move ID
  moves: Record<string, ChessMoveNode>; // All moves by ID
  mainLine: string[];   // IDs of moves in main line, in order
}
export interface PlayerInfo {
  whitePlayer: string;
  blackPlayer: string;
  event: string;
  date: string;
  result: string;
} // Convert our move format to standard algebraic notation
 