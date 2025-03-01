import { createWorker, PSM } from 'tesseract.js';
import { OCRResult } from '@/lib/types';
import { ChessMove, PlayerInfo } from '@/components/scoresheet/DigitizedScoreSheet';

// Preprocess image for better OCR results
export const preprocessForChessOCR = async (imageData: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
      }
      
      // Apply threshold for better text contrast
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] < 160 ? 0 : 255;
        data[i] = v;     // red
        data[i + 1] = v; // green
        data[i + 2] = v; // blue
      }
      
      // Put processed data back
      ctx.putImageData(imageData, 0, 0);
      
      // Return processed image
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageData;
  });
};

// Process images with enhanced Tesseract OCR
export const processTesseractOCR = async (
  images: string[], 
  onProgress: (progress: number, currentIndex: number) => void
): Promise<OCRResult> => {
  const results: string[] = [];
  
  for (let i = 0; i < images.length; i++) {
    try {
      const preprocessedImage = await preprocessForChessOCR(images[i]);
      const worker = await createWorker('eng');
      
      // Enhanced Tesseract configuration for chess notation
      await worker.setParameters({
        tessedit_char_whitelist: 'abcdefgh12345678KQRBNPOx+#=-',
        tessjs_create_hocr: '0',
        tessjs_create_tsv: '0', 
        tessjs_create_box: '0',
        tessjs_create_unlv: '0',
        tessjs_create_osd: '0',
        textord_min_linesize: '1.5',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      
      const result = await worker.recognize(preprocessedImage);
      results.push(result.data.text);
      
      await worker.terminate();
      onProgress((i + 1) / images.length * 100, i);
    } catch (error) {
      console.error('Error with Tesseract OCR:', error);
    }
  }
  
  // Parse the OCR results into moves and player info
  const parsedResults = parseOcrText(results);
  
  // Return in standardized format
  return {
    moves: parsedResults.moves,
    playerInfo: parsedResults.playerInfo,
    rawText: results,
    status: parsedResults.moves.length > 0 ? 'success' : 'no_text_found'
  };
};

// Helper function to parse OCR text
const parseOcrText = (ocrText: string[]): { playerInfo: PlayerInfo, moves: ChessMove[] } => {
  const playerInfo: PlayerInfo = {
    whitePlayer: '',
    blackPlayer: '',
    event: '',
    date: '',
    result: '*'
  };
  
  const moves: ChessMove[] = [];
  
  // Loop through OCR results (pages)
  for (const text of ocrText) {
    // Check if this looks like PGN format with headers
    const isPgn = text.includes('[Event ') || text.includes('[White ') || text.includes('[Black ');
    
    if (isPgn) {
      // Parse player info from PGN headers
      const whiteMatch = text.match(/\[White\s+"([^"]+)"/);
      const blackMatch = text.match(/\[Black\s+"([^"]+)"/);
      const eventMatch = text.match(/\[Event\s+"([^"]+)"/);
      const dateMatch = text.match(/\[Date\s+"([^"]+)"/);
      const resultMatch = text.match(/\[Result\s+"([^"]+)"/);
      
      if (whiteMatch) playerInfo.whitePlayer = whiteMatch[1];
      if (blackMatch) playerInfo.blackPlayer = blackMatch[1];
      if (eventMatch) playerInfo.event = eventMatch[1];
      if (dateMatch) playerInfo.date = dateMatch[1];
      if (resultMatch) playerInfo.result = resultMatch[1];
      
      // Find the move section (after the last header)
      const moveTextMatch = text.match(/\]\s+(.+)/s);
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
    } else {
      // Simple regex for detecting move patterns like "1. e4 e5"
      const movePattern = /(\d+)\.?\s+([a-zA-Z0-9+#=!?-]+)(?:\s+([a-zA-Z0-9+#=!?-]+))?/g;
      
      let match;
      while ((match = movePattern.exec(text)) !== null) {
        const moveNumber = parseInt(match[1], 10);
        const white = match[2]?.trim();
        const black = match[3]?.trim() || '';
        
        moves.push({
          moveNumber,
          white,
          black
        });
      }
    }
  }
  
  return { playerInfo, moves };
}; 