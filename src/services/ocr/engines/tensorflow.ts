import * as tf from '@tensorflow/tfjs';
import { OCRResult, PlayerInfo, ChessMove } from '@/lib/types';

// Export the main processing function
export const processHandwritingModel = async (
  images: string[],
  onProgress: (progress: number, currentIndex: number) => void
): Promise<OCRResult> => {
  const results: string[] = [];
  
  // For now, use mock model and processing
  try {
    for (let i = 0; i < images.length; i++) {
      onProgress((i * 50) / images.length, i); // 50% on preprocessing
      
      // Preprocess image
      const preprocessedImage = await preprocessForNeuralNetwork(images[i]);
      
      // Segment into rows
      const imageSegments = await segmentImage(preprocessedImage);
      
      let pageText = '';
      for (let j = 0; j < imageSegments.length; j++) {
        const segment = imageSegments[j];
        
        // Get tensor representation
        const tensor = await imageSegmentToTensor(segment);
        
        // Use mock prediction for now - to be replaced with real model
        const mockPrediction = tf.tensor([...Array(83)].map(() => Math.random()));
        
        // Decode prediction
        const text = decodePrediction(mockPrediction);
        pageText += text;
        
        // Clean up tensors to prevent memory leaks
        tf.dispose(tensor);
        tf.dispose(mockPrediction);
        
        // Update progress
        const segmentProgress = 50 + ((i * 50) + (j / imageSegments.length * 50)) / images.length;
        onProgress(segmentProgress, i);
      }
      
      results.push(pageText);
      
      // Final progress for this image
      onProgress(((i + 1) * 100) / images.length, i);
    }
  } catch (error) {
    console.error('Error processing with TensorFlow:', error);
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

// Preprocess image for neural network
export const preprocessForNeuralNetwork = async (imageUrl: string): Promise<ImageData> => {
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
      
      // Convert to grayscale and normalize
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
      }
      
      // Contrast enhancement - binarize with Otsu's method
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        histogram[data[i]]++;
      }
      
      // Calculate Otsu's threshold
      const total = data.length / 4;
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
      }
      
      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let maxVariance = 0;
      let threshold = 0;
      
      for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;
        
        wF = total - wB;
        if (wF === 0) break;
        
        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) {
          maxVariance = variance;
          threshold = i;
        }
      }
      
      // Apply threshold
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] < threshold ? 0 : 255;
        data[i] = v;     // red
        data[i + 1] = v; // green
        data[i + 2] = v; // blue
      }
      
      // Put processed data back to image
      ctx.putImageData(imageData, 0, 0);
      
      // Return processed image data
      resolve(imageData);
    };
    img.src = imageUrl;
  });
};

// Segment image into rows/cells
export const segmentImage = async (imageData: ImageData): Promise<ImageData[]> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);
  
  // Find horizontal projections to identify text rows
  const horizontalProjection = new Array(imageData.height).fill(0);
  const data = imageData.data;
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;
      // Count black pixels (0) as text
      if (data[idx] === 0) {
        horizontalProjection[y]++;
      }
    }
  }
  
  // Find rows where text appears (where projection > threshold)
  const rowThreshold = imageData.width * 0.02; // 2% of width as threshold
  const textRows: {start: number, end: number}[] = [];
  let inRow = false;
  let rowStart = 0;
  
  for (let y = 0; y < imageData.height; y++) {
    if (!inRow && horizontalProjection[y] > rowThreshold) {
      // Start of a new row
      rowStart = y;
      inRow = true;
    } else if (inRow && horizontalProjection[y] <= rowThreshold) {
      // End of a row
      textRows.push({start: rowStart, end: y});
      inRow = false;
    }
  }
  
  // If we ended in a row, add the final row
  if (inRow) {
    textRows.push({start: rowStart, end: imageData.height - 1});
  }
  
  // Merge rows that are very close to each other (likely same line)
  const mergedRows: {start: number, end: number}[] = [];
  const rowGapThreshold = 10; // Pixels
  
  if (textRows.length > 0) {
    let currentRow = textRows[0];
    
    for (let i = 1; i < textRows.length; i++) {
      if (textRows[i].start - currentRow.end <= rowGapThreshold) {
        // Merge with previous row
        currentRow.end = textRows[i].end;
      } else {
        // Add previous row and start a new one
        mergedRows.push(currentRow);
        currentRow = textRows[i];
      }
    }
    
    // Add the last row
    mergedRows.push(currentRow);
  }
  
  // Extract row images
  const segments: ImageData[] = [];
  
  for (const row of mergedRows) {
    const rowHeight = row.end - row.start;
    if (rowHeight < 10) continue; // Skip very small rows
    
    const rowImageData = ctx.getImageData(0, row.start, imageData.width, rowHeight);
    segments.push(rowImageData);
  }
  
  return segments;
};

// Convert image segment to tensor for model input
export const imageSegmentToTensor = async (segment: ImageData): Promise<tf.Tensor> => {
  // Resize to model input dimensions (assuming 28x28 for many models)
  const targetWidth = 28;
  const targetHeight = 28;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  // Create a temporary canvas to draw original segment
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Failed to get temporary canvas context');
  }
  
  tempCanvas.width = segment.width;
  tempCanvas.height = segment.height;
  tempCtx.putImageData(segment, 0, 0);
  
  // Draw to target size with smoothing turned off for better character recognition
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, segment.width, segment.height, 0, 0, targetWidth, targetHeight);
  
  // Get normalized pixel data [0-1]
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = new Float32Array(targetWidth * targetHeight);
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    // Normalize: invert and convert to [0-1] range
    // (for MNIST-like models, white is 0 and black is 1)
    pixels[i/4] = (255 - imageData.data[i]) / 255;
  }
  
  // Reshape to model input dimensions
  return tf.tensor(pixels, [1, targetWidth, targetHeight, 1]);
};

// Decode model prediction to text
export const decodePrediction = (prediction: tf.Tensor): string => {
  // Get array of predictions
  const predictionArray = prediction.dataSync();
  
  // For a classifier, find the index with highest probability
  let maxIndex = 0;
  let maxProb = predictionArray[0];
  
  for (let i = 1; i < predictionArray.length; i++) {
    if (predictionArray[i] > maxProb) {
      maxProb = predictionArray[i];
      maxIndex = i;
    }
  }
  
  // Map index to character - IAM dataset character set
  // This is a typical mapping for the IAM dataset
  const iamChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?-+#/()[]{}=<>*\"'_@&%$";
  
  // For chess notation, we'll focus on a subset of characters
  const chessChars = "abcdefghKQRBNPO12345678x+#=-";
  
  // Choose the appropriate charset based on your needs
  const chars = chessChars; // For chess notation specifically
  
  // Test mode - return the raw index for debugging if out of range
  if (maxIndex >= chars.length) {
    return `[${maxIndex}]`;
  }
  
  return chars[maxIndex];
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
      const moveTextMatch = text.match(/\]\s+([\s\S]+)/);
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
      // Handle handwritten OCR results
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