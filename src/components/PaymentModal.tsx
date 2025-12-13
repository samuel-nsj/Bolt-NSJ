import { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  customerEmail?: string;
  onPaymentComplete?: (paymentIntentId: string) => void;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  bookingData?: any;
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  customerEmail,
  onPaymentComplete,
  onPaymentSuccess,
  bookingData
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const processPayment = async () => {
    setError('');
    setLoading(true);

    try {
      const pendingBooking = localStorage.getItem('pendingBooking');
      const pendingBookingItems = localStorage.getItem('pendingBookingItems');

      const { data: { user } } = await supabase.auth.getUser();
      const customerId = user?.id || 'guest';

      const bookingPayload = bookingData || (pendingBooking ? JSON.parse(pendingBooking) : null);
      const itemsPayload = pendingBookingItems ? JSON.parse(pendingBookingItems) : null;

      const zapierPayload = {
        customerId: customerId,
        orderNumber: `NSJ-${Date.now()}`,
        orderDate: new Date().toISOString().split('T')[0],
        amount: amount,
        customerEmail: customerEmail || bookingPayload?.pickupEmail || 'customer@example.com',
        timestamp: new Date().toISOString(),
        description: `NSJ Express Shipping - ${bookingPayload?.pickupSuburb || ''} to ${bookingPayload?.deliverySuburb || ''}`,
        currency: 'AUD',
        pickupName: bookingPayload?.pickupName || '',
        pickupEmail: bookingPayload?.pickupEmail || '',
        pickupPhone: bookingPayload?.pickupPhone || '',
        pickupCompany: bookingPayload?.pickupCompany || '',
        pickupAddress: bookingPayload?.pickupAddressLine1 || '',
        pickupSuburb: bookingPayload?.pickupSuburb || '',
        pickupCity: bookingPayload?.pickupSuburb || '',
        pickupState: bookingPayload?.pickupState || '',
        pickupPostcode: bookingPayload?.pickupPostcode || '',
        pickupCountry: 'AU',
        pickupInstructions: bookingPayload?.pickupInstructions || '',
        deliveryName: bookingPayload?.deliveryName || '',
        deliveryEmail: bookingPayload?.deliveryEmail || '',
        deliveryPhone: bookingPayload?.deliveryPhone || '',
        deliveryCompany: bookingPayload?.deliveryCompany || '',
        deliveryAddress: bookingPayload?.deliveryAddressLine1 || '',
        deliverySuburb: bookingPayload?.deliverySuburb || '',
        deliveryCity: bookingPayload?.deliverySuburb || '',
        deliveryState: bookingPayload?.deliveryState || '',
        deliveryPostcode: bookingPayload?.deliveryPostcode || '',
        deliveryCountry: 'AU',
        deliveryInstructions: bookingPayload?.deliveryInstructions || '',
        serviceLevel: bookingPayload?.serviceType?.toLowerCase() || 'standard',
        packagingType: itemsPayload?.[0]?.itemType?.toLowerCase() || 'carton',
        items: (itemsPayload || []).map((item: any) => ({
          sku: item.id || 'ITEM-001',
          description: item.name || 'Shipping Item',
          quantity: item.quantity || 1,
          weight: item.weight || 0,
          length: item.length || 0,
          width: item.width || 0,
          height: item.height || 0,
          unitPrice: (amount / (itemsPayload?.length || 1)),
          totalPrice: amount
        })),
        totalWeight: (itemsPayload || []).reduce((sum: number, item: any) => sum + (item.weight || 0), 0),
        totalValue: amount,
        successUrl: `${window.location.origin}?payment=success`,
        cancelUrl: `${window.location.origin}?payment=cancelled`
      };

      localStorage.setItem('zapierPayload', JSON.stringify(zapierPayload));

      const zapierWebhook = 'https://hooks.zapier.com/hooks/catch/20733393/2d72zor/';

      const response = await fetch(zapierWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zapierPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to trigger payment');
      }

      const result = await response.json();

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        if (onPaymentSuccess) {
          onPaymentSuccess(`ZAP-${Date.now()}`);
        }
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processPayment();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-gray-900">${amount.toFixed(2)}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CreditCard className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-gray-900 mb-2">Secure Payment via Stripe</p>
                <p className="text-sm text-gray-700 mb-3">
                  Click below to securely pay via Stripe. You'll be redirected to complete your payment.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>✓ Secure encrypted payment</p>
                  <p>✓ Order sent to StarShipIt automatically</p>
                  <p>✓ Confirmation sent to {customerEmail || bookingData?.pickupEmail || 'your email'}</p>
                  <p>✓ Zapier automation triggered</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay ${amount.toFixed(2)} with Stripe
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your payment is secure and encrypted. By proceeding, you agree to our terms of service.
          </p>
        </form>
      </div>
    </div>
  );
}
