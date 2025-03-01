import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Parse the form data with images
  const formData = await request.formData();
  const imageFiles = formData.getAll('images') as File[];
  
  // Process images (placeholder for actual OCR)
  const textResults: string[] = [];
  
  for (const imageFile of imageFiles) {
    // In a real implementation, you would run OCR on each image
    // For now, return mock text
    textResults.push('1. e4 e5 2. Nf3 Nc6');
  }
  
  // Return just the raw OCR text
  return NextResponse.json({
    text: textResults
  });
} 