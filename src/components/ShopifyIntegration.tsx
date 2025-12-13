import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Check, X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';

interface ShopifyStore {
  id: string;
  shop_domain: string;
  shop_name: string;
  shop_email: string;
  auto_create_bookings: boolean;
  default_pickup_address: string;
  is_active: boolean;
  installed_at: string;
}

export default function ShopifyIntegration() {
  const { user } = useAuth();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [shopUrl, setShopUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadStores();
    }
  }, [user]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .order('installed_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!shopUrl) return;

    const cleanShopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shop = cleanShopUrl.includes('.myshopify.com')
      ? cleanShopUrl
      : `${cleanShopUrl}.myshopify.com`;

    const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-oauth-callback`;
    const scopes = 'read_orders,write_orders,read_shipping,write_shipping,read_fulfillments,write_fulfillments';

    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${import.meta.env.VITE_SHOPIFY_API_KEY}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `state=${user?.id}`;

    window.location.href = authUrl;
  };

  const toggleAutoBooking = async (storeId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('shopify_stores')
        .update({ auto_create_bookings: !currentValue })
        .eq('id', storeId);

      if (error) throw error;
      loadStores();
    } catch (error) {
      console.error('Error updating store:', error);
    }
  };

  const disconnectStore = async (storeId: string) => {
    if (!confirm('Are you sure you want to disconnect this store?')) return;

    try {
      const { error } = await supabase
        .from('shopify_stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;
      loadStores();
    } catch (error) {
      console.error('Error disconnecting store:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shopify Integration</h2>
          <p className="text-gray-600 mt-1">Connect unlimited Shopify stores</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Plus className="w-5 h-5" />
          Connect Store
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No stores connected</h3>
          <p className="text-gray-600 mb-6">Connect your first Shopify store to start automating shipping</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Connect Your First Store
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map((store) => (
            <div key={store.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{store.shop_name || store.shop_domain}</h3>
                    <p className="text-sm text-gray-600">{store.shop_domain}</p>
                    <p className="text-xs text-gray-500 mt-1">Connected {new Date(store.installed_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {store.is_active ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      <X className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Auto-create bookings</p>
                    <p className="text-xs text-gray-600">Automatically create shipments for new orders</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={store.auto_create_bookings}
                    onChange={() => toggleAutoBooking(store.id, store.auto_create_bookings)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => disconnectStore(store.id)}
                  className="text-sm text-red-600 hover:text-red-700 transition"
                >
                  Disconnect Store
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Connect Shopify Store</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store URL
                </label>
                <input
                  type="text"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  placeholder="mystore.myshopify.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Shopify store URL (e.g., mystore.myshopify.com)
                </p>
              </div>

              <button
                onClick={handleConnect}
                disabled={!shopUrl}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
