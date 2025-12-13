import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth';
import { supabase, Booking, UserProfile, PaymentMethod, SavedLocation, SavedItem } from '../lib/supabase';
import { LogOut, Plus, ArrowRight, Home, Search, Edit2, Save, X, FileText, Download, Package, Loader2, MapPin, Trash2 } from 'lucide-react';
import Sidebar from './Sidebar';
import TrackingModal from './TrackingModal';
import Chatbot from './Chatbot';
import Analytics from './Analytics';
import ShippingLabel from './ShippingLabel';
import BulkBooking from './BulkBooking';
import ShopifyIntegration from './ShopifyIntegration';
import SavedLocationModal from './SavedLocationModal';
import SavedItemModal from './SavedItemModal';
import IntegrationsPage from './IntegrationsPage';
import StoreIntegrationsPage from './StoreIntegrationsPage';
import QuoteCalculator from './QuoteCalculator';
import QuoteModal from './QuoteModal';
import SavedQuotes from './SavedQuotes';
import BookingModal from './BookingModal';
import PaymentModal from './PaymentModal';

interface DashboardProps {
  onBookClick: () => void;
  onBackToHome: () => void;
  onBookWithQuote?: (quoteData: any) => void;
  showPaymentSuccess?: boolean;
}

export default function Dashboard({ onBookClick, onBackToHome, onBookWithQuote, showPaymentSuccess }: DashboardProps) {
  const { user, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingQuoteData, setEditingQuoteData] = useState<any>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(showPaymentSuccess || false);

  useEffect(() => {
    if (showPaymentSuccess) {
      setShowSuccessBanner(true);
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentSuccess]);

  useEffect(() => {
    if (activeTab === 'quick-quote') {
      setQuoteModalOpen(true);
    }
  }, [activeTab]);
  const [bulkBookingOpen, setBulkBookingOpen] = useState(false);
  const [selectedLabelBooking, setSelectedLabelBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    default_pickup_address: '',
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
    loadProfile();
    loadPaymentMethods();
    loadSavedLocations();
    loadSavedItems();
    loadIntegrations();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile(data);
        setProfileForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          default_pickup_address: data.default_pickup_address || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadIntegrations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .order('connected_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      const profileData = {
        id: user.id,
        ...profileForm,
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert([profileData]);

      if (error) throw error;

      await loadProfile();
      setEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const addPaymentMethod = async () => {
    if (!user) return;

    try {
      const lastFour = newCardForm.cardNumber.replace(/\s/g, '').slice(-4);
      const cardBrand = detectCardBrand(newCardForm.cardNumber);

      const { error } = await supabase
        .from('payment_methods')
        .insert([{
          user_id: user.id,
          card_brand: cardBrand,
          last_four: lastFour,
          expiry_month: newCardForm.expiryMonth,
          expiry_year: newCardForm.expiryYear,
          cardholder_name: newCardForm.cardholderName,
          is_default: paymentMethods.length === 0,
        }]);

      if (error) throw error;

      await loadPaymentMethods();
      setShowAddCard(false);
      setNewCardForm({
        cardholderName: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
    }
  };

  const detectCardBrand = (cardNumber: string): string => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';
    return 'visa';
  };

  const setDefaultPaymentMethod = async (id: string) => {
    if (!user) return;

    try {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      await loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  const loadSavedLocations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSavedLocations(data || []);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  };

  const deleteSavedLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_locations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadSavedLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const loadSavedItems = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false});
      if (error) throw error;
      setSavedItems(data || []);
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const deleteSavedItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadSavedItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      confirmed: 'bg-purple-50 text-purple-700 border-purple-200',
      in_transit: 'bg-purple-50 text-purple-700 border-purple-200',
      delivered: 'bg-green-50 text-green-700 border-green-200',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getProgressSteps = (status: string) => {
    const steps = ['Booked', 'Pickup', 'In Transit', 'Delivered'];
    const currentStep = {
      pending: 0,
      confirmed: 1,
      in_transit: 2,
      delivered: 3,
    }[status] || 0;

    return { steps, currentStep };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
        <div className="px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="/NSJ Express Logo (Socials Profile Pic).png"
                alt="NSJ Express"
                className="h-20 w-auto"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onCreateJob={onBookClick} />

      <main className="ml-64 pt-16">
        <div className="p-8">
          {showSuccessBanner && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6 flex items-center justify-between animate-scale-in">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Payment Successful!</h3>
                  <p className="text-green-700">Your booking has been confirmed and sent to our system.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessBanner(false)}
                className="text-green-700 hover:text-green-900 p-2 rounded-lg hover:bg-green-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && <Analytics />}

          {activeTab === 'shipments' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
                  <p className="text-gray-600 mt-1">Manage and track all your deliveries</p>
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading shipments...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No shipments yet</h3>
                  <p className="text-gray-600 mb-6">Create your first shipment to get started</p>
                  <button
                    onClick={onBookClick}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Create Shipment
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          From → To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map((booking) => {
                        const { steps, currentStep } = getProgressSteps(booking.status);
                        return (
                          <tr key={booking.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(booking.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs">
                                <p className="font-medium truncate">{booking.pickup_address}</p>
                                <p className="text-gray-500 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="truncate">{booking.delivery_address}</span>
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <p className="font-medium text-gray-900">{booking.customer_name}</p>
                              <p className="text-gray-500 text-xs">{booking.customer_email}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(booking.status)}`}>
                                  {booking.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {booking.payment_status && (
                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                                    booking.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                    booking.payment_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}>
                                    {booking.payment_status === 'paid' ? '✓ PAID' : 'PAYMENT PENDING'}
                                  </span>
                                )}
                                <div className="flex gap-1">
                                  {steps.map((_, index) => (
                                    <div
                                      key={index}
                                      className={`h-1 w-8 rounded-full ${
                                        index <= currentStep ? 'bg-purple-600' : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="space-y-1">
                                <p>{booking.package_weight}kg</p>
                                <p className="text-xs text-gray-500">${booking.estimated_price?.toFixed(2) || '0.00'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedLabelBooking(booking)}
                                  className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                  title="Download Label"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button className="text-purple-600 hover:text-purple-700 font-medium">
                                  View Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'dashboard' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-2">Active Shipments</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {bookings.filter(b => b.status !== 'delivered' && b.status !== 'cancelled').length}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 bg-gradient-to-br from-purple-50 to-purple-100">
                  <p className="text-sm text-gray-600 mb-2">Completed Shipments ({new Date().toLocaleString('default', { month: 'long' })})</p>
                  <p className="text-4xl font-bold text-purple-600">
                    {bookings.filter(b => {
                      const bookingDate = new Date(b.created_at);
                      const now = new Date();
                      return b.status === 'delivered' &&
                             bookingDate.getMonth() === now.getMonth() &&
                             bookingDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Spend ({new Date().toLocaleString('default', { month: 'long' })})</p>
                  <p className="text-4xl font-bold text-gray-900">
                    ${bookings.filter(b => {
                      const bookingDate = new Date(b.created_at);
                      const now = new Date();
                      return bookingDate.getMonth() === now.getMonth() &&
                             bookingDate.getFullYear() === now.getFullYear();
                    }).reduce((sum, b) => sum + (b.estimated_price || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create-job' && (
            <BookingModal
              isOpen={true}
              onClose={() => {}}
              asPage={true}
            />
          )}

          {activeTab === 'quick-quote' && (
            <div></div>
          )}

          {activeTab === 'saved-quotes' && (
            <SavedQuotes
              onBookQuote={(quoteData) => {
                if (onBookWithQuote) {
                  onBookWithQuote(quoteData);
                } else {
                  onBookClick();
                }
              }}
              onEditQuote={(quoteData) => {
                setEditingQuoteData(quoteData);
                setQuoteModalOpen(true);
              }}
            />
          )}

          {activeTab === 'tracking' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">All Consignments</h1>
                <button
                  onClick={() => setTrackingModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:shadow-lg transition font-semibold text-sm"
                >
                  <Search className="w-4 h-4" />
                  Search Tracking Number
                </button>
              </div>

              {loading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Loading consignments...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Shipments Yet</h3>
                  <p className="text-gray-600 mb-6">Create your first shipment to see it here</p>
                  <button
                    onClick={onBookClick}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Create Shipment
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tracking ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          From → To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Package
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map((booking) => {
                        const { steps, currentStep } = getProgressSteps(booking.status);
                        return (
                          <tr key={booking.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                              {booking.tracking_number || `NSJ-${booking.id.substring(0, 8)}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(booking.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs">
                                <p className="font-medium truncate">{booking.pickup_address}</p>
                                <p className="text-gray-500 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="truncate">{booking.delivery_address}</span>
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(booking.status)}`}>
                                  {booking.status.replace('_', ' ').toUpperCase()}
                                </span>
                                <div className="flex gap-1">
                                  {steps.map((_, index) => (
                                    <div
                                      key={index}
                                      className={`h-1 w-8 rounded-full ${
                                        index <= currentStep ? 'bg-purple-600' : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="space-y-1">
                                <p>{booking.package_weight}kg</p>
                                <p className="text-xs text-gray-500">{booking.service_type || 'Standard'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {booking.label_url && (
                                <button
                                  onClick={() => setSelectedLabelBooking(booking)}
                                  className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                                >
                                  <Download className="w-4 h-4" />
                                  Label
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved-locations' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Saved Locations</h1>
                <button
                  onClick={() => {
                    setEditingLocation(null);
                    setShowAddLocation(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:shadow-lg transition font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Location
                </button>
              </div>

              {savedLocations.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Locations</h3>
                  <p className="text-gray-600 mb-6">Save frequently used pickup and delivery addresses for faster booking</p>
                  <button
                    onClick={() => setShowAddLocation(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Location
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedLocations.map((location) => (
                    <div key={location.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-[2fr,1.5fr,1fr,1fr,2fr,1.5fr,1fr,1fr,auto] gap-3 items-center">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Location Name</div>
                          <div className="font-semibold text-sm text-gray-900">{location.name}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Contact Name</div>
                          <div className="text-sm text-gray-900">{location.contact_name || '-'}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Phone</div>
                          <div className="text-sm text-gray-900">{location.phone || '-'}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Email</div>
                          <div className="text-sm text-gray-900 truncate">{location.email || '-'}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Address</div>
                          <div className="text-sm text-gray-900">
                            {location.address_line1}
                            {location.address_line2 && <span>, {location.address_line2}</span>}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Suburb</div>
                          <div className="text-sm text-gray-900">{location.suburb}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Type</div>
                          <div className="text-sm text-gray-900">{location.is_business ? 'Business' : 'Residential'}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Use For</div>
                          <div className="flex gap-1">
                            {location.is_pickup && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                                Pickup
                              </span>
                            )}
                            {location.is_delivery && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                Delivery
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingLocation(location);
                              setShowAddLocation(true);
                            }}
                            className="text-purple-600 hover:text-purple-700 p-1"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSavedLocation(location.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved-items' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Saved Items</h1>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddItem(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:shadow-lg transition font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Item
                </button>
              </div>

              {savedItems.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Items</h3>
                  <p className="text-gray-600 mb-6">Save frequently shipped items with dimensions and weight for faster booking</p>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Item
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-[2fr,1fr,1fr,2fr,2fr,auto] gap-3 items-center">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Item Name</div>
                          <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Type</div>
                          <div className="text-sm text-gray-900 capitalize">{item.type}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Weight</div>
                          <div className="text-sm text-gray-900">{item.weight} kg</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Dimensions (L × W × H)</div>
                          <div className="text-sm text-gray-900">{item.length} × {item.width} × {item.height} cm</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Description</div>
                          <div className="text-sm text-gray-900 truncate">{item.description || '-'}</div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowAddItem(true);
                            }}
                            className="text-purple-600 hover:text-purple-700 p-1"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSavedItem(item.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Payment Methods</h1>

              <div className="grid gap-6 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Methods</h2>

                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-8 rounded flex items-center justify-center ${
                            method.card_brand === 'visa' ? 'bg-gradient-to-r from-purple-600 to-purple-400' :
                            method.card_brand === 'mastercard' ? 'bg-gradient-to-r from-red-600 to-orange-500' :
                            'bg-gradient-to-r from-green-600 to-teal-500'
                          }`}>
                            <span className="text-white font-bold text-xs uppercase">{method.card_brand}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">•••• •••• •••• {method.last_four}</p>
                            <p className="text-sm text-gray-500">Expires {method.expiry_month}/{method.expiry_year}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.is_default ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Default</span>
                          ) : (
                            <button
                              onClick={() => setDefaultPaymentMethod(method.id)}
                              className="px-3 py-1 border border-gray-300 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-50"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => deletePaymentMethod(method.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {paymentMethods.length === 0 && !showAddCard && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-4">No payment methods saved</p>
                      </div>
                    )}

                    {showAddCard ? (
                      <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                        <h3 className="font-semibold text-gray-900 mb-4">Add New Card</h3>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Cardholder Name"
                            value={newCardForm.cardholderName}
                            onChange={(e) => setNewCardForm({ ...newCardForm, cardholderName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="Card Number"
                            value={newCardForm.cardNumber}
                            onChange={(e) => {
                              const formatted = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                              setNewCardForm({ ...newCardForm, cardNumber: formatted.slice(0, 19) });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                          />
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="MM"
                              value={newCardForm.expiryMonth}
                              onChange={(e) => setNewCardForm({ ...newCardForm, expiryMonth: e.target.value.slice(0, 2) })}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="YYYY"
                              value={newCardForm.expiryYear}
                              onChange={(e) => setNewCardForm({ ...newCardForm, expiryYear: e.target.value.slice(0, 4) })}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="CVV"
                              value={newCardForm.cvv}
                              onChange={(e) => setNewCardForm({ ...newCardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowAddCard(false);
                                setNewCardForm({ cardholderName: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '' });
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={addPaymentMethod}
                              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                            >
                              Save Card
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddCard(true)}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-400 hover:bg-purple-50 transition text-gray-600 hover:text-purple-600 font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add New Payment Method
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Invoices</h2>

                  <div className="space-y-3">
                    {bookings
                      .filter(b => b.payment_status === 'paid' && b.xero_invoice_number)
                      .slice(0, 5)
                      .map((booking) => (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-medium text-gray-900">Invoice #{booking.xero_invoice_number}</p>
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Paid</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {new Date(booking.paid_at || booking.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">${booking.payment_amount?.toFixed(2) || booking.estimated_price?.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 capitalize">{booking.payment_method || 'N/A'}</p>
                          </div>
                        </div>
                      ))}

                    {bookings.filter(b => b.payment_status === 'paid').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No invoices yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Payments</h2>

                  <div className="space-y-3">
                    {bookings
                      .filter(b => b.payment_status === 'pending')
                      .map((booking) => (
                        <div key={booking.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-medium text-gray-900">
                                {booking.xero_invoice_number ? `Invoice #${booking.xero_invoice_number}` : `Booking #${booking.id.slice(0, 8)}`}
                              </p>
                              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded">Pending</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              ${(booking.estimated_price || booking.payment_amount || booking.item_value || 0).toFixed(2)}
                            </p>
                            <button
                              onClick={() => {
                                console.log('Booking data:', booking);
                                console.log('Price:', booking.estimated_price || booking.payment_amount || booking.item_value || 0);
                                setSelectedPaymentBooking(booking);
                                setPaymentModalOpen(true);
                              }}
                              className="mt-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition font-medium"
                            >
                              Pay Now
                            </button>
                          </div>
                        </div>
                      ))}

                    {bookings.filter(b => b.payment_status === 'pending').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No pending payments</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Billing Summary</h3>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Paid</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${bookings
                          .filter(b => b.payment_status === 'paid')
                          .reduce((sum, b) => sum + (b.payment_amount || b.estimated_price || 0), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        ${bookings
                          .filter(b => b.payment_status === 'pending')
                          .reduce((sum, b) => sum + (b.estimated_price || 0), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Integrations</h1>
              <ShopifyIntegration />
            </div>
          )}

          {activeTab === 'help-support' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Help & Support</h1>
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <p className="text-gray-600 mb-4">Need assistance? We're here to help!</p>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-1">Email Support</p>
                    <p className="text-sm text-gray-600">support@nsjexpress.com.au</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-1">Phone Support</p>
                    <p className="text-sm text-gray-600">(03) 4159 0619</p>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-1">Live Chat</p>
                    <p className="text-sm text-gray-600 mb-3">Get instant answers to common questions</p>
                    <p className="text-xs text-gray-500">Look for the chat icon in the bottom right corner</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-profile' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                {!editingProfile ? (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProfile(false);
                        loadProfile();
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-8">
                {editingProfile ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email (Read-only)</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name (Optional)</label>
                      <input
                        type="text"
                        value={profileForm.company_name}
                        onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        placeholder="My Company Ltd"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Pickup Address (Optional)</label>
                      <input
                        type="text"
                        value={profileForm.default_pickup_address}
                        onChange={(e) => setProfileForm({ ...profileForm, default_pickup_address: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        placeholder="123 Main Street, City, State, Postcode"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="text-lg font-medium text-gray-900">{user?.email}</p>
                    </div>
                    {userProfile?.full_name && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Full Name</p>
                        <p className="text-lg font-medium text-gray-900">{userProfile.full_name}</p>
                      </div>
                    )}
                    {userProfile?.phone && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                        <p className="text-lg font-medium text-gray-900">{userProfile.phone}</p>
                      </div>
                    )}
                    {userProfile?.company_name && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Company Name</p>
                        <p className="text-lg font-medium text-gray-900">{userProfile.company_name}</p>
                      </div>
                    )}
                    {userProfile?.default_pickup_address && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Default Pickup Address</p>
                        <p className="text-lg font-medium text-gray-900 whitespace-pre-line">{userProfile.default_pickup_address}</p>
                      </div>
                    )}
                    {userProfile?.default_delivery_address && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Default Delivery Address</p>
                        <p className="text-lg font-medium text-gray-900">{userProfile.default_delivery_address}</p>
                      </div>
                    )}
                    {!userProfile && (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">No profile information yet</p>
                        <button
                          onClick={() => setEditingProfile(true)}
                          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                        >
                          Complete Your Profile
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <StoreIntegrationsPage />
          )}
        </div>
      </main>

      <TrackingModal isOpen={trackingModalOpen} onClose={() => setTrackingModalOpen(false)} />
      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => {
          setQuoteModalOpen(false);
          setEditingQuoteData(null);
          if (activeTab === 'quick-quote') {
            setActiveTab('dashboard');
          }
        }}
        onGetQuote={() => {
          setQuoteModalOpen(false);
          onBookClick();
        }}
        onBookJob={(quoteData) => {
          setQuoteModalOpen(false);
          if (onBookWithQuote) {
            onBookWithQuote(quoteData);
          } else {
            onBookClick();
          }
        }}
        initialQuoteData={editingQuoteData}
      />
      <Chatbot />

      {bulkBookingOpen && (
        <BulkBooking
          onClose={() => setBulkBookingOpen(false)}
          onSubmit={async (bulkBookings) => {
            console.log('Processing bulk bookings:', bulkBookings);
          }}
        />
      )}

      {selectedLabelBooking && (
        <ShippingLabel
          booking={selectedLabelBooking}
          onClose={() => setSelectedLabelBooking(null)}
        />
      )}

      <SavedLocationModal
        isOpen={showAddLocation}
        onClose={() => {
          setShowAddLocation(false);
          setEditingLocation(null);
        }}
        onSuccess={loadSavedLocations}
        location={editingLocation}
      />

      <SavedItemModal
        isOpen={showAddItem}
        onClose={() => {
          setShowAddItem(false);
          setEditingItem(null);
        }}
        onSuccess={loadSavedItems}
        item={editingItem}
      />

      {selectedPaymentBooking && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPaymentBooking(null);
          }}
          amount={selectedPaymentBooking.estimated_price || selectedPaymentBooking.payment_amount || selectedPaymentBooking.item_value || 0}
          customerEmail={selectedPaymentBooking.customer_email}
          bookingData={{
            pickupName: selectedPaymentBooking.pickup_contact_name,
            pickupEmail: selectedPaymentBooking.customer_email,
            pickupPhone: selectedPaymentBooking.customer_phone,
            pickupCompany: '',
            pickupAddress: selectedPaymentBooking.pickup_address,
            pickupSuburb: selectedPaymentBooking.pickup_suburb,
            pickupState: selectedPaymentBooking.pickup_state,
            pickupPostcode: selectedPaymentBooking.pickup_postcode,
            pickupCountry: selectedPaymentBooking.pickup_country,
            deliveryName: selectedPaymentBooking.customer_name,
            deliveryEmail: selectedPaymentBooking.customer_email,
            deliveryPhone: selectedPaymentBooking.customer_phone,
            deliveryCompany: '',
            deliveryAddress: selectedPaymentBooking.delivery_address,
            deliverySuburb: selectedPaymentBooking.delivery_suburb,
            deliveryState: selectedPaymentBooking.delivery_state,
            deliveryPostcode: selectedPaymentBooking.delivery_postcode,
            deliveryCountry: selectedPaymentBooking.delivery_country,
            items: [{
              weight: selectedPaymentBooking.package_weight,
              length: selectedPaymentBooking.package_length,
              width: selectedPaymentBooking.package_width,
              height: selectedPaymentBooking.package_height,
              quantity: selectedPaymentBooking.quantity || 1
            }]
          }}
          onPaymentSuccess={() => {
            setPaymentModalOpen(false);
            setSelectedPaymentBooking(null);
            loadBookings();
          }}
        />
      )}
    </div>
  );
}
