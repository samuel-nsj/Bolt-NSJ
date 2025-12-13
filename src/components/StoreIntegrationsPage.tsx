import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Clock, X, Check, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import WebhookSetupModal from './WebhookSetupModal';
import ShopifyOrderModal from './ShopifyOrderModal';

interface Platform {
  id: string;
  name: string;
  logo: string;
  zapierUrl: string;
}

interface Integration {
  id: string;
  platform: string;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  connected_at: string | null;
  store_name: string | null;
}

const PLATFORMS: Platform[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    logo: '/shopify (1).png',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8sbfow/',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    logo: '/Woo.png',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8fjb7q/',
  },
  {
    id: 'neto',
    name: 'Neto',
    logo: '/Neto.png',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8sbfow/',
  },
  {
    id: 'pronto',
    name: 'Pronto',
    logo: '/pronto.jpg',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8sbfow/',
  },
  {
    id: 'oracle',
    name: 'Oracle NetSuite',
    logo: '/oracle.png',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8sbfow/',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Dynamics',
    logo: '/Microsoft.jpg',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8sbfow/',
  },
  {
    id: 'wms',
    name: 'WMS',
    logo: '/wms.png',
    zapierUrl: 'https://hooks.zapier.com/hooks/catch/25155687/u8sbfow/',
  },
];

export default function StoreIntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [showShopifyOrderModal, setShowShopifyOrderModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnPlatform = params.get('return');
    const zapId = params.get('zap_id');

    if (returnPlatform && user) {
      handleZapierReturn(returnPlatform, zapId);
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZapierReturn = async (platform: string, zapId: string | null) => {
    try {
      const { data: existing } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('platform', platform.toLowerCase())
        .maybeSingle();

      const updateData: any = {
        status: 'connected',
        connected_at: new Date().toISOString(),
      };

      if (zapId) {
        updateData.zap_link = zapId;
      }

      if (existing) {
        await supabase
          .from('integrations')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('integrations')
          .insert({
            user_id: user?.id,
            platform: platform.toLowerCase(),
            ...updateData,
          });
      }

      await loadIntegrations();

      const platformName = PLATFORMS.find(p => p.id === platform.toLowerCase())?.name || platform;
      setSuccessBanner(`Your ${platformName} store is now connected.`);

      setTimeout(() => setSuccessBanner(null), 8000);

      window.history.replaceState({}, '', '/dashboard/integrations');
    } catch (error) {
      console.error('Error updating integration:', error);
    }
  };

  const handleConnectClick = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowModal(true);
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      await supabase
        .from('integrations')
        .update({
          status: 'disconnected',
        })
        .eq('id', integrationId);

      await loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const getIntegrationStatus = (platformId: string) => {
    return integrations.find(
      (i) => i.platform === platformId && i.status === 'connected'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Integrations
          </h1>
          <p className="text-gray-600">
            Connect your online store to NSJ Express and automate your fulfilment.
          </p>
        </div>

        {successBanner && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between animate-fade-in">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <Check className="h-5 w-5 text-white" />
              </div>
              <p className="text-green-800 font-medium">{successBanner}</p>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <ShoppingBag className="h-6 w-6 text-purple-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                How It Works
              </h3>
              <ol className="text-purple-800 space-y-2 text-sm">
                <li>1. Click "Connect" on your platform below</li>
                <li>2. Follow the instructions to add our webhook to your store</li>
                <li>3. New orders will automatically flow to NSJ Express for fulfillment</li>
                <li>4. Tracking numbers sync back to your store automatically</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLATFORMS.map((platform) => {
            const integration = getIntegrationStatus(platform.id);
            const isConnected = !!integration;

            return (
              <div
                key={platform.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-center mb-4 h-20">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 text-center mb-3">
                    {platform.name}
                  </h3>

                  <div className="flex-grow"></div>

                  <div className="mb-4">
                    {isConnected ? (
                      <div className="flex items-center justify-center text-sm">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-700 font-medium">
                          Connected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-sm">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-500 font-medium">
                          Not Connected
                        </span>
                      </div>
                    )}
                  </div>

                  {isConnected ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed font-medium text-sm"
                      title="Your store is linked via Zapier"
                    >
                      Connected
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectClick(platform)}
                      className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {integrations.filter((i) => i.status === 'connected').length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.filter((i) => i.status === 'connected').map((integration) => {
                const platform = PLATFORMS.find(p => p.id === integration.platform);
                if (!platform) return null;

                return (
                  <div key={integration.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={platform.logo}
                        alt={platform.name}
                        className="h-8 w-8 object-contain"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                        <p className="text-xs text-gray-500">Create manual order</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowShopifyOrderModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Create Order
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {integrations.filter((i) => i.status === 'connected').length === 0 && (
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 max-w-2xl mx-auto">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No stores connected yet
              </h3>
              <p className="text-gray-600 mb-6">
                Connect your first store to start automating your shipments
              </p>
            </div>
          </div>
        )}
      </div>

      {showModal && selectedPlatform && (
        <WebhookSetupModal
          platform={selectedPlatform}
          onClose={() => {
            setShowModal(false);
            setSelectedPlatform(null);
          }}
          userId={user?.id || ''}
        />
      )}

      {showShopifyOrderModal && (
        <ShopifyOrderModal
          onClose={() => setShowShopifyOrderModal(false)}
          onSuccess={() => {
            setSuccessBanner('Order created and sent to Shopify successfully!');
            setTimeout(() => setSuccessBanner(null), 8000);
          }}
        />
      )}
    </div>
  );
}
