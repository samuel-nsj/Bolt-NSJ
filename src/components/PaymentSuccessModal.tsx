import { CheckCircle, XCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'success' | 'failed';
}

export default function PaymentSuccessModal({ isOpen, onClose, status }: PaymentSuccessModalProps) {
  const [receiptData] = useState({
    orderNumber: `NSJ-${Date.now().toString().slice(-8)}`,
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    amount: '$25.00'
  });

  useEffect(() => {
    if (isOpen && status === 'success') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {status === 'success' ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
            <p className="text-gray-600 mb-8">Your payment has been processed successfully.</p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">Receipt</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-semibold text-gray-900">{receiptData.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold text-gray-900">{receiptData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold text-gray-900">{receiptData.time}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-900 font-semibold">Total Paid:</span>
                    <span className="text-green-600 font-bold text-xl">{receiptData.amount}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              A confirmation email has been sent to your registered email address.
            </p>

            <button
              onClick={onClose}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-8">
              Your payment could not be processed. Please try again or use a different payment method.
            </p>

            <div className="space-y-3">
              <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
