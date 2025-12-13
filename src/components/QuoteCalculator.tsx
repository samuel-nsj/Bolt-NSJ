import { useState, useRef, useEffect } from 'react';
import { Package, ArrowRight, Loader2, MapPin, Plus, Trash2, Save, BookOpen, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/auth';
import { supabase, SavedLocation, SavedItem } from '../lib/supabase';
import { searchZonesBySuburb, searchZonesByPostcode } from '../lib/zones';

interface QuoteCalculatorProps {
  onGetQuote: () => void;
  onBookJob?: (quoteData: any) => void;
  initialQuoteData?: any;
}

interface PostcodeSuggestion {
  postcode: string;
  suburb: string;
  state: string;
}

interface QuoteItem {
  id: string;
  name: string;
  itemType: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
}

interface RateOption {
  serviceType: string;
  serviceName: string;
  baseAmount: number;
  totalCost: number;
  currency: string;
  transitDays: number;
}

interface QuoteResponse {
  quoteId: string;
  rates: RateOption[];
  validUntil: string;
}

const ITEM_TYPES = [
  'Carton',
  'Pallet',
  'Skid',
  'Crate',
  'Satchel',
  'Bag',
  'Box',
  'Bundle',
  'Envelope',
  'Package',
];

export default function QuoteCalculator({ onGetQuote, onBookJob, initialQuoteData }: QuoteCalculatorProps) {
  const { user } = useAuth();

  const [pickupMode, setPickupMode] = useState<'saved' | 'new'>('new');
  const [deliveryMode, setDeliveryMode] = useState<'saved' | 'new'>('new');

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const [selectedPickupLocation, setSelectedPickupLocation] = useState<string>('');
  const [selectedDeliveryLocation, setSelectedDeliveryLocation] = useState<string>('');
  const [selectedSavedItem, setSelectedSavedItem] = useState<string>('');
  const [itemNameSuggestions, setItemNameSuggestions] = useState<{ [key: string]: SavedItem[] }>({});
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  const [pickupPostcode, setPickupPostcode] = useState('');
  const [pickupDisplay, setPickupDisplay] = useState('');
  const [pickupIsBusiness, setPickupIsBusiness] = useState(false);
  const [pickupSuburb, setPickupSuburb] = useState('');
  const [pickupState, setPickupState] = useState('');

  const [deliveryPostcode, setDeliveryPostcode] = useState('');
  const [deliveryDisplay, setDeliveryDisplay] = useState('');
  const [deliveryIsBusiness, setDeliveryIsBusiness] = useState(false);
  const [deliverySuburb, setDeliverySuburb] = useState('');
  const [deliveryState, setDeliveryState] = useState('');

  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: '1',
      name: '',
      itemType: '',
      quantity: 1,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
    },
  ]);

  const [pickupSuggestions, setPickupSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState<PostcodeSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);

  const pickupRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null);
  const [selectedRate, setSelectedRate] = useState<RateOption | null>(null);
  const [error, setError] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupEmail, setPickupEmail] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');

  useEffect(() => {
    if (user) {
      loadSavedLocations();
      loadSavedItems();
    }
  }, [user]);

  useEffect(() => {
    if (initialQuoteData) {
      setPickupPostcode(initialQuoteData.pickupPostcode || '');
      setPickupDisplay(initialQuoteData.pickupPostcode || '');
      setPickupSuburb(initialQuoteData.pickupSuburb || '');
      setPickupState(initialQuoteData.pickupState || '');
      setPickupIsBusiness(initialQuoteData.pickupIsBusiness || false);

      setDeliveryPostcode(initialQuoteData.deliveryPostcode || '');
      setDeliveryDisplay(initialQuoteData.deliveryPostcode || '');
      setDeliverySuburb(initialQuoteData.deliverySuburb || '');
      setDeliveryState(initialQuoteData.deliveryState || '');
      setDeliveryIsBusiness(initialQuoteData.deliveryIsBusiness || false);

      if (initialQuoteData.items && initialQuoteData.items.length > 0) {
        setItems(initialQuoteData.items);
      }
    }
  }, [initialQuoteData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) {
        setShowPickupSuggestions(false);
      }
      if (deliveryRef.current && !deliveryRef.current.contains(event.target as Node)) {
        setShowDeliverySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSavedLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedLocations(data || []);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  };

  const loadSavedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedItems(data || []);
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const handlePickupLocationChange = (locationId: string) => {
    setSelectedPickupLocation(locationId);
    const location = savedLocations.find((l) => l.id === locationId);
    if (location) {
      setPickupPostcode(location.postcode);
      setPickupSuburb(location.suburb);
      setPickupState(location.state || '');
      setPickupDisplay(`${location.name} - ${location.suburb}, ${location.state} ${location.postcode}`);
      setPickupIsBusiness(location.is_business);
      setPickupAddress(location.address_line1 || '');
      setPickupName(location.contact_name || '');
      setPickupPhone(location.phone || '');
      setPickupEmail(location.email || '');
    }
  };

  const handleDeliveryLocationChange = (locationId: string) => {
    setSelectedDeliveryLocation(locationId);
    const location = savedLocations.find((l) => l.id === locationId);
    if (location) {
      setDeliveryPostcode(location.postcode);
      setDeliverySuburb(location.suburb);
      setDeliveryState(location.state || '');
      setDeliveryDisplay(`${location.name} - ${location.suburb}, ${location.state} ${location.postcode}`);
      setDeliveryIsBusiness(location.is_business);
      setDeliveryAddress(location.address_line1 || '');
      setDeliveryName(location.contact_name || '');
      setDeliveryPhone(location.phone || '');
      setDeliveryEmail(location.email || '');
    }
  };

  const handleSavedItemChange = (itemId: string) => {
    const savedItem = savedItems.find((i) => i.id === itemId);
    if (savedItem) {
      const newItem: QuoteItem = {
        id: Date.now().toString(),
        name: savedItem.name,
        itemType: savedItem.type,
        quantity: 1,
        weight: savedItem.weight,
        length: savedItem.length,
        width: savedItem.width,
        height: savedItem.height,
      };
      setItems([...items, newItem]);
    }
    setSelectedSavedItem('');
  };

  const searchPostcodes = async (query: string): Promise<PostcodeSuggestion[]> => {
    if (!query || query.length < 2) return [];

    try {
      const isNumeric = /^\d+$/.test(query);

      let zones;
      if (isNumeric) {
        zones = await searchZonesByPostcode(query);
      } else {
        zones = await searchZonesBySuburb(query);
      }

      const suggestions = zones.map((zone) => ({
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

  const handlePickupChange = async (value: string) => {
    setPickupDisplay(value);
    const postcodeOnly = value.replace(/[^0-9]/g, '').slice(0, 4);
    setPickupPostcode(postcodeOnly);

    if (value.length >= 2) {
      const suggestions = await searchPostcodes(value);
      setPickupSuggestions(suggestions);
      setShowPickupSuggestions(suggestions.length > 0);
    } else {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
    }
  };

  const handleDeliveryChange = async (value: string) => {
    setDeliveryDisplay(value);
    const postcodeOnly = value.replace(/[^0-9]/g, '').slice(0, 4);
    setDeliveryPostcode(postcodeOnly);

    if (value.length >= 2) {
      const suggestions = await searchPostcodes(value);
      setDeliverySuggestions(suggestions);
      setShowDeliverySuggestions(suggestions.length > 0);
    } else {
      setDeliverySuggestions([]);
      setShowDeliverySuggestions(false);
    }
  };

  const selectPickupSuggestion = (suggestion: PostcodeSuggestion) => {
    setPickupPostcode(suggestion.postcode);
    setPickupSuburb(suggestion.suburb);
    setPickupState(suggestion.state);
    setPickupDisplay(`${suggestion.suburb.toUpperCase()}, ${suggestion.postcode}, ${suggestion.state}`);
    setShowPickupSuggestions(false);
    setPickupSuggestions([]);
  };

  const selectDeliverySuggestion = (suggestion: PostcodeSuggestion) => {
    setDeliveryPostcode(suggestion.postcode);
    setDeliverySuburb(suggestion.suburb);
    setDeliveryState(suggestion.state);
    setDeliveryDisplay(`${suggestion.suburb.toUpperCase()}, ${suggestion.postcode}, ${suggestion.state}`);
    setShowDeliverySuggestions(false);
    setDeliverySuggestions([]);
  };

  const handleItemNameChange = (itemId: string, name: string) => {
    updateItem(itemId, 'name', name);

    if (name.trim().length > 0) {
      const filtered = savedItems.filter((item) => item.name.toLowerCase().includes(name.toLowerCase()));
      setItemNameSuggestions((prev) => ({ ...prev, [itemId]: filtered }));
    } else {
      setItemNameSuggestions((prev) => ({ ...prev, [itemId]: [] }));
    }
  };

  const selectSavedItemForField = (itemId: string, savedItem: SavedItem) => {
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          name: savedItem.name,
          itemType: savedItem.type,
          weight: savedItem.weight,
          length: savedItem.length,
          width: savedItem.width,
          height: savedItem.height,
          quantity: 1,
        };
      }
      return item;
    });
    setItems(updatedItems);
    setItemNameSuggestions((prev) => ({ ...prev, [itemId]: [] }));
    setFocusedItemId(null);
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      name: '',
      itemType: '',
      quantity: 1,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const getQuoteFromAPI = async () => {
    if (!pickupPostcode || !deliveryPostcode) {
      setError('Please enter both pickup and delivery postcodes');
      return;
    }

    if (!pickupSuburb || !deliverySuburb) {
      setError('Please select valid suburbs from the suggestions');
      return;
    }

    const invalidItems = items.filter(
      (item) =>
        !item.weight ||
        !item.length ||
        !item.width ||
        !item.height ||
        item.weight <= 0 ||
        item.length <= 0 ||
        item.width <= 0 ||
        item.height <= 0 ||
        item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      setError('Please fill in all item dimensions, weight, and ensure quantity > 0');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_NSJ_API_KEY;

    if (!supabaseUrl || !apiKey) {
      setError('Missing configuration. Please contact support.');
      return;
    }

    setLoading(true);
    setError('');
    setQuoteResponse(null);
    setSelectedRate(null);

    try {
      const payload = {
        shipper: {
          address: {
            line1: pickupAddress || pickupSuburb,
            city: pickupSuburb,
            state: pickupState,
            postCode: pickupPostcode,
            countryCode: 'AU',
          },
          contact: {
            name: pickupName || 'Shipper',
            phone: pickupPhone || '0000000000',
            email: pickupEmail || user?.email || 'shipper@example.com',
          },
        },
        consignee: {
          address: {
            line1: deliveryAddress || deliverySuburb,
            city: deliverySuburb,
            state: deliveryState,
            postCode: deliveryPostcode,
            countryCode: 'AU',
          },
          contact: {
            name: deliveryName || 'Receiver',
            phone: deliveryPhone || '0000000000',
            email: deliveryEmail || user?.email || 'receiver@example.com',
          },
        },
        items: items.map((item) => ({
          quantity: Math.max(1, item.quantity),
          description: item.name || item.itemType || 'General Goods',
          weight: {
            value: item.weight,
            unit: 'KG',
          },
          dimensions: {
            length: item.length,
            width: item.width,
            height: item.height,
            unit: 'CM',
          },
        })),
        pickupIsBusiness,
        deliveryIsBusiness,
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/api-quote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        const errorData = isJson ? await response.json() : { error: await response.text() };
        throw new Error(errorData.error || 'Failed to get quote');
      }

      const data = isJson ? await response.json() : null;

      if (!data?.rates || data.rates.length === 0) {
        setError('No rates available for this route. Please try different locations.');
        return;
      }

      setQuoteResponse(data);
      setSelectedRate(data.rates[0]);
    } catch (err: any) {
      console.error('Error getting quote:', err);
      setError(err.message || 'Failed to get quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await getQuoteFromAPI();
  };

  const handleSaveQuote = async () => {
    if (!user) {
      setError('Please sign in to save quotes');
      return;
    }

    if (!quoteResponse || !selectedRate) return;

    setSavingQuote(true);
    try {
      const { error } = await supabase.from('saved_quotes').insert({
        user_id: user.id,
        pickup_postcode: pickupPostcode,
        pickup_suburb: pickupSuburb,
        pickup_state: pickupState,
        pickup_is_business: pickupIsBusiness,
        delivery_postcode: deliveryPostcode,
        delivery_suburb: deliverySuburb,
        delivery_state: deliveryState,
        delivery_is_business: deliveryIsBusiness,
        service_type: selectedRate.serviceType,
        items: items,
        estimated_price: selectedRate.totalCost,
        estimated_eta: selectedRate.transitDays,
        quote_name: `Quote - ${pickupSuburb || pickupPostcode} to ${deliverySuburb || deliveryPostcode}`,
      });

      if (error) throw error;

      alert('Quote saved successfully!');
    } catch (error) {
      console.error('Error saving quote:', error);
      setError('Failed to save quote. Please try again.');
    } finally {
      setSavingQuote(false);
    }
  };

  const handleBookJob = () => {
    if (!quoteResponse || !selectedRate) {
      alert('Please select a rate first');
      return;
    }

    if (!user) {
      alert('Please sign in to book a job');
      return;
    }

    const quoteData = {
      quoteId: quoteResponse.quoteId,
      serviceType: selectedRate.serviceType,
      pickupPostcode,
      pickupSuburb,
      pickupState,
      pickupIsBusiness,
      pickupAddress,
      pickupName,
      pickupPhone,
      pickupEmail,
      deliveryPostcode,
      deliverySuburb,
      deliveryState,
      deliveryIsBusiness,
      deliveryAddress,
      deliveryName,
      deliveryPhone,
      deliveryEmail,
      items,
      estimatedPrice: selectedRate.totalCost,
      estimatedEta: selectedRate.transitDays,
    };

    if (onBookJob) {
      onBookJob(quoteData);
    }
  };

  const pickupLocations = savedLocations.filter((l) => l.is_pickup);
  const deliveryLocations = savedLocations.filter((l) => l.is_delivery);

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              From Location
            </h4>

            {user && pickupLocations.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPickupMode('saved');
                      setPickupDisplay('');
                      setPickupPostcode('');
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                      pickupMode === 'saved'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Saved Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickupMode('new');
                      setSelectedPickupLocation('');
                      setPickupDisplay('');
                      setPickupPostcode('');
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                      pickupMode === 'new'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    New Location
                  </button>
                </div>

                {pickupMode === 'saved' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Select Location *</label>
                    <select
                      value={selectedPickupLocation}
                      onChange={(e) => handlePickupLocationChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Choose a location...</option>
                      {pickupLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.suburb}, {location.state} {location.postcode}
                          {location.is_business ? ' (Business)' : ' (Residential)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {pickupMode === 'new' && (
              <>
                <div ref={pickupRef} className="relative mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Suburb *</label>
                  <input
                    type="text"
                    value={pickupDisplay}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    onFocus={() => pickupDisplay && setShowPickupSuggestions(pickupSuggestions.length > 0)}
                    placeholder="Search suburb or postcode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                    required
                  />

                  {showPickupSuggestions && pickupSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {pickupSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectPickupSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 transition border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {suggestion.postcode} {suggestion.suburb}
                          </div>
                          <div className="text-xs text-gray-500">{suggestion.state}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Location Type *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPickupIsBusiness(false)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                        !pickupIsBusiness
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Residential
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupIsBusiness(true)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                        pickupIsBusiness
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Business
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              To Location
            </h4>

            {user && deliveryLocations.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('saved');
                      setDeliveryDisplay('');
                      setDeliveryPostcode('');
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                      deliveryMode === 'saved'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Saved Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('new');
                      setSelectedDeliveryLocation('');
                      setDeliveryDisplay('');
                      setDeliveryPostcode('');
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                      deliveryMode === 'new'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    New Location
                  </button>
                </div>

                {deliveryMode === 'saved' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Select Location *</label>
                    <select
                      value={selectedDeliveryLocation}
                      onChange={(e) => handleDeliveryLocationChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Choose a location...</option>
                      {deliveryLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.suburb}, {location.state} {location.postcode}
                          {location.is_business ? ' (Business)' : ' (Residential)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {deliveryMode === 'new' && (
              <>
                <div ref={deliveryRef} className="relative mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Suburb *</label>
                  <input
                    type="text"
                    value={deliveryDisplay}
                    onChange={(e) => handleDeliveryChange(e.target.value)}
                    onFocus={() => deliveryDisplay && setShowDeliverySuggestions(deliverySuggestions.length > 0)}
                    placeholder="Search suburb or postcode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                    required
                  />

                  {showDeliverySuggestions && deliverySuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {deliverySuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectDeliverySuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 transition border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {suggestion.postcode} {suggestion.suburb}
                          </div>
                          <div className="text-xs text-gray-500">{suggestion.state}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Location Type *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryIsBusiness(false)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                        !deliveryIsBusiness
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Residential
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryIsBusiness(true)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                        deliveryIsBusiness
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Business
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              Items
            </h4>
            <button
              type="button"
              onClick={addItem}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <div className="grid grid-cols-[2fr,1.5fr,1fr,1fr,1fr,1fr,0.8fr,auto] gap-2 items-end">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                      onFocus={() => setFocusedItemId(item.id)}
                      onBlur={() => setTimeout(() => setFocusedItemId(null), 200)}
                      placeholder="Enter or select..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    />
                    {focusedItemId === item.id && itemNameSuggestions[item.id]?.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {itemNameSuggestions[item.id].map((savedItem) => (
                          <button
                            key={savedItem.id}
                            type="button"
                            onClick={() => selectSavedItemForField(item.id, savedItem)}
                            className="w-full px-3 py-2 text-left hover:bg-purple-50 text-sm border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">{savedItem.name}</div>
                            <div className="text-gray-500 text-xs">
                              {savedItem.weight}kg • {savedItem.length}x{savedItem.width}x{savedItem.height}cm
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item Type</label>
                    <select
                      value={item.itemType}
                      onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      required
                    >
                      <option value="">Select...</option>
                      {ITEM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Length cm</label>
                    <input
                      type="number"
                      value={item.length || ''}
                      onChange={(e) => updateItem(item.id, 'length', parseFloat(e.target.value) || 0)}
                      placeholder="30"
                      step="1"
                      min="1"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Width cm</label>
                    <input
                      type="number"
                      value={item.width || ''}
                      onChange={(e) => updateItem(item.id, 'width', parseFloat(e.target.value) || 0)}
                      placeholder="30"
                      step="1"
                      min="1"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height cm</label>
                    <input
                      type="number"
                      value={item.height || ''}
                      onChange={(e) => updateItem(item.id, 'height', parseFloat(e.target.value) || 0)}
                      placeholder="30"
                      step="1"
                      min="1"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Weight kg</label>
                    <input
                      type="number"
                      value={item.weight || ''}
                      onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                      placeholder="5.0"
                      step="0.1"
                      min="0.1"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) =>
                        updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 0))
                      }
                      placeholder="1"
                      min="1"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      required
                    />
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 transition p-1 mb-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-6">
            {error}
          </div>
        )}

        {quoteResponse && quoteResponse.rates && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Available Rates</h4>
            {quoteResponse.rates.map((rate, index) => (
              <div
                key={index}
                onClick={() => setSelectedRate(rate)}
                className={`cursor-pointer p-4 rounded-lg border-2 transition ${
                  selectedRate?.serviceType === rate.serviceType
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">{rate.serviceName}</h5>
                    <p className="text-xs text-gray-600 mt-1">Service Type: {rate.serviceType}</p>
                    <p className="text-xs text-gray-600">Transit Time: {rate.transitDays} business days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">${rate.totalCost.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Base: ${rate.baseAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!quoteResponse ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Getting Rates...
              </>
            ) : (
              <>
                Get Instant Quote
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <button
              type="button"
              onClick={handleBookJob}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Book Job
            </button>
            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={savingQuote || !user}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {savingQuote ? 'Saving...' : 'Save Quote'}
            </button>
            <button
              type="button"
              onClick={getQuoteFromAPI}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-5 h-5" />
              {loading ? 'Calculating...' : 'Refresh Rates'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}