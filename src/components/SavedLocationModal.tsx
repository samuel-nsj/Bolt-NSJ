import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase, SavedLocation } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import { searchZonesBySuburb, searchZonesByPostcode } from '../lib/zones';

interface PostcodeSuggestion {
  postcode: string;
  suburb: string;
  state: string;
}

interface SavedLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: SavedLocation | null;
}

export default function SavedLocationModal({ isOpen, onClose, onSuccess, location }: SavedLocationModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    suburb: '',
    postcode: '',
    state: '',
    instructions: '',
    is_business: false,
    is_pickup: true,
    is_delivery: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [showPostcodeSuggestions, setShowPostcodeSuggestions] = useState(false);
  const [postcodeSearchQuery, setPostcodeSearchQuery] = useState('');
  const postcodeInputRef = useRef<HTMLInputElement>(null);
  const postcodeSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        contact_name: location.contact_name || '',
        phone: location.phone || '',
        email: location.email || '',
        address_line1: location.address_line1 || '',
        address_line2: location.address_line2 || '',
        suburb: location.suburb || '',
        postcode: location.postcode || '',
        state: location.state || '',
        instructions: location.instructions || '',
        is_business: location.is_business || false,
        is_pickup: location.is_pickup,
        is_delivery: location.is_delivery,
      });
    } else {
      setFormData({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address_line1: '',
        address_line2: '',
        suburb: '',
        postcode: '',
        state: '',
        instructions: '',
        is_business: false,
        is_pickup: true,
        is_delivery: true,
      });
    }
  }, [location, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        postcodeSuggestionsRef.current &&
        !postcodeSuggestionsRef.current.contains(event.target as Node) &&
        postcodeInputRef.current &&
        !postcodeInputRef.current.contains(event.target as Node)
      ) {
        setShowPostcodeSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPostcodes = async (query: string) => {
    if (!query || query.length < 2) {
      setPostcodeSuggestions([]);
      return [];
    }

    try {
      let zones;
      if (/^\d+$/.test(query)) {
        zones = await searchZonesByPostcode(query);
      } else {
        zones = await searchZonesBySuburb(query);
      }

      const suggestions = zones.map(zone => ({
        postcode: String(zone.POSTCODE),
        suburb: zone.SUBURB,
        state: zone.STATE,
      }));

      return suggestions.slice(0, 15);
    } catch (error) {
      console.error('Error searching postcodes:', error);
      return [];
    }
  };

  const handlePostcodeSearch = async (value: string) => {
    setPostcodeSearchQuery(value);
    setShowPostcodeSuggestions(true);

    const suggestions = await searchPostcodes(value);
    setPostcodeSuggestions(suggestions);
  };

  const handleSelectSuggestion = (suggestion: PostcodeSuggestion) => {
    setFormData({
      ...formData,
      suburb: suggestion.suburb,
      postcode: suggestion.postcode,
      state: suggestion.state,
    });
    setPostcodeSearchQuery('');
    setShowPostcodeSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      if (location) {
        const { error: updateError } = await supabase
          .from('saved_locations')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', location.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('saved_locations')
          .insert([{
            ...formData,
            user_id: user.id,
          }]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {location ? 'Edit Location' : 'Add New Location'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Warehouse, Home Address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0412 345 678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address 1 *
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="123 Main Street"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address 2
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Unit 5, Building B (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Suburb or Postcode *
            </label>
            <input
              ref={postcodeInputRef}
              type="text"
              value={postcodeSearchQuery}
              onChange={(e) => handlePostcodeSearch(e.target.value)}
              onFocus={() => setShowPostcodeSuggestions(true)}
              placeholder="Search by suburb or postcode..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
            {showPostcodeSuggestions && postcodeSuggestions.length > 0 && (
              <div
                ref={postcodeSuggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {postcodeSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {suggestion.suburb}, {suggestion.state} {suggestion.postcode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suburb *
              </label>
              <input
                type="text"
                value={formData.suburb}
                onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                placeholder="Sydney"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50"
                required
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postcode *
              </label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="2000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50"
                required
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="NSW"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50"
                required
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Delivery instructions, gate codes, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Type *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_business: false })}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  !formData.is_business
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Residential
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_business: true })}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  formData.is_business
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Business
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Use this location for *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_pickup}
                  onChange={(e) => setFormData({ ...formData, is_pickup: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Pickup</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_delivery}
                  onChange={(e) => setFormData({ ...formData, is_delivery: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Delivery</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Saving...' : location ? 'Update Location' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
