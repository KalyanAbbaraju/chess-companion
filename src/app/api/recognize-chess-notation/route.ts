import { NextRequest, NextResponse } from 'next/server';
import { OCRClient, GoogleVisionAPI, MicrosoftComputerVision, PythonBackendOCR } from '@/services/ocr/clients/api-clients';

export async function POST(req: NextRequest) {
  try {
    // Get the requested engine from query params
    const { searchParams } = new URL(req.url);
    const engine = searchParams.get('engine') || 'python'; // Default to your Python backend
    
    // Select client based on requested engine
    let client: OCRClient;
    switch (engine) {
      case 'google':
        client = new GoogleVisionAPI();
        break;
      case 'microsoft':
        client = new MicrosoftComputerVision();
        break;
      case 'python':
      default:
        client = new PythonBackendOCR();
        break;
    }
    
    // Using FormData to handle image uploads
    const formData = await req.formData();
    const images = formData.getAll('images') as File[];
    
    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }
    
    // Process images with the selected client
    const results = await Promise.all(
      images.map(async (image) => {
        const buffer = await image.arrayBuffer();
        return client.recognizeText(Buffer.from(buffer));
      })
    );
    
    // Post-process results for chess notation
    const processedResults = results.map((text: string) => {
      // Add chess-specific post-processing here
      return postProcessChessNotation(text);
    });
    
    return NextResponse.json({ results: processedResults });
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json(
      { error: 'Failed to process images' },
      { status: 500 }
    );
  }
}

// Helper function to clean up and format chess notation
function postProcessChessNotation(text: string): string {
  return text
    // Normalize castling notation
    .replace(/0-0-0/g, 'O-O-O')
    .replace(/0-0/g, 'O-O')
    // Fix common OCR errors
    .replace(/l([0-9])/g, '1$1')  // l → 1
    .replace(/o([0-9])/g, 'O$1')  // o → O
    // More chess-specific rules...
    .trim();
} 