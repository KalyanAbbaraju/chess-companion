This is a project to build a set of chess companion tools.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Testing Data Set 

* For Handwritten chess score sheet data set, please see: https://sites.google.com/view/chess-scoresheet-dataset/home/

* Python scanning libraries:

| **Package**          | **License**                | **Commercial Usage** | **Notes** |
|----------------------|---------------------------|----------------------|-----------|
| **OpenCV** (`opencv-python-headless`) | Apache 2.0 | ✅ Free for commercial use | No restrictions, fully open-source |
| **EasyOCR**         | Apache 2.0                 | ✅ Free for commercial use | No restrictions, fully open-source |
| **Stockfish**       | GPL-3.0                     | ⚠️ Requires derivative works to be open-source | You can use it commercially, but if you modify and distribute it, you must release the modified source code |
| **TrOCR (Hugging Face)** | MIT License | ✅ Free for commercial use | No restrictions |
| **Torch (PyTorch, torchvision, torchaudio)** | BSD-style | ✅ Free for commercial use | No restrictions |
| **Tesseract OCR**   | Apache 2.0                 | ✅ Free for commercial use | No restrictions |

## Code Overview

### Project Structure
- **Frontend**: Built with Next.js 15, React 19, and TypeScript
- **Styling**: Uses TailwindCSS with DaisyUI components
- **Chess Logic**: Powered by chess.js library

### Main Features

#### Scoresheet Scanner
- Digitizes handwritten chess scoresheets using OCR technology
- Leverages TensorFlow.js and Tesseract.js for text recognition
- Includes move validation and correction for common notation errors
- Supports exporting games in standard chess formats

#### Rating Estimator
- Calculates expected USCF chess ratings based on performance
- Implements official rating calculation formulas with K-factor adjustments
- Provides shareable links for rating calculations

### Technical Implementation
- **Components**: Modular React components for chess board, notation display, and game navigation
- **API Routes**: Endpoints for OCR processing with multiple engine support
- **Utilities**: Type definitions and helper functions for chess-specific operations
- **OCR Pipeline**: Multi-stage process for recognizing, validating, and correcting chess notation

