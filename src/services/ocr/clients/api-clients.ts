// Basic implementation of API clients for OCR services

import { OCRResult, ChessMove, PlayerInfo } from '@/lib/types';

// Fix duplicate interface definitions
export interface OCRClient {
  recognizeText(imageBuffer: Buffer): Promise<string>;
  recognizeChessNotation?(images: string[], onProgress?: (progress: number, currentIndex: number) => void): Promise<OCRResult>;
}

export class GoogleVisionAPI implements OCRClient {
  constructor(private apiKey: string = process.env.GOOGLE_VISION_API_KEY || '') {}
  
  async recognizeChessNotation(
    images: string[], 
    onProgress?: (progress: number, currentIndex: number) => void
  ): Promise<OCRResult> {
    const rawText: string[] = [];
    
    // Process each image
    for (let i = 0; i < images.length; i++) {
      // Convert data URL to binary
      const response = await fetch(images[i]);
      const imageBuffer = await response.arrayBuffer();
      
      // Call API (commented out for now)
      // const result = await this.callGoogleVisionAPI(imageBuffer);
      // rawText.push(result);
      
      // Mock result for now
      rawText.push("1. e4 e5 2. Nf3 Nc6");
      
      if (onProgress) {
        onProgress((i + 1) / images.length * 100, i);
      }
    }
    
    // Parse with Google-specific logic
    return this.parseGoogleVisionResponse(rawText);
  }
  
  async recognizeText(imageBuffer: Buffer): Promise<string> {
    // Implementation...
    return ""; // Replace with actual implementation
  }
  
  private parseGoogleVisionResponse(ocrText: string[]): OCRResult {
    // Google-specific parsing logic
    const playerInfo: PlayerInfo = {
      whitePlayer: '',
      blackPlayer: '',
      event: '',
      date: '',
      result: '*'
    };
    
    const moves: ChessMove[] = [];
    const confidence = 0.85; // Example confidence score
    
    // Parse text...
    
    // Return enhanced result
    return {
      moves,
      playerInfo,
      rawText: ocrText,
      status: moves.length > 0 ? 'success' : 'no_text_found',
      confidence,
      processingTime: 1250, // Example time
      warnings: moves.length === 0 ? ['No chess moves detected'] : []
    };
  }
}

export class MicrosoftComputerVision implements OCRClient {
  constructor(
    private endpoint: string = process.env.MS_COMPUTER_VISION_ENDPOINT || '',
    private apiKey: string = process.env.MS_COMPUTER_VISION_KEY || ''
  ) {}
  
  async recognizeChessNotation(
    images: string[], 
    onProgress?: (progress: number, currentIndex: number) => void
  ): Promise<OCRResult> {
    const rawText: string[] = [];
    
    // Process each image
    for (let i = 0; i < images.length; i++) {
      // Implementation details
      // ...
      
      // Mock result for now
      rawText.push("1. d4 Nf6 2. c4 e6");
      
      if (onProgress) {
        onProgress((i + 1) / images.length * 100, i);
      }
    }
    
    // Parse with Microsoft-specific logic
    return this.parseMicrosoftResponse(rawText);
  }
  
  async recognizeText(imageBuffer: Buffer): Promise<string> {
    // Implementation...
    return ""; // Replace with actual implementation
  }
  
  private parseMicrosoftResponse(ocrText: string[]): OCRResult {
    // Microsoft-specific parsing logic
    // ...
    
    return {
      moves: [],
      playerInfo: {
        whitePlayer: '',
        blackPlayer: '',
        event: '',
        date: '',
        result: '*'
      },
      rawText: ocrText,
      status: 'no_text_found'
    };
  }
}

export class PythonBackendOCR implements OCRClient {
  constructor(private apiUrl: string = process.env.PYTHON_OCR_API_URL || 'http://localhost:8000') {}
  
  async recognizeText(imageBuffer: Buffer): Promise<string> {
    try {
      // Create form data to send image
      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer]), 'image.png');
      
      // Call your Python backend
      const response = await fetch(`${this.apiUrl}/ocr/chess-scoresheet`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Python backend error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error calling Python OCR backend:', error);
      throw error;
    }
  }
}

/**
 * Process images using the backend API OCR service
 */
export const processBackendAPI = async (
  images: string[],
  onProgress: (progress: number, currentIndex: number) => void
): Promise<OCRResult> => {
  try {
    // Create form data
    const formData = new FormData();
    
    for (let i = 0; i < images.length; i++) {
      const response = await fetch(images[i]);
      const blob = await response.blob();
      formData.append('images', blob, `image-${i}.png`);
      onProgress((i / images.length) * 50, i);
    }
    
    // Send to backend API
    const apiResponse = await fetch('/api/recognize-chess-notation', {
      method: 'POST',
      body: formData,
    });
    
    if (!apiResponse.ok) {
      throw new Error('API request failed');
    }
    
    onProgress(75, images.length - 1);
    
    // Get raw text from API
    const result = await apiResponse.json();
    const rawTextResults = result.text || [];
    
    // Parse the OCR text
    const parsedResults = parseBackendApiResponse(rawTextResults);
    
    onProgress(100, images.length - 1);
    
    return {
      moves: parsedResults.moves,
      playerInfo: parsedResults.playerInfo,
      rawText: rawTextResults,
      status: parsedResults.moves.length > 0 ? 'success' : 'no_text_found'
    };
  } catch (error) {
    console.error('Error processing with backend API:', error);
    return {
      moves: [],
      playerInfo: {
        whitePlayer: '',
        blackPlayer: '',
        event: '',
        date: '',
        result: '*'
      },
      rawText: [],
      status: 'failure'
    };
  }
};

// Helper function specific to our backend API response format
const parseBackendApiResponse = (ocrText: string[]): { playerInfo: PlayerInfo, moves: ChessMove[] } => {
  const playerInfo: PlayerInfo = {
    whitePlayer: '',
    blackPlayer: '',
    event: '',
    date: '',
    result: '*'
  };
  
  const moves: ChessMove[] = [];
  
  // Backend-specific parsing logic
  for (const text of ocrText) {
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
  
  return { playerInfo, moves };
}; 