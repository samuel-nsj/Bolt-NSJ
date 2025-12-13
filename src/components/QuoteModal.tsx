import { X } from 'lucide-react';
import QuoteCalculator from './QuoteCalculator';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetQuote?: () => void;
  onBookJob?: (quoteData: any) => void;
  initialQuoteData?: any;
}

export default function QuoteModal({ isOpen, onClose, onGetQuote, onBookJob, initialQuoteData }: QuoteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Quick Quote</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <QuoteCalculator
            onGetQuote={() => {
              onGetQuote?.();
              onClose();
            }}
            onBookJob={(data) => {
              onBookJob?.(data);
              onClose();
            }}
            initialQuoteData={initialQuoteData}
          />
        </div>
      </div>
    </div>
  );
}
