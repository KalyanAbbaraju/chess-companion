import React from 'react';
import ChessRatingCalculator from '@/components/ChessRatingCalculator';

export const metadata = {
  title: 'Chess Rating Calculator',
  description: 'Calculate your USCF chess rating using our online calculator',
};

export default function Page() {
  return (
    <div className="container mx-auto px-4">
      <ChessRatingCalculator />
    </div>
  );
}
