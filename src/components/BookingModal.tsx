import { useState, useEffect, useRef } from 'react';
import { X, Package, MapPin, Plus, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, SavedLocation, SavedItem } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import PaymentModal from './PaymentModal';
import { searchZonesBySuburb, searchZonesByPostcode } from '../lib/zones';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentSessionId?: string | null;
  asPage?: boolean;
  quoteData?: {
    quoteId?: string;
    serviceType: string;
    pickupPostcode: string;
    pickupSuburb?: string;
    pickupState?: string;
    pickupIsBusiness?: boolean;
    pickupAddress?: string;
    pickupName?: string;
    pickupPhone?: string;
    pickupEmail?: string;
    deliveryPostcode: string;
    deliverySuburb?: string;
    deliveryState?: string;
    deliveryIsBusiness?: boolean;
    deliveryAddress?: string;
    deliveryName?: string;
    deliveryPhone?: string;
    deliveryEmail?: string;
    items: Array<{
      id: string;
      name?: string;
      itemType: string;
      quantity: number;
      weight: number;
      length: number;
      width: number;
      height: number;
    }>;
    estimatedPrice: number;
    estimatedEta?: number;
  };
}

interface PostcodeSuggestion {
  postcode: string;
  suburb: string;
  state: string;
}

interface BookingItem {
  id: string;
  name: string;
  itemType: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
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

export default function BookingModal({ isOpen, onClose, paymentSessionId, quoteData, asPage = false }: BookingModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(quoteData?.estimatedPrice || null);
  const [estimatedEta, setEstimatedEta] = useState<number | null>(quoteData?.estimatedEta || null);
  const [transitTime, setTransitTime] = useState<string | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [pickupMode, setPickupMode] = useState<'saved' | 'new'>('new');
  const [deliveryMode, setDeliveryMode] = useState<'saved' | 'new'>('new');

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const [selectedPickupLocation, setSelectedPickupLocation] = useState<string>('');
  const [selectedDeliveryLocation, setSelectedDeliveryLocation] = useState<string>('');
  const [itemNameSuggestions, setItemNameSuggestions] = useState<{[key: string]: SavedItem[]}>({});
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [pickupLocationSuggestions, setPickupLocationSuggestions] = useState<SavedLocation[]>([]);
  const [deliveryLocationSuggestions, setDeliveryLocationSuggestions] = useState<SavedLocation[]>([]);
  const [showPickupLocationSuggestions, setShowPickupLocationSuggestions] = useState(false);
  const [showDeliveryLocationSuggestions, setShowDeliveryLocationSuggestions] = useState(false);

  const [pickupDisplay, setPickupDisplay] = useState(
    quoteData ? `${quoteData.pickupPostcode} ${quoteData.pickupSuburb || ''}`.trim() : ''
  );
  const [deliveryDisplay, setDeliveryDisplay] = useState(
    quoteData ? `${quoteData.deliveryPostcode} ${quoteData.deliverySuburb || ''}`.trim() : ''
  );
  const [pickupSuggestions, setPickupSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState<PostcodeSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);

  const pickupRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    pickupLocationName: '',
    pickupName: '',
    pickupPhone: '',
    pickupEmail: '',
    pickupAddressLine1: '',
    pickupAddressLine2: '',
    pickupSuburb: quoteData?.pickupSuburb || '',
    pickupPostcode: quoteData?.pickupPostcode || '',
    pickupState: quoteData?.pickupState || '',
    pickupInstructions: '',
    pickupIsBusiness: quoteData?.pickupIsBusiness || false,

    deliveryLocationName: '',
    deliveryName: '',
    deliveryPhone: '',
    deliveryEmail: '',
    deliveryAddressLine1: '',
    deliveryAddressLine2: '',
    deliverySuburb: quoteData?.deliverySuburb || '',
    deliveryPostcode: quoteData?.deliveryPostcode || '',
    deliveryState: quoteData?.deliveryState || '',
    deliveryInstructions: '',
    deliveryIsBusiness: quoteData?.deliveryIsBusiness || false,

    serviceType: quoteData?.serviceType || 'Standard',
    referenceNumber: '',
    quoteId: quoteData?.quoteId || '',
  });

  const [items, setItems] = useState<BookingItem[]>(
    quoteData?.items ? quoteData.items.map(item => ({
      ...item,
      name: item.name || '',
    })) : [
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
    ]
  );

  useEffect(() => {
    if (user) {
      loadSavedLocations();
      loadSavedItems();
    }
  }, [user]);

  const loadSavedLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedLocations(data || []);
    } catch (err) {
      console.error('Error loading saved locations:', err);
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
    } catch (err) {
      console.error('Error loading saved items:', err);
    }
  };

  const handleSavedLocationSelect = (locationId: string, type: 'pickup' | 'delivery') => {
    const location = savedLocations.find(loc => loc.id === locationId);
    if (!location) return;

    const display = `${location.postcode} ${location.suburb}`.trim();

    if (type === 'pickup') {
      setPickupDisplay(display);
      setFormData(prev => ({
        ...prev,
        pickupSuburb: location.suburb || '',
        pickupPostcode: location.postcode,
        pickupState: location.state || '',
        pickupIsBusiness: location.is_business || false,
        pickupAddressLine1: location.address_line1 || '',
        pickupName: location.name || '',
        pickupCompany: location.company || '',
        pickupPhone: location.phone || '',
        pickupEmail: location.email || '',
      }));
      setSelectedPickupLocation(locationId);
    } else {
      setDeliveryDisplay(display);
      setFormData(prev => ({
        ...prev,
        deliverySuburb: location.suburb || '',
        deliveryPostcode: location.postcode,
        deliveryState: location.state || '',
        deliveryIsBusiness: location.is_business || false,
        deliveryAddressLine1: location.address_line1 || '',
        deliveryName: location.name || '',
        deliveryCompany: location.company || '',
        deliveryPhone: location.phone || '',
        deliveryEmail: location.email || '',
      }));
      setSelectedDeliveryLocation(locationId);
    }
  };

  const handleSavedItemSelect = (itemId: string, itemIndex: number) => {
    const savedItem = savedItems.find(item => item.id === itemId);
    if (!savedItem) return;

    const updatedItems = [...items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      name: savedItem.name,
      itemType: savedItem.type,
      weight: savedItem.weight,
      length: savedItem.length,
      width: savedItem.width,
      height: savedItem.height,
    };
    setItems(updatedItems);
  };

  const resetForm = () => {
    setPickupMode('new');
    setDeliveryMode('new');
    setSelectedPickupLocation('');
    setSelectedDeliveryLocation('');
    setPickupDisplay('');
    setDeliveryDisplay('');
    setFormData({
      pickupName: '',
      pickupCompany: '',
      pickupPhone: '',
      pickupEmail: user?.email || '',
      pickupAddressLine1: '',
      pickupSuburb: '',
      pickupPostcode: '',
      pickupState: '',
      pickupIsBusiness: false,
      deliveryName: '',
      deliveryCompany: '',
      deliveryPhone: '',
      deliveryEmail: '',
      deliveryAddressLine1: '',
      deliverySuburb: '',
      deliveryPostcode: '',
      deliveryState: '',
      deliveryIsBusiness: false,
      serviceType: 'Standard',
      referenceNumber: '',
    });
    setItems([
      {
        id: '1',
        itemType: '',
        quantity: 1,
        weight: 0,
        length: 0,
        width: 0,
        height: 0,
        name: '',
      },
    ]);
    setCalculatedPrice(null);
    setEstimatedEta(null);
    setError('');
  };

  useEffect(() => {
    if (quoteData) {
      setPickupDisplay(`${quoteData.pickupPostcode} ${quoteData.pickupSuburb || ''}`.trim());
      setDeliveryDisplay(`${quoteData.deliveryPostcode} ${quoteData.deliverySuburb || ''}`.trim());
      setFormData(prev => ({
        ...prev,
        pickupSuburb: quoteData.pickupSuburb || '',
        pickupPostcode: quoteData.pickupPostcode || '',
        pickupState: quoteData.pickupState || '',
        pickupIsBusiness: quoteData.pickupIsBusiness || false,
        deliverySuburb: quoteData.deliverySuburb || '',
        deliveryPostcode: quoteData.deliveryPostcode || '',
        deliveryState: quoteData.deliveryState || '',
        deliveryIsBusiness: quoteData.deliveryIsBusiness || false,
        serviceType: quoteData.serviceType || 'Standard',
        quoteId: quoteData.quoteId || '',
        pickupName: quoteData.pickupName || '',
        pickupPhone: quoteData.pickupPhone || '',
        pickupEmail: quoteData.pickupEmail || '',
        pickupAddressLine1: quoteData.pickupAddress || '',
        deliveryName: quoteData.deliveryName || '',
        deliveryPhone: quoteData.deliveryPhone || '',
        deliveryEmail: quoteData.deliveryEmail || '',
        deliveryAddressLine1: quoteData.deliveryAddress || '',
      }));
      setItems(quoteData.items.map(item => ({
        ...item,
        name: item.name || '',
      })));
      setCalculatedPrice(quoteData.estimatedPrice);
      setEstimatedEta(quoteData.estimatedEta || null);
    }
  }, [quoteData]);

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

  useEffect(() => {
    if (formData.pickupPostcode && formData.deliveryPostcode && items.length > 0) {
      const hasValidItems = items.every(item => item.weight > 0 && item.length > 0 && item.width > 0 && item.height > 0);
      if (hasValidItems) {
        calculateRate();
      }
    }
  }, [formData.pickupPostcode, formData.deliveryPostcode, items, formData.serviceType]);

  const calculateETA = (fromPostcode: string, toPostcode: string, serviceType: string): number => {
    const fromState = fromPostcode.charAt(0);
    const toState = toPostcode.charAt(0);

    if (serviceType === 'express') {
      return fromState === toState ? 1 : 2;
    } else {
      return fromState === toState ? 3 : 5;
    }
  };

  const calculateRate = async () => {
    if (!formData.pickupPostcode || !formData.deliveryPostcode) return;

    setFetchingRate(true);
    setError('');

    try {
      const rateResult = await calculateBulkShippingRate(
        formData.pickupPostcode,
        formData.deliveryPostcode,
        items.map(item => ({
          deadWeight: item.weight,
          length: item.length,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
        }))
      );

      if (!rateResult) {
        setError('Unable to calculate rate. Please check your postcode and item details.');
        setCalculatedPrice(null);
        setEstimatedEta(null);
        setTransitTime(null);
        setFetchingRate(false);
        return;
      }

      const fetchedTransitTime = await getTransitTimeFromPostcodes(
        formData.pickupPostcode,
        formData.deliveryPostcode,
        formData.serviceType === 'Express' ? 'express' : 'standard'
      );

      const eta = calculateETA(formData.pickupPostcode, formData.deliveryPostcode, formData.serviceType.toLowerCase());
      const finalRate = formData.serviceType === 'Express' ? rateResult.totalRate * 1.3 : rateResult.totalRate;

      setCalculatedPrice(finalRate);
      setEstimatedEta(eta);
      setTransitTime(fetchedTransitTime);
    } catch (err) {
      console.error('Error calculating rate:', err);
      setError('Failed to calculate shipping rate');
      setCalculatedPrice(null);
      setEstimatedEta(null);
      setTransitTime(null);
    } finally {
      setFetchingRate(false);
    }
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

  const handlePickupSuburbChange = async (value: string) => {
    setPickupDisplay(value);
    setPickupMode('new');
    setSelectedPickupLocation('');

    const parts = value.split(' ');
    const maybePostcode = parts.find(part => /^\d{4}$/.test(part));

    if (maybePostcode) {
      setFormData(prev => ({ ...prev, pickupPostcode: maybePostcode }));
    }

    if (value.length >= 2) {
      const suggestions = await searchPostcodes(value);
      setPickupSuggestions(suggestions);
      setShowPickupSuggestions(suggestions.length > 0);
    } else {
      setShowPickupSuggestions(false);
    }
  };

  const handleDeliverySuburbChange = async (value: string) => {
    setDeliveryDisplay(value);
    setDeliveryMode('new');
    setSelectedDeliveryLocation('');

    const parts = value.split(' ');
    const maybePostcode = parts.find(part => /^\d{4}$/.test(part));

    if (maybePostcode) {
      setFormData(prev => ({ ...prev, deliveryPostcode: maybePostcode }));
    }

    if (value.length >= 2) {
      const suggestions = await searchPostcodes(value);
      setDeliverySuggestions(suggestions);
      setShowDeliverySuggestions(suggestions.length > 0);
    } else {
      setShowDeliverySuggestions(false);
    }
  };

  const selectPickupSuggestion = (suggestion: PostcodeSuggestion) => {
    setPickupDisplay(`${suggestion.suburb.toUpperCase()}, ${suggestion.postcode}, ${suggestion.state}`);
    setFormData(prev => ({
      ...prev,
      pickupPostcode: suggestion.postcode,
      pickupSuburb: suggestion.suburb,
      pickupState: suggestion.state,
    }));
    setShowPickupSuggestions(false);
  };

  const selectDeliverySuggestion = (suggestion: PostcodeSuggestion) => {
    setDeliveryDisplay(`${suggestion.suburb.toUpperCase()}, ${suggestion.postcode}, ${suggestion.state}`);
    setFormData(prev => ({
      ...prev,
      deliveryPostcode: suggestion.postcode,
      deliverySuburb: suggestion.suburb,
      deliveryState: suggestion.state,
    }));
    setShowDeliverySuggestions(false);
  };

  const handleItemNameChange = (itemId: string, name: string) => {
    updateItem(itemId, 'name', name);

    if (name.trim().length > 0) {
      const filtered = savedItems.filter(item =>
        item.name.toLowerCase().includes(name.toLowerCase())
      );
      setItemNameSuggestions(prev => ({ ...prev, [itemId]: filtered }));
    } else {
      setItemNameSuggestions(prev => ({ ...prev, [itemId]: [] }));
    }
  };

  const selectSavedItemForField = (itemId: string, savedItem: SavedItem) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          name: savedItem.name,
          itemType: savedItem.type,
          weight: savedItem.weight,
          length: savedItem.length,
          width: savedItem.width,
          height: savedItem.height,
          quantity: 1
        };
      }
      return item;
    });
    setItems(updatedItems);
    setItemNameSuggestions(prev => ({ ...prev, [itemId]: [] }));
    setFocusedItemId(null);
  };

  const handlePickupLocationNameChange = (name: string) => {
    setFormData({ ...formData, pickupLocationName: name });

    if (name.trim().length > 0) {
      const filtered = savedLocations.filter(loc =>
        loc.name.toLowerCase().includes(name.toLowerCase())
      );
      setPickupLocationSuggestions(filtered);
      setShowPickupLocationSuggestions(filtered.length > 0);
    } else {
      setPickupLocationSuggestions([]);
      setShowPickupLocationSuggestions(false);
    }
  };

  const handleDeliveryLocationNameChange = (name: string) => {
    setFormData({ ...formData, deliveryLocationName: name });

    if (name.trim().length > 0) {
      const filtered = savedLocations.filter(loc =>
        loc.name.toLowerCase().includes(name.toLowerCase())
      );
      setDeliveryLocationSuggestions(filtered);
      setShowDeliveryLocationSuggestions(filtered.length > 0);
    } else {
      setDeliveryLocationSuggestions([]);
      setShowDeliveryLocationSuggestions(false);
    }
  };

  const selectPickupLocationFromSuggestion = (location: SavedLocation) => {
    setFormData(prev => ({
      ...prev,
      pickupLocationName: location.name,
      pickupName: location.contact_name || '',
      pickupPhone: location.phone || '',
      pickupEmail: location.email || '',
      pickupAddressLine1: location.address_line1 || '',
      pickupAddressLine2: location.address_line2 || '',
      pickupSuburb: location.suburb || '',
      pickupPostcode: location.postcode,
      pickupState: location.state || '',
      pickupInstructions: location.instructions || '',
      pickupIsBusiness: location.is_business || false,
    }));
    setPickupDisplay(`${location.suburb}, ${location.postcode}, ${location.state}`);
    setShowPickupLocationSuggestions(false);
  };

  const selectDeliveryLocationFromSuggestion = (location: SavedLocation) => {
    setFormData(prev => ({
      ...prev,
      deliveryLocationName: location.name,
      deliveryName: location.contact_name || '',
      deliveryPhone: location.phone || '',
      deliveryEmail: location.email || '',
      deliveryAddressLine1: location.address_line1 || '',
      deliveryAddressLine2: location.address_line2 || '',
      deliverySuburb: location.suburb || '',
      deliveryPostcode: location.postcode,
      deliveryState: location.state || '',
      deliveryInstructions: location.instructions || '',
      deliveryIsBusiness: location.is_business || false,
    }));
    setDeliveryDisplay(`${location.suburb}, ${location.postcode}, ${location.state}`);
    setShowDeliveryLocationSuggestions(false);
  };

  const addItem = () => {
    const newItem: BookingItem = {
      id: Date.now().toString(),
      itemType: 'Carton',
      quantity: 1,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      name: '',
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BookingItem, value: any) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Must be logged in to book');
      return;
    }

    if (!formData.pickupPostcode || !formData.deliveryPostcode) {
      setError('Please enter valid pickup and delivery suburbs');
      return;
    }

    if (!formData.pickupLocationName || !formData.deliveryLocationName) {
      setError('Pickup and delivery location names are required');
      return;
    }

    if (!formData.pickupAddressLine1 || !formData.deliveryAddressLine1) {
      setError('Pickup and delivery addresses are required');
      return;
    }

    if (!calculatedPrice) {
      setError('Please wait for price calculation');
      return;
    }

    const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    if (totalWeight > 25) {
      setError('Total weight cannot exceed 25kg. Please contact us for heavier shipments.');
      return;
    }

    localStorage.setItem('pendingBooking', JSON.stringify(formData));
    localStorage.setItem('pendingBookingItems', JSON.stringify(items));
    localStorage.setItem('pendingBookingPrice', calculatedPrice.toString());

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setLoading(true);
    setError('');

    try {
      if (!formData.quoteId) {
        throw new Error('Quote ID is required for booking');
      }

      const bookingPayload = {
        quoteId: formData.quoteId,
        reference: formData.referenceNumber || `NSJ-${Date.now()}`,
        shipper: {
          name: formData.pickupName,
          address: formData.pickupAddressLine1,
          city: formData.pickupSuburb,
          postcode: formData.pickupPostcode,
          phone: formData.pickupPhone,
          email: formData.pickupEmail || user?.email,
        },
        consignee: {
          name: formData.deliveryName,
          address: formData.deliveryAddressLine1,
          city: formData.deliverySuburb,
          postcode: formData.deliveryPostcode,
          phone: formData.deliveryPhone,
          email: formData.deliveryEmail,
        },
        items: items.map(item => ({
          weight: item.weight,
          length: item.length,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          description: item.name || item.itemType || 'General Goods',
        })),
        serviceType: formData.serviceType,
        paymentIntentId: paymentIntentId,
      };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/api-book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const insertedData = await response.json();

      try {
        const zapierWebhookUrl = import.meta.env.VITE_ZAPIER_WEBHOOK_URL;

        if (zapierWebhookUrl) {
          await fetch(zapierWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_number: formData.referenceNumber || `NSJ-${insertedData.id.substring(0, 8)}`,
              booking_id: insertedData.id,
              payment_status: 'paid',
              payment_intent_id: paymentIntentId,
              pickup_name: formData.pickupName,
              pickup_company: formData.pickupCompany,
              pickup_phone: formData.pickupPhone,
              pickup_email: formData.pickupEmail,
              pickup_address: formData.pickupAddressLine1,
              pickup_suburb: formData.pickupSuburb,
              pickup_postcode: formData.pickupPostcode,
              delivery_name: formData.deliveryName,
              delivery_company: formData.deliveryCompany,
              delivery_phone: formData.deliveryPhone,
              delivery_email: formData.deliveryEmail,
              delivery_address: formData.deliveryAddressLine1,
              delivery_suburb: formData.deliverySuburb,
              delivery_postcode: formData.deliveryPostcode,
              service_type: formData.serviceType,
              items: items,
              total_weight: totalWeight,
              estimated_price: calculatedPrice,
            }),
          });
        }
      } catch (webhookError) {
        console.error('Zapier webhook error:', webhookError);
      }

      localStorage.removeItem('pendingBooking');
      localStorage.removeItem('pendingBookingItems');
      localStorage.removeItem('pendingBookingPrice');

      setShowPaymentModal(false);
      resetForm();
      onClose();

      alert('Booking successful! You will receive a confirmation email shortly.');
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError(err.message || 'Failed to process booking');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen && !asPage) return null;

  const content = (
    <form onSubmit={handleSubmit} className={asPage ? "" : "p-6"}>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <h3 className="text-base font-semibold text-gray-900">Pickup Details</h3>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={formData.pickupLocationName}
                      onChange={(e) => handlePickupLocationNameChange(e.target.value)}
                      onFocus={() => {
                        if (formData.pickupLocationName && savedLocations.length > 0) {
                          const filtered = savedLocations.filter(loc =>
                            loc.name.toLowerCase().includes(formData.pickupLocationName.toLowerCase())
                          );
                          setPickupLocationSuggestions(filtered);
                          setShowPickupLocationSuggestions(filtered.length > 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowPickupLocationSuggestions(false), 200)}
                      placeholder="Enter location name or select saved..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    {showPickupLocationSuggestions && pickupLocationSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {pickupLocationSuggestions.map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => selectPickupLocationFromSuggestion(location)}
                            className="w-full px-4 py-2 text-left hover:bg-purple-50 transition border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">{location.name}</div>
                            <div className="text-sm text-gray-500">
                              {location.address_line1}, {location.suburb}, {location.state} {location.postcode}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.pickupName}
                      onChange={(e) => setFormData({ ...formData, pickupName: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.pickupPhone}
                        onChange={(e) => setFormData({ ...formData, pickupPhone: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.pickupEmail}
                        onChange={(e) => setFormData({ ...formData, pickupEmail: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Address 1 *
                      </label>
                      <input
                        type="text"
                        value={formData.pickupAddressLine1}
                        onChange={(e) => setFormData({ ...formData, pickupAddressLine1: e.target.value })}
                        placeholder="Street address"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Address 2
                      </label>
                      <input
                        type="text"
                        value={formData.pickupAddressLine2}
                        onChange={(e) => setFormData({ ...formData, pickupAddressLine2: e.target.value })}
                        placeholder="Apartment, suite, etc."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div ref={pickupRef} className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Suburb *
                    </label>
                    <input
                      type="text"
                      value={pickupDisplay}
                      onChange={(e) => handlePickupSuburbChange(e.target.value)}
                      onFocus={() => {
                        if (pickupDisplay) {
                          const suggestions = searchPostcodes(pickupDisplay);
                          setPickupSuggestions(suggestions);
                          setShowPickupSuggestions(suggestions.length > 0);
                        }
                      }}
                      placeholder="e.g., 3000 Melbourne or Melbourne"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {pickupSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectPickupSuggestion(suggestion)}
                            className="w-full px-4 py-2 text-left hover:bg-purple-50 transition"
                          >
                            <div className="font-medium text-gray-900">
                              {suggestion.postcode} {suggestion.suburb}
                            </div>
                            <div className="text-sm text-gray-500">{suggestion.state}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Instructions
                    </label>
                    <textarea
                      value={formData.pickupInstructions}
                      onChange={(e) => setFormData({ ...formData, pickupInstructions: e.target.value })}
                      placeholder="Delivery instructions, gate codes, etc."
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Address Type *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pickupIsBusiness: false })}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                          !formData.pickupIsBusiness
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Residential
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pickupIsBusiness: true })}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                          formData.pickupIsBusiness
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Business
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">Delivery Details</h3>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryLocationName}
                      onChange={(e) => handleDeliveryLocationNameChange(e.target.value)}
                      onFocus={() => {
                        if (formData.deliveryLocationName && savedLocations.length > 0) {
                          const filtered = savedLocations.filter(loc =>
                            loc.name.toLowerCase().includes(formData.deliveryLocationName.toLowerCase())
                          );
                          setDeliveryLocationSuggestions(filtered);
                          setShowDeliveryLocationSuggestions(filtered.length > 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowDeliveryLocationSuggestions(false), 200)}
                      placeholder="Enter location name or select saved..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    {showDeliveryLocationSuggestions && deliveryLocationSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {deliveryLocationSuggestions.map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => selectDeliveryLocationFromSuggestion(location)}
                            className="w-full px-4 py-2 text-left hover:bg-purple-50 transition border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">{location.name}</div>
                            <div className="text-sm text-gray-500">
                              {location.address_line1}, {location.suburb}, {location.state} {location.postcode}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryName}
                      onChange={(e) => setFormData({ ...formData, deliveryName: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.deliveryPhone}
                        onChange={(e) => setFormData({ ...formData, deliveryPhone: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.deliveryEmail}
                        onChange={(e) => setFormData({ ...formData, deliveryEmail: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Address 1 *
                      </label>
                      <input
                        type="text"
                        value={formData.deliveryAddressLine1}
                        onChange={(e) => setFormData({ ...formData, deliveryAddressLine1: e.target.value })}
                        placeholder="Street address"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Address 2
                      </label>
                      <input
                        type="text"
                        value={formData.deliveryAddressLine2}
                        onChange={(e) => setFormData({ ...formData, deliveryAddressLine2: e.target.value })}
                        placeholder="Apartment, suite, etc."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div ref={deliveryRef} className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Suburb *
                    </label>
                    <input
                      type="text"
                      value={deliveryDisplay}
                      onChange={(e) => handleDeliverySuburbChange(e.target.value)}
                      onFocus={() => {
                        if (deliveryDisplay) {
                          const suggestions = searchPostcodes(deliveryDisplay);
                          setDeliverySuggestions(suggestions);
                          setShowDeliverySuggestions(suggestions.length > 0);
                        }
                      }}
                      placeholder="e.g., 3000 Melbourne or Melbourne"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    {showDeliverySuggestions && deliverySuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {deliverySuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectDeliverySuggestion(suggestion)}
                            className="w-full px-4 py-2 text-left hover:bg-purple-50 transition"
                          >
                            <div className="font-medium text-gray-900">
                              {suggestion.postcode} {suggestion.suburb}
                            </div>
                            <div className="text-sm text-gray-500">{suggestion.state}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Instructions
                    </label>
                    <textarea
                      value={formData.deliveryInstructions}
                      onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                      placeholder="Delivery instructions, gate codes, etc."
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Address Type *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deliveryIsBusiness: false })}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                          !formData.deliveryIsBusiness
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Residential
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deliveryIsBusiness: true })}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
                          formData.deliveryIsBusiness
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Business
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Package Items</h3>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="mb-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="relative">
                      <div className="grid grid-cols-[2fr,1.5fr,1fr,1fr,1fr,1fr,0.8fr,auto] gap-2 items-end">
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item Type
                          </label>
                          <select
                            value={item.itemType}
                            onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            required
                          >
                            <option value="">Select...</option>
                            {ITEM_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Length cm
                          </label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Width cm
                          </label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Height cm
                          </label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Weight kg
                          </label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
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

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="Your reference number"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {calculatedPrice !== null && (
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-purple-700 font-medium mb-1">Estimated Cost</div>
                      <div className="text-3xl font-bold text-purple-900">
                        ${calculatedPrice.toFixed(2)}
                      </div>
                      {(transitTime || estimatedEta) && (
                        <div className="text-sm text-purple-700 mt-2">
                          Transit Time: {transitTime || `${estimatedEta} business days`}
                        </div>
                      )}
                    </div>
                    <Package className="w-12 h-12 text-purple-600 opacity-50" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || fetchingRate || !calculatedPrice}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
  );

  if (asPage) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Job</h1>
        </div>
        <div>
          {content}
        </div>
        {showPaymentModal && calculatedPrice && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            amount={calculatedPrice}
            customerEmail={formData.pickupEmail || user?.email}
            onPaymentSuccess={handlePaymentSuccess}
            bookingData={{
              ...formData,
              items: items,
              calculatedPrice: calculatedPrice,
              transitTime: transitTime,
              estimatedEta: estimatedEta
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-gray-900">Create Job</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>

      {showPaymentModal && calculatedPrice && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={calculatedPrice}
          customerEmail={formData.pickupEmail || user?.email}
          onPaymentSuccess={handlePaymentSuccess}
          bookingData={{
            ...formData,
            items: items,
            calculatedPrice: calculatedPrice,
            transitTime: transitTime,
            estimatedEta: estimatedEta
          }}
        />
      )}
    </>
  );
}
