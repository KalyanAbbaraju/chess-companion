import { ChessMove, PlayerInfo } from '@/lib/types';
import { OCRResult } from '@/lib/types';

// Keep sample data for consistent API
export const samplePlayerInfo: PlayerInfo = {
  whitePlayer: "Donald Byrne",
  blackPlayer: "Bobby Fischer",
  event: "Rosenwald Memorial Tournament",
  date: "1956.10.17",
  result: "0-1"
};

export const sampleMoves: ChessMove[] = [
  { moveNumber: 1, white: "Nf3", black: "Nf6" },
  { moveNumber: 2, white: "c4", black: "g6" },
  { moveNumber: 3, white: "Nc3", black: "Bg7" },
  { moveNumber: 4, white: "d4", black: "O-O" },
  { moveNumber: 5, white: "Bf4", black: "d5" },
  { moveNumber: 6, white: "Qb3", black: "dcc4" }, // Intentional typo: dcc4 instead of dxc4
  { moveNumber: 7, white: "Qxc4", black: "c6" },
  { moveNumber: 8, white: "e4", black: "Nbd7" },
  { moveNumber: 9, white: "Rd1", black: "Nb6" },
  { moveNumber: 10, white: "Qc5", black: "Bg4" },
  { moveNumber: 11, white: "Bg5", black: "Na4" },
  { moveNumber: 12, white: "Qa3", black: "Nxc3" },
  { moveNumber: 13, white: "bxc3", black: "Nxe4" },
  { moveNumber: 14, white: "Bxe7", black: "Qb6" },
  { moveNumber: 15, white: "Bc4", black: "Nxc3" },
  { moveNumber: 16, white: "Bc5", black: "Rfe8+" },
  { moveNumber: 17, white: "Kf1", black: "Be6" },
  { moveNumber: 18, white: "Bxb6", black: "Bxc4+" },
  { moveNumber: 19, white: "Kg1", black: "Ne2+" },
  { moveNumber: 20, white: "Kf1", black: "Nxd4+" },
  { moveNumber: 21, white: "Kg1", black: "Ne2+" },
  { moveNumber: 22, white: "Kf1", black: "Nc3+" },
  { moveNumber: 23, white: "Kg1", black: "axb6" },
  { moveNumber: 24, white: "Qb4", black: "Ra4" },
  { moveNumber: 25, white: "Qxb6", black: "Nxd1" },
  { moveNumber: 26, white: "h3", black: "Rxa2" },
  { moveNumber: 27, white: "Kh2", black: "Nxf2" },
  { moveNumber: 28, white: "Re1", black: "Rxe1" },
  { moveNumber: 29, white: "Qd8+", black: "Bf8" },
  { moveNumber: 30, white: "Nxe1", black: "Bd5" },
  { moveNumber: 31, white: "Nf3", black: "Ne4" },
  { moveNumber: 32, white: "Qb8", black: "b5" },
  { moveNumber: 33, white: "h4", black: "h5" },
  { moveNumber: 34, white: "Ne5", black: "Kg7" },
  { moveNumber: 35, white: "Kg1", black: "Bc5+" },
  { moveNumber: 36, white: "Kf1", black: "Ng3+" },
  { moveNumber: 37, white: "Ke1", black: "Bb4+" },
  { moveNumber: 38, white: "Kd1", black: "Bb3+" },
  { moveNumber: 39, white: "Kc1", black: "Ne2+" },
  { moveNumber: 40, white: "Kb1", black: "Nc3+" },
  { moveNumber: 41, white: "Kc1", black: "Rc2#" }
];

// Parse PGN text into moves and player info
const parsePgn = (pgnText: string): { playerInfo: PlayerInfo, moves: ChessMove[] } => {
  const playerInfo: PlayerInfo = {
    whitePlayer: '',
    blackPlayer: '',
    event: '',
    date: '',
    result: '*'
  };
  const moves: ChessMove[] = [];
  
  // Parse player info from PGN headers
  const whiteMatch = pgnText.match(/\[White\s+"([^"]+)"/);
  const blackMatch = pgnText.match(/\[Black\s+"([^"]+)"/);
  const eventMatch = pgnText.match(/\[Event\s+"([^"]+)"/);
  const dateMatch = pgnText.match(/\[Date\s+"([^"]+)"/);
  const resultMatch = pgnText.match(/\[Result\s+"([^"]+)"/);
  
  if (whiteMatch) playerInfo.whitePlayer = whiteMatch[1];
  if (blackMatch) playerInfo.blackPlayer = blackMatch[1];
  if (eventMatch) playerInfo.event = eventMatch[1];
  if (dateMatch) playerInfo.date = dateMatch[1];
  if (resultMatch) playerInfo.result = resultMatch[1];
  
  // Find the move section (after the last header)
  const moveTextMatch = pgnText.match(/\]\s+([\s\S]+)/);
  if (moveTextMatch) {
    const moveText = moveTextMatch[1];
    
    // Use a regex to extract moves from PGN format
    const moveRegex = /(\d+)\.\s+(\S+)\s+(\S+)/g;
    let match;
    
    while ((match = moveRegex.exec(moveText)) !== null) {
      const moveNumber = parseInt(match[1], 10);
      const white = match[2];
      const black = match[3];
      
      moves.push({ moveNumber, white, black });
    }
  }
  
  return { playerInfo, moves };
};

// Mock OCR implementation that returns standardized OCR results
export const processMockOCR = async (
  images: string[],
  onProgress: (progress: number, currentIndex: number) => void
): Promise<OCRResult> => {
  // Simulate processing time
  for (let i = 0; i < images.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 800));
    onProgress((i + 1) / images.length * 100, i);
  }
  
  try {
    // Fetch the PGN file from the public directory
    const response = await fetch('/sample-games/game-of-century.pgn');
    if (!response.ok) {
      throw new Error('Failed to fetch sample PGN file');
    }
    
    // Get the PGN content as text
    const pgnText = await response.text();
    
    // Parse the PGN
    const { playerInfo, moves } = parsePgn(pgnText);
    
    // Return standardized format
    return {
      moves,
      playerInfo,
      rawText: [pgnText],
      status: 'success'
    };
  } catch (error) {
    console.error('Error loading sample PGN:', error);
    
    // Fallback to hardcoded data
    return {
      moves: sampleMoves,
      playerInfo: samplePlayerInfo,
      rawText: [`[Event "${samplePlayerInfo.event}"]...`],
      status: 'success'
    };
  }
}; 