import { useState } from 'react';
import { Menu, X, Search } from 'lucide-react';

interface HeaderProps {
  onBookClick: () => void;
  onLoginClick: () => void;
  onTrackClick?: () => void;
}

export default function Header({ onBookClick, onLoginClick, onTrackClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img
              src="/NSJ Express Logo (Socials Profile Pic).png"
              alt="NSJ Express"
              className="h-16 w-auto"
            />
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#pricing" className="text-gray-700 hover:text-purple-600 transition font-medium text-sm">
              Pricing
            </a>
            <button
              onClick={onTrackClick}
              className="flex items-center gap-1 text-gray-700 hover:text-purple-600 transition font-medium text-sm"
            >
              <Search className="w-4 h-4" />
              Track
            </button>
            <a href="#about" className="text-gray-700 hover:text-purple-600 transition font-medium text-sm">
              About
            </a>
            <button
              onClick={onLoginClick}
              className="text-gray-700 hover:text-purple-600 transition font-medium text-sm"
            >
              Sign In
            </button>
            <button
              onClick={onBookClick}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:shadow-lg transition font-semibold text-sm"
            >
              Book Now
            </button>
          </nav>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <a href="#pricing" className="block text-gray-700 hover:text-purple-600 transition font-medium text-sm py-2">
              Pricing
            </a>
            <button
              onClick={onTrackClick}
              className="flex items-center gap-1 text-gray-700 hover:text-purple-600 transition font-medium text-sm py-2"
            >
              <Search className="w-4 h-4" />
              Track
            </button>
            <a href="#about" className="block text-gray-700 hover:text-purple-600 transition font-medium text-sm py-2">
              About
            </a>
            <button
              onClick={onLoginClick}
              className="block w-full text-left text-gray-700 hover:text-purple-600 transition font-medium text-sm py-2"
            >
              Sign In
            </button>
            <button
              onClick={onBookClick}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:shadow-lg transition font-semibold text-sm"
            >
              Book Now
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
