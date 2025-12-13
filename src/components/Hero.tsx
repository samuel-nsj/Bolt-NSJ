import { Truck, DollarSign, Globe, CheckCircle } from 'lucide-react';

interface HeroProps {
  onBookClick: () => void;
  onQuoteClick: () => void;
  onSignUpClick: () => void;
}

export default function Hero({ onBookClick, onQuoteClick, onSignUpClick }: HeroProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Ship anything,
            <span className="bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent"> anywhere</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Fast, reliable freight delivery. Get your packages to customers with NSJ Express. Simple pricing. No hidden fees.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onBookClick}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg hover:shadow-2xl transition-smooth hover-lift font-bold text-lg"
            >
              Book a Delivery
            </button>
            <button
              onClick={onQuoteClick}
              className="bg-white border-2 border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:border-purple-600 hover:text-purple-600 transition-smooth hover-lift font-bold text-lg"
            >
              Get a Quote
            </button>
            <button
              onClick={onSignUpClick}
              className="bg-white border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg hover:bg-purple-600 hover:text-white transition-smooth hover-lift font-bold text-lg"
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-20">
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 mb-4 mx-auto">
              <Truck className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Fast Delivery</h3>
            <p className="text-gray-600 text-center text-sm">Same-day and next-day options</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 mb-4 mx-auto">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Simple Pricing</h3>
            <p className="text-gray-600 text-center text-sm">No hidden fees</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 mb-4 mx-auto">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Nationwide</h3>
            <p className="text-gray-600 text-center text-sm">Reach customers everywhere</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 mb-4 mx-auto">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Real-time Tracking</h3>
            <p className="text-gray-600 text-center text-sm">24/7 customer support</p>
          </div>
        </div>

      </div>
    </div>
  );
}
