'use client';

import React, { useState, ChangeEvent, KeyboardEvent, useRef, useEffect } from 'react';

interface ResultsState {
  show: boolean;
  performanceRating: number | null;
  newRating: number | null;
  kFactor: number | null;
  bonus: number | null;
}

interface RatingResult {
  newRating: number;
  kFactor: number;
  bonus: number;
}

const ChessRatingCalculator: React.FC = () => {
  const [numGames, setNumGames] = useState<number>(4);
  const [opponentRatings, setOpponentRatings] = useState<string[]>(Array(4).fill(''));
  const [totalScore, setTotalScore] = useState<string>('');
  const [currentRating, setCurrentRating] = useState<string>('');
  const [priorGames, setPriorGames] = useState<string>('');
  const [highRatedOption, setHighRatedOption] = useState<boolean>(false);
  const [results, setResults] = useState<ResultsState>({
    show: false,
    performanceRating: null,
    newRating: null,
    kFactor: null,
    bonus: null
  });
  const [copySuccess, setCopySuccess] = useState<string>('');
  
  // Refs for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Check for URL parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // Get opponent ratings from URL
      const oppRatings = params.get('opp');
      if (oppRatings) {
        const ratings = oppRatings.split(',').map(r => r.trim());
        setNumGames(ratings.length);
        setOpponentRatings(ratings);
      }
      
      // Get other parameters
      if (params.get('score')) setTotalScore(params.get('score') || '');
      if (params.get('current')) setCurrentRating(params.get('current') || '');
      if (params.get('prior')) setPriorGames(params.get('prior') || '');
      if (params.get('highRated')) setHighRatedOption(params.get('highRated') === 'true');
    }
  }, []);
  
  // Update opponent ratings array when number of games changes
  useEffect(() => {
    if (numGames > opponentRatings.length) {
      // Add more opponent fields
      setOpponentRatings([...opponentRatings, ...Array(numGames - opponentRatings.length).fill('')]);
    } else if (numGames < opponentRatings.length) {
      // Remove excess opponent fields
      setOpponentRatings(opponentRatings.slice(0, numGames));
    }
  }, [numGames]);
  
  // Handle opponent rating changes
  const handleOpponentRatingChange = (index: number, value: string): void => {
    const newRatings = [...opponentRatings];
    newRatings[index] = value;
    setOpponentRatings(newRatings);
  };
  
  // Handle key press for navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < inputRefs.current.length && inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = index - 1;
      if (prevIndex >= 0 && inputRefs.current[prevIndex]) {
        inputRefs.current[prevIndex]?.focus();
      }
    }
  };

  // Get valid opponent ratings
  const getValidOpponentRatings = (): number[] => {
    return opponentRatings
      .filter(rating => rating !== '' && !isNaN(Number(rating)))
      .map(rating => parseInt(rating, 10));
  };

  // Calculate expected score
  const calculateExpectedScore = (playerRating: number, opponentRating: number): number => {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  };

  // Calculate performance rating
  const calculatePerformanceRating = (opponentRatings: number[], totalScore: string): number | null => {
    if (opponentRatings.length === 0) return null;
    
    const scoreValue = parseFloat(totalScore);
    
    // Perfect or zero score case
    if (scoreValue === opponentRatings.length) {
      return Math.max(...opponentRatings) + 400;
    } else if (scoreValue === 0) {
      return Math.min(...opponentRatings) - 400;
    }
    
    // Initial estimate
    let rating = opponentRatings.reduce((sum, r) => sum + r, 0) / opponentRatings.length;
    
    // Iterative approximation
    const maxIterations = 20;
    for (let i = 0; i < maxIterations; i++) {
      let expectedScore = 0;
      for (const oppRating of opponentRatings) {
        expectedScore += calculateExpectedScore(rating, oppRating);
      }
      
      if (Math.abs(expectedScore - scoreValue) < 0.01) {
        break;
      }
      
      // Adjust rating
      rating += (scoreValue - expectedScore) * 400 / opponentRatings.length;
    }
    
    return Math.round(rating);
  };

  // Calculate K factor
  const calculateKFactor = (currentRating: string, priorGames: string, useHighRatedOption: boolean): number => {
    const rating = parseInt(currentRating, 10) || 0;
    const games = parseInt(priorGames, 10) || 0;
    
    if (games < 8) {
      return 32;
    } else if (games < 20) {
      return 24;
    } else if (rating < 2100) {
      return 16;
    } else if (rating < 2400) {
      return useHighRatedOption && rating >= 2200 ? 12 : 16;
    } else {
      return useHighRatedOption ? 8 : 12;
    }
  };

  // Calculate bonus points
  const calculateBonus = (currentRating: string, performanceRating: number, numGames: number, priorGames: string): number => {
    const priorGamesValue = parseInt(priorGames, 10) || 0;
    const currentRatingValue = parseInt(currentRating, 10) || 0;
    
    if (priorGamesValue >= 26 || numGames < 4) {
      return 0;
    }
    
    const ratingDiff = performanceRating - currentRatingValue;
    if (ratingDiff <= 0) {
      return 0;
    }
    
    // Bonus threshold is 14 (since June 2017)
    const bonusThreshold = 14;
    const excessPerformance = Math.max(0, ratingDiff - bonusThreshold);
    const bonusFactor = Math.min(1.0, numGames / 5);
    
    return Math.floor(excessPerformance * bonusFactor);
  };

  // Calculate new rating
  const calculateNewRating = (
    currentRating: string, 
    performanceRating: number, 
    totalScore: string, 
    opponentRatings: number[], 
    priorGames: string, 
    useHighRatedOption: boolean
  ): RatingResult => {
    const numGames = opponentRatings.length;
    let expectedScore = 0;
    const currentRatingValue = parseInt(currentRating, 10) || 0;
    
    for (const oppRating of opponentRatings) {
      expectedScore += calculateExpectedScore(currentRatingValue, oppRating);
    }
    
    const kFactor = calculateKFactor(currentRating, priorGames, useHighRatedOption);
    const ratingChange = Math.round(kFactor * (parseFloat(totalScore) - expectedScore));
    
    let newRating = currentRatingValue + ratingChange;
    
    // Calculate bonus
    const bonus = calculateBonus(currentRating, performanceRating, numGames, priorGames);
    newRating += bonus;
    
    return {
      newRating,
      kFactor,
      bonus
    };
  };

  // Handle calculate performance rating
  const handleCalculatePerformanceRating = (): void => {
    const validRatings = getValidOpponentRatings();
    
    if (validRatings.length === 0) {
      alert('Please enter at least one opponent rating.');
      return;
    }
    
    if (parseFloat(totalScore) > validRatings.length) {
      alert('Total score cannot be greater than the number of games played.');
      return;
    }
    
    const performanceRating = calculatePerformanceRating(validRatings, totalScore);
    
    setResults({
      show: true,
      performanceRating,
      newRating: null,
      kFactor: null,
      bonus: null
    });
  };

  // Handle calculate new rating
  const handleCalculateNewRating = (): void => {
    const validRatings = getValidOpponentRatings();
    
    if (validRatings.length === 0) {
      alert('Please enter at least one opponent rating.');
      return;
    }
    
    if (parseFloat(totalScore) > validRatings.length) {
      alert('Total score cannot be greater than the number of games played.');
      return;
    }
    
    if (currentRating === '') {
      alert('Please enter your current rating.');
      return;
    }
    
    const performanceRating = calculatePerformanceRating(validRatings, totalScore) || 0;
    const result = calculateNewRating(
      currentRating, 
      performanceRating, 
      totalScore, 
      validRatings, 
      priorGames, 
      highRatedOption
    );
    
    setResults({
      show: true,
      performanceRating,
      newRating: result.newRating,
      kFactor: result.kFactor,
      bonus: result.bonus
    });
  };

  // Handle reset
  const handleReset = (): void => {
    setNumGames(4);
    setOpponentRatings(Array(4).fill(''));
    setTotalScore('');
    setCurrentRating('');
    setPriorGames('');
    setHighRatedOption(false);
    setResults({
      show: false,
      performanceRating: null,
      newRating: null,
      kFactor: null,
      bonus: null
    });
    // Focus on first input after reset
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  };

  // Generate shareable link
  const generateShareableLink = (): string => {
    const validRatings = opponentRatings.filter(r => r !== '');
    
    const params = new URLSearchParams();
    if (validRatings.length > 0) params.set('opp', validRatings.join(','));
    if (totalScore) params.set('score', totalScore);
    if (currentRating) params.set('current', currentRating);
    if (priorGames) params.set('prior', priorGames);
    if (highRatedOption) params.set('highRated', 'true');
    
    // Get the base URL (works in both development and production)
    const baseUrl = typeof window !== 'undefined' ? 
      `${window.location.protocol}//${window.location.host}${window.location.pathname}` : 
      '';
    
    return `${baseUrl}?${params.toString()}`;
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopySuccess('Link copied!');
        setTimeout(() => setCopySuccess(''), 3000);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        setCopySuccess('Failed to copy');
      });
  };
  
  // Share via WhatsApp - fixed implementation
  const shareViaWhatsApp = () => {
    const link = generateShareableLink();
    let message = '';
    
    if (results.newRating) {
      message = `Check out my new chess rating: ${results.newRating}! Calculate yours here: ${link}`;
    } else {
      message = `Calculate your chess rating using this tool: ${link}`;
    }
    
    // Use the correct WhatsApp API URL format
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };
  
  // Share via Facebook
  const shareViaFacebook = () => {
    const link = generateShareableLink();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(facebookUrl, '_blank');
  };
  
  // Share via Twitter (new function)
  const shareViaTwitter = () => {
    const link = generateShareableLink();
    let message = '';
    
    if (results.newRating) {
      message = `My new chess rating: ${results.newRating}! Calculate yours:`;
    } else {
      message = `Calculate your USCF chess rating with this tool:`;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto px-2 sm:px-0">
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <h2 className="text-xl font-bold mb-3 text-gray-900">USCF Rating Calculator</h2>
        
        {/* Number of Games Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="numGames" className="text-sm font-medium text-gray-900">Number of Games:</label>
            <select
              id="numGames"
              value={numGames}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setNumGames(parseInt(e.target.value, 10))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            >
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          
          {/* Opponent Ratings Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-2">
            {opponentRatings.map((rating, index) => (
              <div key={index}>
                <input
                  ref={el => inputRefs.current[index] = el}
                  type="number"
                  value={rating}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleOpponentRatingChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder={`Opp ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Other Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-sm mb-1 block text-gray-900">
              Total Score (W=1, D=0.5, L=0)
            </label>
            <input
              ref={el => inputRefs.current[numGames] = el}
              type="number"
              value={totalScore}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTotalScore(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, numGames)}
              step="0.5"
              min="0"
              max={numGames}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              placeholder="Total score"
            />
          </div>
          
          <div>
            <label className="text-sm mb-1 block text-gray-900">
              Current Rating
            </label>
            <input
              ref={el => inputRefs.current[numGames + 1] = el}
              type="number"
              value={currentRating}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentRating(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, numGames + 1)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              placeholder="Current rating"
            />
          </div>
          
          <div>
            <label className="text-sm mb-1 block text-gray-900">
              Prior Games
            </label>
            <input
              ref={el => inputRefs.current[numGames + 2] = el}
              type="number"
              value={priorGames}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPriorGames(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, numGames + 2)}
              min="0"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              placeholder="Prior games"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center text-sm">
            <input
              ref={el => inputRefs.current[numGames + 3] = el}
              type="checkbox"
              checked={highRatedOption}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setHighRatedOption(e.target.checked)}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-900">
              Use lower K values for high rated players (2200+)
            </span>
          </label>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={handleCalculateNewRating}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Calculate Rating
          </button>
          <button
            onClick={handleCalculatePerformanceRating}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Performance
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset
          </button>
        </div>
        
        {/* Results */}
        {results.show && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm mb-4">
            <h3 className="font-semibold mb-2 text-gray-900">Results:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.performanceRating !== null && (
                <p className="text-gray-900">Performance Rating: <span className="font-medium">{results.performanceRating}</span></p>
              )}
              {results.newRating !== null && (
                <p className="text-gray-900">New Rating: <span className="font-medium">{results.newRating}</span></p>
              )}
              {results.kFactor !== null && (
                <p className="text-gray-900">K Value: <span className="font-medium">{results.kFactor}</span></p>
              )}
              {results.bonus !== null && (
                <p className="text-gray-900">Bonus Points: <span className="font-medium">{results.bonus}</span></p>
              )}
            </div>
          </div>
        )}
        
        {/* Share Section - Updated */}
        <div className="mt-4 bg-white rounded-lg shadow-md p-3">
          <p className="text-sm font-medium text-gray-900 text-center mb-3">Share your calculation:</p>
          
          <div className="flex justify-center flex-wrap gap-4 mb-2">
            {/* Copy Link Button */}
            <button 
              onClick={copyLinkToClipboard}
              className="flex flex-col items-center"
              aria-label="Copy link"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1 hover:bg-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-700">Copy Link</span>
            </button>
            
            {/* WhatsApp Button */}
            <button 
              onClick={shareViaWhatsApp}
              className="flex flex-col items-center"
              aria-label="Share via WhatsApp"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-1 hover:bg-green-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-700">WhatsApp</span>
            </button>
            
            {/* Facebook Button */}
            <button 
              onClick={shareViaFacebook}
              className="flex flex-col items-center"
              aria-label="Share via Facebook"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mb-1 hover:bg-blue-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-700">Facebook</span>
            </button>
            
            {/* Twitter Button (new) */}
            <button 
              onClick={shareViaTwitter}
              className="flex flex-col items-center"
              aria-label="Share via Twitter"
            >
              <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center mb-1 hover:bg-sky-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </div>
              <span className="text-xs text-gray-700">Twitter</span>
            </button>
          </div>
          
          {copySuccess && (
            <p className="text-green-600 text-sm text-center mt-1 font-medium">{copySuccess}</p>
          )}
        </div>
      </div>
      
      {/* Notes Section */}
      <div className="bg-white rounded-lg shadow-md p-3 text-sm">
        <details>
          <summary className="font-medium cursor-pointer text-gray-900">Notes & Information</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-900">
            <li>
              This calculator uses the USCF rating formulas in effect since June 1, 2017.
            </li>
            <li>
              For a perfect or zero score, the performance rating is estimated as 400 points higher/lower than the highest/lowest rated opponent.
            </li>
            <li>
              For unrated players with no prior games, set # of Prior Games to zero.
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default ChessRatingCalculator; 