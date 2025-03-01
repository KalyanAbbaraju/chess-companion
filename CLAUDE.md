# CLAUDE.md - Chess Companion Project Guide

## Commands
- `npm run dev` - Run development server with turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint checks

## Project Structure
- `/src/components` - React components (Board, Scanner, etc.)
- `/src/lib` - Shared utilities and type definitions
- `/src/app` - Next.js app router pages
- `/src/api` - API routes and services
- `/public` - Static assets and PDF worker

## Code Style Guidelines
- Use TypeScript interfaces for props and type definitions
- React components in PascalCase, utilities in camelCase
- Use functional components with hooks (useState, useEffect)
- Import order: React/Next.js, external libs, internal modules
- Use Tailwind CSS classes for styling (with DaisyUI components)
- Add JSDoc comments for complex functions
- Use async/await for asynchronous code
- Implement proper error handling with try/catch
- Follow strict TypeScript mode (avoid any types)

## Technologies
- Next.js 15, React 19, TypeScript 5
- TailwindCSS + DaisyUI for UI components
- Chess.js for chess logic
- TensorFlow.js and Tesseract.js for OCR