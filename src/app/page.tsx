import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Chess Tools & Resources',
  description: 'Your one-stop destination for chess tools, calculators, and resources',
};

export default function HomePage() {
  return (
    <div className="bg-base-200 dark:bg-base-300">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-focus text-primary-content">
        <div className="container px-4 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Chess Tools & Resources
              </h1>
              <p className="text-lg sm:text-xl mb-8 text-primary-content/90">
                Enhance your chess experience with our collection of calculators, 
                tools, and resources designed for players of all levels.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/rating-estimator" 
                  className="btn btn-lg bg-white text-primary hover:bg-base-200 shadow-md"
                >
                  Rating Estimator
                </Link>
                <Link 
                  href="#tools" 
                  className="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-primary"
                >
                  Explore Tools
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-lg transform rotate-6"></div>
                <div className="absolute inset-0 bg-white/30 backdrop-blur-sm rounded-lg transform -rotate-3"></div>
                <div className="absolute inset-0 bg-white rounded-lg shadow-xl overflow-hidden">
                  {/* Replace with your own image path or fallback */}
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                    <span className="text-8xl">♞</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="tools" className="py-12 md:py-16">
        <div className="container px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 md:mb-12">Our Chess Tools</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Rating Calculator Card */}
            <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="h-32 sm:h-40 bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Rating Estimator</h3>
                <p className="text-base-content/70 mb-4 text-sm sm:text-base">
                  Calculate your expected unofficial USCF rating based on performance.
                </p>
                <Link 
                  href="/rating-estimator" 
                  className="text-primary hover:text-primary-focus font-medium inline-flex items-center text-sm sm:text-base"
                >
                  Try Rating Estimator
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
            
            {/* Scoresheet Scanner Card */}
            <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="h-32 sm:h-40 bg-accent flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-accent-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Scoresheet Scanner</h3>
                <p className="text-base-content/70 mb-4 text-sm sm:text-base">
                  Digitize your handwritten chess scoresheets quickly.
                </p>
                <Link 
                  href="/scoresheet-scanner" 
                  className="text-primary hover:text-primary-focus font-medium inline-flex items-center text-sm sm:text-base"
                >
                  Try Scoresheet Scanner
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
            
            {/* Opening Explorer Card */}
            <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="h-32 sm:h-40 bg-success flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Opening Explorer</h3>
                <p className="text-base-content/70 mb-4 text-sm sm:text-base">
                  Explore chess openings and learn popular lines.
                </p>
                <span className="text-base-content/50 inline-flex items-center text-sm sm:text-base">
                  Coming Soon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            
            {/* Game Analyzer Card */}
            <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="h-32 sm:h-40 bg-info flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Game Analyzer</h3>
                <p className="text-base-content/70 mb-4 text-sm sm:text-base">
                  Get insights on your strengths and weaknesses.
                </p>
                <span className="text-base-content/50 inline-flex items-center text-sm sm:text-base">
                  Coming Soon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 md:py-16 bg-base-100">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">About Our Chess Tools</h2>
            <p className="text-base-content/80 mb-6 text-sm sm:text-base">
              Our chess tools are designed to help players of all levels improve their game. 
              Whether you're a beginner looking to understand your rating or an experienced player 
              analyzing your games, we have resources to support your chess journey.
            </p>
            <p className="text-base-content/80 text-sm sm:text-base">
              These tools use official USCF formulas and best practices to provide accurate 
              and helpful information. We're constantly working to add new features and improve 
              existing ones based on user feedback.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-content">
        <div className="container px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Ready to Improve Your Chess?</h2>
          <p className="text-lg sm:text-xl text-primary-content/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Start using our chess tools today and take your game to the next level.
          </p>
          <Link 
            href="/rating-estimator" 
            className="btn btn-lg bg-white text-primary hover:bg-base-200 shadow-md"
          >
            Try the Rating Estimator
          </Link>
        </div>
      </section>
    </div>
  );
}
