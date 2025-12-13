import { useState } from 'react';
import { X, Search, Package, MapPin, Clock, CheckCircle } from 'lucide-react';
import { supabase, Booking } from '../lib/supabase';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrackingModal({ isOpen, onClose }: TrackingModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setBooking(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/api-track/${encodeURIComponent(trackingNumber)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tracking information');
      }

      const data = await response.json();

      if (!data.shipmentId) {
        setError('No shipment found with this tracking number');
        return;
      }

      setBooking(data);
    } catch (err: any) {
      console.error('Tracking error:', err);
      setError(err.message || 'Failed to fetch tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { label: 'Order Placed', color: 'yellow', icon: Clock },
      confirmed: { label: 'Picked Up', color: 'blue', icon: Package },
      in_transit: { label: 'In Transit', color: 'purple', icon: MapPin },
      delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Track Your Shipment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSearch} className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Tracking Number
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter your booking ID"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                Track
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Searching for your shipment...</p>
            </div>
          )}

          {booking && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
                    <p className="text-lg font-bold text-gray-900">{booking.id}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-semibold flex items-center gap-2 ${
                    booking.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    booking.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                    booking.status === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {(() => {
                      const StatusIcon = getStatusInfo(booking.status).icon;
                      return <StatusIcon className="w-5 h-5" />;
                    })()}
                    {getStatusInfo(booking.status).label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Customer</p>
                    <p className="font-semibold text-gray-900">{booking.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Order Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(booking.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Shipment Details</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-medium text-gray-900">{booking.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <MapPin className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">To</p>
                      <p className="font-medium text-gray-900">{booking.delivery_address}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Weight</p>
                        <p className="font-semibold text-gray-900">{booking.package_weight} kg</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Quantity</p>
                        <p className="font-semibold text-gray-900">{booking.quantity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Tracking Timeline</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'in_transit' || booking.status === 'delivered' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                      <div className={`w-0.5 h-12 ${booking.status === 'confirmed' || booking.status === 'in_transit' || booking.status === 'delivered' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900">Order Placed</p>
                      <p className="text-sm text-gray-600">{formatDate(booking.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${booking.status === 'confirmed' || booking.status === 'in_transit' || booking.status === 'delivered' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                      <div className={`w-0.5 h-12 ${booking.status === 'in_transit' || booking.status === 'delivered' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900">Picked Up</p>
                      <p className="text-sm text-gray-600">
                        {booking.status === 'confirmed' || booking.status === 'in_transit' || booking.status === 'delivered' ? 'Package collected' : 'Awaiting pickup'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${booking.status === 'in_transit' || booking.status === 'delivered' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                      <div className={`w-0.5 h-12 ${booking.status === 'delivered' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900">In Transit</p>
                      <p className="text-sm text-gray-600">
                        {booking.status === 'in_transit' || booking.status === 'delivered' ? 'Package on the way' : 'Not yet dispatched'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${booking.status === 'delivered' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Delivered</p>
                      <p className="text-sm text-gray-600">
                        {booking.status === 'delivered' ? 'Package delivered successfully' : 'Not yet delivered'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
