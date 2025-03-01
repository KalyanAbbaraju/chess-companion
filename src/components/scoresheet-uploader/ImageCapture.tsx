'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../../../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

interface ImageCaptureProps {
  onImageCaptured: (imageDataUrls: string[]) => void;
}

const ImageCapture: React.FC<ImageCaptureProps> = ({ onImageCaptured }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        if (!videoRef.current) {
          throw new Error('Video element not initialized');
        }

        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });

        // Make sure video element still exists when we get the stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraError(null);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setCameraError('Could not access camera. Please make sure you have granted camera permissions.');
        setIsCameraActive(false);
      }
    };

    if (activeTab === 'camera' && isCameraActive) {
      setupCamera();
    }

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [activeTab, isCameraActive]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    
    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf') {
        setIsProcessingPDF(true);
        try {
          // Load the PDF file
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          // Convert each page to an image
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Create canvas for rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;

            // Set canvas dimensions
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page to canvas
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            // Convert canvas to image data URL
            const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
            newImages.push(imageUrl);
          }
        } catch (error) {
          console.error('Error processing PDF:', error);
        } finally {
          setIsProcessingPDF(false);
        }
      } else {
        // Handle regular image files as before
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
        await new Promise(resolve => reader.onloadend = resolve);
      }
    }

    onImageCaptured(newImages);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to image
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        onImageCaptured([imageData]);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab Navigation */}
      <div className="flex rounded-lg overflow-hidden text-sm">
        <button
          className={`flex-1 py-1.5 px-3 ${
            activeTab === 'upload' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-600'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Images
        </button>
        <button
          className={`flex-1 py-1.5 px-3 ${
            activeTab === 'camera' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-600'
          }`}
          onClick={() => setActiveTab('camera')}
        >
          Camera Capture
        </button>
      </div>

      {activeTab === 'upload' ? (
        // Upload Area
        <div className="border border-dashed border-gray-300 rounded-lg p-6">
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-8 h-8 text-gray-400 mb-2"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" 
              />
            </svg>
            <p className="text-sm text-gray-600">Drag and drop images or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG, PDF</p>
          </label>
          {isProcessingPDF && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <div className="loading loading-spinner loading-md mb-2"></div>
                <p>Processing PDF...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Camera Area
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="relative bg-black">
            {cameraError ? (
              <div className="p-4 text-center text-red-600 bg-red-50">
                <p className="text-sm">{cameraError}</p>
                <button 
                  onClick={() => {
                    setCameraError(null);
                    setIsCameraActive(true);
                  }}
                  className="mt-2 btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none"
                >
                  Retry Camera Access
                </button>
              </div>
            ) : (
              <>
                <div className="max-w-lg mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full aspect-[4/3]"
                    onLoadedMetadata={() => setIsCameraActive(true)}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                {/* Capture Button */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                  <button
                    onClick={captureImage}
                    className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none rounded-full w-12 h-12"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-6 w-6"
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" 
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal/Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            className="max-h-[90vh] max-w-[90vw] object-contain"
            alt="Expanded preview"
          />
        </div>
      )}
    </div>
  );
};

export default ImageCapture; 