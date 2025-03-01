'use client';

import React, { useState, useEffect, useRef } from 'react';
import ImageCapture from '@/components/scoresheet-uploader/ImageCapture';
import ScannedImageDisplay from '@/components/scoresheet-uploader/ScannedImageDisplay';
import ProcessingStagesDisplay from '@/components/scoresheet/ProcessingStagesDisplay';
import { PlayerInfo } from '@/lib/types';
import { ChessMove } from '@/lib/types';
import ExportControls from '@/components/export/ExportControls';
import InteractiveChessBoard from '@/components/chess/board/InteractiveChessBoard';
import GameTreeChessBoard from '@/components/chess/board/GameTreeChessBoard';
import { convertMovesToGameTree, convertGameTreeToMoves } from '@/lib/gameTree';
import { createWorker } from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';
import { 
  preprocessForNeuralNetwork, 
  segmentImage, 
  imageSegmentToTensor, 
  decodePrediction 
} from '@/services/ocr/engines/tensorflow';
import { processTesseractOCR } from '@/services/ocr/engines/tesseract';
import { processHandwritingModel } from '@/services/ocr/engines/tensorflow';
import { processMockOCR, samplePlayerInfo, sampleMoves } from '@/services/ocr/engines/mockocr';
import { 
  OCRResult, 
  MoveValidation, 
  EngineAnalysis 
} from '@/lib/types';

// OCR Engine Types
type OCREngine = 'tesseract' | 'tf-handwriting' | 'mock-ocr' | 'backend-api';

const preprocessForChessOCR = async (imageData: string): Promise<string> => {
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

// Define the processing stages
const processingStages = [
  {
    id: 'initialization',
    title: 'Initializing',
    description: 'Preparing to analyze your scoresheet',
    icon: 'init',
    status: 'pending' as const
  },
  {
    id: 'preprocessing',
    title: 'Enhancing Image',
    description: 'Improving image quality for better recognition',
    icon: 'enhance',
    status: 'pending' as const
  },
  {
    id: 'ocr',
    title: 'Reading Handwriting',
    description: 'Recognizing chess notation from your scoresheet',
    icon: 'read',
    status: 'pending' as const
  },
  {
    id: 'parsing',
    title: 'Interpreting Moves',
    description: 'Converting text to chess moves',
    icon: 'interpret',
    status: 'pending' as const
  },
  {
    id: 'validation',
    title: 'Validating Moves',
    description: 'Checking for legal chess moves and correcting errors',
    icon: 'validate',
    status: 'pending' as const
  },
  {
    id: 'analysis',
    title: 'Finalizing',
    description: 'Preparing your digital chess game',
    icon: 'finalize',
    status: 'pending' as const
  },
];

const ScoreSheetScanner: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [digitizedMoves, setDigitizedMoves] = useState<ChessMove[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({
    whitePlayer: '',
    blackPlayer: '',
    event: '',
    date: '',
    result: '*'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [scanningState, setScanningState] = useState<'idle' | 'scanning' | 'success' | 'failure'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<string[]>([]);
  const tesseractWorker = useRef<Tesseract.Worker | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<OCREngine>('tesseract');
  const [modelLoaded, setModelLoaded] = useState(false);
  const handwritingModel = useRef<tf.LayersModel | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<MoveValidation[]>([]);
  const [engineAnalysis, setEngineAnalysis] = useState<EngineAnalysis[]>([]);
  
  // Processing workflow state
  const [processingStagesState, setProcessingStagesState] = useState(processingStages);
  const [currentProcessingStage, setCurrentProcessingStage] = useState('');
  const [showFullScreenProcessing, setShowFullScreenProcessing] = useState(false);
  
  const handleImagesCaptured = (imageDataUrls: string[]) => {
    setImages(prevImages => [...prevImages, ...imageDataUrls]);
    setCurrentImageIndex(images.length);
    setShowPreview(false);
  };
  
  // Load TensorFlow handwriting model
  useEffect(() => {
    const loadHandwritingModel = async () => {
      try {
        console.log('Loading IAM Handwriting model...');
        
        // Create mock model
        handwritingModel.current = {
          predict: (tensor: tf.Tensor) => {
            return tf.tensor([...Array(83)].map(() => Math.random()));
          }
        } as unknown as tf.LayersModel;
        
        setModelLoaded(true);
      } catch (error) {
        console.error('Error loading handwriting model:', error);
      }
    };

    // Remove condition - always load mock model on component mount
    loadHandwritingModel();
  }, []); // Empty dependency array - run once on mount
  
  // Helper function to update a stage's status
  const updateStageStatus = (stageId: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setProcessingStagesState(prevStages => 
      prevStages.map(stage => 
        stage.id === stageId 
          ? { ...stage, status } 
          : stage
      )
    );
    
    if (status === 'processing') {
      setCurrentProcessingStage(stageId);
    }
  };
  
  // Process with the selected OCR engine
  const processScoresheet = async () => {
    if (images.length === 0) return;
    
    // Reset all stages
    setProcessingStagesState(processingStages);
    setShowFullScreenProcessing(true);
    setScanningState('scanning');
    setScanProgress(0);
    
    try {
      // Stage 1: Initialization
      updateStageStatus('initialization', 'processing');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization time
      updateStageStatus('initialization', 'completed');
      
      // Stage 2: Preprocessing
      updateStageStatus('preprocessing', 'processing');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate preprocessing time
      setScanProgress(20);
      updateStageStatus('preprocessing', 'completed');
      
      // Stage 3: OCR
      updateStageStatus('ocr', 'processing');
      
      let result: OCRResult;
      
      // Progress update handler - modified to update our overall progress
      const handleProgress = (progress: number, currentIndex: number) => {
        // Map the OCR progress (0-100) to our stage progress (20-60)
        const mappedProgress = 20 + (progress * 0.4);
        setScanProgress(mappedProgress);
        setCurrentImageIndex(currentIndex);
      };
      
      // Run the selected OCR engine
      switch (selectedEngine) {
        case 'tesseract':
          result = await processTesseractOCR(images, handleProgress);
          break;
        case 'tf-handwriting':
          result = await processHandwritingModel(images, handleProgress);
          break;
        case 'mock-ocr':
          result = await processMockOCR(images, handleProgress);
          break;
        case 'backend-api':
          result = await processBackendAPI(images, handleProgress);
          break;
        default:
          result = await processTesseractOCR(images, handleProgress);
      }
      
      updateStageStatus('ocr', 'completed');
      
      // Stage 4: Parsing
      updateStageStatus('parsing', 'processing');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate parsing time
      setScanProgress(70);
      updateStageStatus('parsing', 'completed');
      
      // Stage 5: Validation
      updateStageStatus('validation', 'processing');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate validation time
      setScanProgress(85);
      
      // Use the standardized result directly
      if (result.moves.length > 0) {
        setDigitizedMoves(result.moves);
        setPlayerInfo(result.playerInfo);
        setOcrResults(result.rawText || []);
        
        // Handle different status cases
        let validationSuccessful = true;
        
        switch(result.status) {
          case 'success':
            updateStageStatus('validation', 'completed');
            break;
          case 'partial_success':
          case 'low_confidence':
            updateStageStatus('validation', 'completed');
            setWarnings(result.warnings || ['Some issues were detected with the scan']);
            break;
          case 'invalid_moves':
            updateStageStatus('validation', 'failed');
            validationSuccessful = false;
            setErrors(['The detected moves do not form a valid chess game']);
            break;
          default:
            updateStageStatus('validation', 'failed');
            validationSuccessful = false;
        }
        
        // Show validation issues if available
        if (result.moveValidation && result.moveValidation.length > 0) {
          setValidationIssues(result.moveValidation);
        }
        
        // Stage 6: Analysis/Finalizing
        updateStageStatus('analysis', 'processing');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate analysis time
        setScanProgress(100);
        
        // Show engine analysis if available
        if (result.engineAnalysis && result.engineAnalysis.length > 0) {
          setEngineAnalysis(result.engineAnalysis);
        }
        
        updateStageStatus('analysis', validationSuccessful ? 'completed' : 'failed');
        
        // Final state update
        setScanningState(validationSuccessful ? 'success' : 'failure');
        
        // Close the processing screen after a short delay to show the completed state
        setTimeout(() => {
          setShowFullScreenProcessing(false);
        }, 1500);
      } else {
        // Handle case where no moves were detected
        updateStageStatus('validation', 'failed');
        updateStageStatus('analysis', 'failed');
        setScanningState('failure');
        setErrors(result.errors || ['Failed to recognize any chess moves']);
        
        // Close the processing screen after a short delay
        setTimeout(() => {
          setShowFullScreenProcessing(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing scoresheet:', error);
      
      // Mark all remaining stages as failed
      const currentStages = [...processingStagesState];
      const currentStageIndex = currentStages.findIndex(s => s.id === currentProcessingStage);
      
      for (let i = currentStageIndex; i < currentStages.length; i++) {
        updateStageStatus(currentStages[i].id, 'failed');
      }
      
      setScanningState('failure');
      setErrors(['An unexpected error occurred while processing your scoresheet']);
      
      // Close the processing screen after a short delay
      setTimeout(() => {
        setShowFullScreenProcessing(false);
      }, 2000);
    }
  };
  
  // Update the processBackendAPI method to use the progress callback
  const processBackendAPI = async (
    images: string[],
    onProgress: (progress: number, currentIndex: number) => void
  ): Promise<OCRResult> => {
    try {
      const formData = new FormData();
      
      // Convert base64 images to blobs
      for (let i = 0; i < images.length; i++) {
        const blob = await fetch(images[i]).then(r => r.blob());
        formData.append('images', blob, `image-${i}.png`);
        onProgress((i * 50) / images.length, i);
      }
      
      const response = await fetch('/api/recognize-chess-notation', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Backend API error');
      }
      
      const data = await response.json();
      onProgress(100, images.length - 1);
      
      // Return the properly formatted OCRResult object
      return data;
    } catch (error) {
      console.error('Error with backend API:', error);
      // Return default OCRResult on error
      return {
        moves: [],
        playerInfo: { whitePlayer: '', blackPlayer: '', event: '', date: '', result: '*' },
        status: 'invalid_moves',
        errors: [`Error with backend API: ${error}`]
      };
    }
  };
  
  const handleMovesUpdate = (moves: ChessMove[]) => {
    setDigitizedMoves(moves);
  };
  
  const handlePlayerInfoUpdate = (newInfo: Partial<PlayerInfo>) => {
    setPlayerInfo(prev => ({
      ...prev,
      ...newInfo
    }));
  };
  
  const clearImages = () => {
    setImages([]);
    setCurrentImageIndex(0);
    setShowPreview(false);
    setScanningState('idle');
    setScanProgress(0);
    setOcrResults([]);
    setWarnings([]);
    setErrors([]);
    setValidationIssues([]);
    setEngineAnalysis([]);
  };
  
  useEffect(() => {
    console.log('digitizedMoves updated:', digitizedMoves);
  }, [digitizedMoves]);

  // Update the parseOcrIntoMoves function to handle PGN format
  const parseOcrIntoMoves = (ocrResults: string[]): ChessMove[] => {
    const moves: ChessMove[] = [];
    
    // Loop through OCR results (pages)
    for (const text of ocrResults) {
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
        // Existing parsing logic for non-PGN format
        // (Keep your existing parsing code here)
      }
    }
    
    return moves;
  };
  
  return (
    <div className="w-full mx-auto">
      {/* Full Screen Processing View */}
      {showFullScreenProcessing && (
        <ProcessingStagesDisplay
          stages={processingStagesState}
          currentStage={currentProcessingStage}
          progress={scanProgress}
          onCancel={() => {
            setShowFullScreenProcessing(false);
            setScanningState('idle');
          }}
        />
      )}
      
      {scanningState !== 'success' ? (
        // Scanner input view - shown when there's no processed game yet
        <div className="bg-white p-6">
          <div className="mb-6">
            <h1 className="text-primary text-2xl font-bold">Chess Scoresheet Scanner</h1>
            <p className="text-gray-600">Upload or capture an image of your chess scoresheet to digitize your game.</p>
          </div>

          {/* Input Tabs - PGN Import or Image Upload */}
          <div className="border-b mb-6">
            <div className="flex -mb-px">
              <button className="px-4 py-2 border-b-2 border-primary text-primary font-medium">
                Image Upload
              </button>
              <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
                PGN Import
              </button>
            </div>
          </div>

          {/* Uploader */}
          <div className="bg-gray-50 p-4 rounded mb-6">
            <ImageCapture onImageCaptured={handleImagesCaptured} />
          </div>

          {/* Thumbnails Section - simplified */}
          {images.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 font-medium">Uploaded Images</span>
                <button
                  onClick={clearImages}
                  className="text-red-600 hover:text-red-700 text-sm px-3 py-1"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {images.map((img, index) => (
                  <div 
                    key={`image-${index}`}
                    className="relative group"
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setShowPreview(true);
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newImages = images.filter((_, i) => i !== index);
                        setImages(newImages);
                        if (currentImageIndex === index) {
                          setShowPreview(false);
                        }
                      }}
                      className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1 
                                opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className={`overflow-hidden rounded border ${currentImageIndex === index && showPreview ? 'border-primary' : 'border-gray-200'}`}>
                      <img 
                        src={img} 
                        alt={`Page ${index + 1}`}
                        className="w-[120px] h-[160px] sm:w-[150px] sm:h-[200px] object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs font-medium text-center py-1">
                        Page {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OCR Engine Selection - Hidden by default (developer mode) */}
          {scanningState === 'idle' && images.length > 0 && (
            <div className="mb-6">
              <details className="bg-gray-50 p-2 rounded">
                <summary className="text-sm text-gray-500 cursor-pointer">Developer Options</summary>
                <div className="pt-3 pb-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['tesseract', 'tf-handwriting', 'mock-ocr', 'backend-api'].map((engine) => (
                      <button
                        key={engine}
                        onClick={() => setSelectedEngine(engine as OCREngine)}
                        className={`py-2 rounded text-sm ${
                          selectedEngine === engine 
                            ? 'bg-gray-200 text-gray-800 font-medium' 
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {engine === 'tesseract' && 'Tesseract'}
                        {engine === 'tf-handwriting' && 'TensorFlow'}
                        {engine === 'mock-ocr' && 'Demo Mode'}
                        {engine === 'backend-api' && 'Cloud API'}
                      </button>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Process Button */}
          {images.length > 0 && !showFullScreenProcessing && (
            <div className="flex flex-col items-center">              
              {scanningState === 'failure' && (
                <div className="text-red-600 mb-4 text-center max-w-md">
                  Failed to process scoresheet. Please try again with clearer images.
                </div>
              )}
              
              <button
                onClick={processScoresheet}
                disabled={scanningState === 'scanning'}
                className={`${
                  scanningState === 'scanning' 
                    ? 'bg-primary-focus text-white cursor-wait'
                    : scanningState === 'failure'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-primary hover:bg-primary-focus text-white' 
                } px-6 py-3 rounded font-medium text-base disabled:opacity-70 transition-colors duration-200 min-w-[200px]`}
              >
                {scanningState === 'scanning' ? 'Processing...' : scanningState === 'failure' ? 'Try Again' : 'Process Scoresheet'}
              </button>
            </div>
          )}
        </div>
      ) : (
        // Chess board and game viewer - shown after successful processing
        <div className="bg-white p-4 sm:p-6">
          {/* Toast notification for copy success */}
          <div 
            id="pgn-toast" 
            className="hidden fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded shadow-md transition-opacity duration-300 opacity-0 z-50"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">PGN copied to clipboard</p>
            </div>
          </div>
          
          {/* Chess board with moves */}
          <div className="relative">
            <GameTreeChessBoard 
              initialGameTree={convertMovesToGameTree(digitizedMoves)}
              playerInfo={playerInfo}
              onGameTreeUpdate={(gameTree) => {
                // Convert back to legacy format for compatibility
                const moves = convertGameTreeToMoves(gameTree);
                handleMovesUpdate(moves);
              }}
              onPlayerInfoUpdate={handlePlayerInfoUpdate}
            />
            
            {/* Floating action buttons */}
            <div className="absolute top-0 right-0 flex gap-2 m-2">
              <button
                onClick={() => {
                  // Copy PGN to clipboard
                  const pgn = generatePGN(digitizedMoves, playerInfo);
                  navigator.clipboard.writeText(pgn).then(() => {
                    // Show toast
                    const toast = document.getElementById('pgn-toast');
                    if (toast) {
                      toast.classList.remove('hidden');
                      setTimeout(() => toast.classList.add('opacity-100'), 10);
                      setTimeout(() => {
                        toast.classList.remove('opacity-100');
                        setTimeout(() => toast.classList.add('hidden'), 300);
                      }, 3000);
                    }
                  });
                }}
                className="bg-primary text-white hover:bg-primary-focus px-3 py-1.5 rounded-md font-medium text-sm shadow-sm"
                title="Copy PGN"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </button>
              <button
                onClick={() => setScanningState('idle')}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium text-sm shadow-sm"
                title="New Scan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Helper function to generate PGN
  function generatePGN(moves: ChessMove[], playerInfo: PlayerInfo): string {
    const headers = [
      `[Event "${playerInfo.event || 'Chess Game'}"]`,
      `[Site "Chess Companion"]`,
      `[Date "${playerInfo.date || new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]`,
      `[White "${playerInfo.whitePlayer || 'White'}"]`,
      `[Black "${playerInfo.blackPlayer || 'Black'}"]`,
      `[Result "${playerInfo.result || '*'}"]`
    ].join('\n');
    
    // Format moves in standard PGN format
    const movesText = moves.map(move => {
      let text = `${move.moveNumber}.`;
      if (move.white) text += ` ${move.white}`;
      if (move.black) text += ` ${move.black}`;
      return text;
    }).join(' ');
    
    return `${headers}\n\n${movesText} ${playerInfo.result || '*'}`;
  }
};

export default ScoreSheetScanner;
