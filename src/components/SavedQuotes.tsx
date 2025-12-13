import { useState, useEffect } from 'react';
import { Package, Trash2, Edit2, BookOpen, Calendar, DollarSign, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';

interface SavedQuote {
  id: string;
  pickup_postcode: string;
  pickup_suburb: string;
  pickup_state: string;
  pickup_is_business: boolean;
  delivery_postcode: string;
  delivery_suburb: string;
  delivery_state: string;
  delivery_is_business: boolean;
  service_type: string;
  items: any[];
  estimated_price: number;
  estimated_eta: number;
  quote_name: string;
  created_at: string;
  updated_at: string;
}

interface SavedQuotesProps {
  onBookQuote: (quoteData: any) => void;
  onEditQuote: (quoteData: any) => void;
}

export default function SavedQuotes({ onBookQuote, onEditQuote }: SavedQuotesProps) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSavedQuotes();
    }
  }, [user]);

  const loadSavedQuotes = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('saved_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setQuotes(data || []);
    } catch (err: any) {
      console.error('Error loading saved quotes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;

    try {
      setDeletingId(id);
      setError('');

      const { error: deleteError } = await supabase
        .from('saved_quotes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setQuotes(quotes.filter(q => q.id !== id));
    } catch (err: any) {
      console.error('Error deleting quote:', err);
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (quote: SavedQuote) => {
    const quoteData = {
      pickupPostcode: quote.pickup_postcode,
      pickupSuburb: quote.pickup_suburb,
      pickupState: quote.pickup_state,
      pickupIsBusiness: quote.pickup_is_business,
      deliveryPostcode: quote.delivery_postcode,
      deliverySuburb: quote.delivery_suburb,
      deliveryState: quote.delivery_state,
      deliveryIsBusiness: quote.delivery_is_business,
      serviceType: quote.service_type,
      items: quote.items,
      estimatedPrice: quote.estimated_price,
      estimatedEta: quote.estimated_eta,
    };

    onEditQuote(quoteData);
  };

  const handleBook = (quote: SavedQuote) => {
    const quoteData = {
      pickupPostcode: quote.pickup_postcode,
      pickupSuburb: quote.pickup_suburb,
      pickupState: quote.pickup_state,
      pickupIsBusiness: quote.pickup_is_business,
      deliveryPostcode: quote.delivery_postcode,
      deliverySuburb: quote.delivery_suburb,
      deliveryState: quote.delivery_state,
      deliveryIsBusiness: quote.delivery_is_business,
      serviceType: quote.service_type,
      items: quote.items,
      estimatedPrice: quote.estimated_price,
      estimatedEta: quote.estimated_eta,
    };

    onBookQuote(quoteData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalItems = (items: any[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved quotes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Quotes</h1>
        <p className="text-gray-600">View, edit, and book your saved shipping quotes</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Quotes</h3>
          <p className="text-gray-600 mb-6">
            You haven't saved any quotes yet. Get a quote and save it for later!
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {quote.quote_name || 'Unnamed Quote'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Saved {formatDate(quote.created_at)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">
                    ${quote.estimated_price.toFixed(2)}
                  </div>
                  {quote.estimated_eta && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 justify-end mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{quote.estimated_eta} days</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Pickup</div>
                    <div className="text-sm text-gray-900">
                      {quote.pickup_suburb}, {quote.pickup_state} {quote.pickup_postcode}
                    </div>
                    {quote.pickup_is_business && (
                      <span className="text-xs text-gray-500">Business</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Delivery</div>
                    <div className="text-sm text-gray-900">
                      {quote.delivery_suburb}, {quote.delivery_state} {quote.delivery_postcode}
                    </div>
                    {quote.delivery_is_business && (
                      <span className="text-xs text-gray-500">Business</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {getTotalItems(quote.items)} item{getTotalItems(quote.items) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600 capitalize">
                    {quote.service_type}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleBook(quote)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Book Job
                </button>
                <button
                  onClick={() => handleEdit(quote)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(quote.id)}
                  disabled={deletingId === quote.id}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === quote.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
