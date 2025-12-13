import { useState, useEffect } from 'react';
import { Check, Loader2, ExternalLink, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';

interface Platform {
  id: string;
  name: string;
  logo: string;
  description: string;
  zapierLink: string;
  category: string;
}

interface Integration {
  id: string;
  platform: string;
  status: string;
  connected_at: string | null;
  store_name: string | null;
  store_url: string | null;
  error_message: string | null;
}

const PLATFORMS: Platform[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    logo: '/shopify (1).png',
    description: 'Connect your Shopify store to automatically sync orders',
    zapierLink: 'https://zapier.com/shared/nsj-shopify',
    category: 'ecommerce',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    logo: '/Woo.png',
    description: 'Sync WooCommerce orders seamlessly',
    zapierLink: 'https://zapier.com/shared/nsj-woocommerce',
    category: 'ecommerce',
  },
  {
    id: 'neto',
    name: 'Neto',
    logo: '/Neto.png',
    description: 'Integrate with Maropost (Neto) platform',
    zapierLink: 'https://zapier.com/shared/nsj-neto',
    category: 'ecommerce',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Dynamics 365',
    logo: '/Microsoft.jpg',
    description: 'Connect Microsoft Dynamics 365 ERP system',
    zapierLink: 'https://zapier.com/shared/nsj-microsoft',
    category: 'erp',
  },
  {
    id: 'oracle',
    name: 'Oracle NetSuite',
    logo: '/oracle.png',
    description: 'Integrate Oracle NetSuite ERP',
    zapierLink: 'https://zapier.com/shared/nsj-oracle',
    category: 'erp',
  },
  {
    id: 'pronto',
    name: 'Pronto Xi',
    logo: '/pronto.jpg',
    description: 'Connect Pronto Xi software',
    zapierLink: 'https://zapier.com/shared/nsj-pronto',
    category: 'erp',
  },
  {
    id: 'wms',
    name: 'Generic WMS/ERP',
    logo: '/wms.png',
    description: 'Connect any warehouse management or ERP system',
    zapierLink: 'https://zapier.com/shared/nsj-generic-wms',
    category: 'other',
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchIntegrations();
    }
  }, [user]);

  const fetchIntegrations = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setIntegrations(data || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: Platform) => {
    if (!user) return;

    setConnectingPlatform(platform.id);
    setError('');

    try {
      const existingIntegration = integrations.find(i => i.platform === platform.id);

      if (existingIntegration) {
        const { error: updateError } = await supabase
          .from('integrations')
          .update({ status: 'pending', error_message: null })
          .eq('id', existingIntegration.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('integrations')
          .insert([{
            user_id: user.id,
            platform: platform.id,
            status: 'pending',
            zap_link: platform.zapierLink,
          }]);

        if (insertError) throw insertError;
      }

      window.open(platform.zapierLink, '_blank');

      setTimeout(() => {
        setConnectingPlatform(null);
        fetchIntegrations();
      }, 2000);

    } catch (err) {
      console.error('Error connecting platform:', err);
      setError('Failed to initiate connection');
      setConnectingPlatform(null);
    }
  };

  const getIntegrationStatus = (platformId: string): Integration | undefined => {
    return integrations.find(i => i.platform === platformId);
  };

  const isConnected = (platformId: string): boolean => {
    const integration = getIntegrationStatus(platformId);
    return integration?.status === 'connected';
  };

  const isPending = (platformId: string): boolean => {
    const integration = getIntegrationStatus(platformId);
    return integration?.status === 'pending';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
          <p className="text-gray-600">You need to be logged in to access integrations</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Store Integrations</h1>
          <p className="text-lg text-gray-600">
            Connect your ecommerce platforms to NSJ Express for automatic order syncing
          </p>
          {connectedCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
              <Check className="w-5 h-5" />
              <span className="font-medium">{connectedCount} {connectedCount === 1 ? 'store' : 'stores'} connected</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ecommerce Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.filter(p => p.category === 'ecommerce').map((platform) => {
              const integration = getIntegrationStatus(platform.id);
              const connected = isConnected(platform.id);
              const pending = isPending(platform.id);
              const connecting = connectingPlatform === platform.id;

              return (
                <div
                  key={platform.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="h-12 w-12 object-contain"
                    />
                    {connected && (
                      <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Connected
                      </div>
                    )}
                    {pending && !connecting && (
                      <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Pending
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{platform.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{platform.description}</p>

                  {integration?.error_message && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">
                      {integration.error_message}
                    </div>
                  )}

                  {integration?.store_name && (
                    <div className="mb-4 text-sm text-gray-700">
                      <span className="font-medium">Store:</span> {integration.store_name}
                    </div>
                  )}

                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={connecting || connected}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      connected
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : connecting
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : connected ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Connect {platform.name}
                      </>
                    )}
                  </button>

                  {connecting && (
                    <p className="mt-3 text-xs text-gray-600 text-center">
                      Complete the setup in the new tab...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ERP & Business Systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.filter(p => p.category === 'erp').map((platform) => {
              const integration = getIntegrationStatus(platform.id);
              const connected = isConnected(platform.id);
              const pending = isPending(platform.id);
              const connecting = connectingPlatform === platform.id;

              return (
                <div
                  key={platform.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="h-12 w-12 object-contain"
                    />
                    {connected && (
                      <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Connected
                      </div>
                    )}
                    {pending && !connecting && (
                      <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Pending
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{platform.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{platform.description}</p>

                  {integration?.error_message && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">
                      {integration.error_message}
                    </div>
                  )}

                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={connecting || connected}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      connected
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : connecting
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : connected ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Connect {platform.name}
                      </>
                    )}
                  </button>

                  {connecting && (
                    <p className="mt-3 text-xs text-gray-600 text-center">
                      Complete the setup in the new tab...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Other Systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.filter(p => p.category === 'other').map((platform) => {
              const integration = getIntegrationStatus(platform.id);
              const connected = isConnected(platform.id);
              const pending = isPending(platform.id);
              const connecting = connectingPlatform === platform.id;

              return (
                <div
                  key={platform.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="h-12 w-12 object-contain"
                    />
                    {connected && (
                      <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Connected
                      </div>
                    )}
                    {pending && !connecting && (
                      <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Pending
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{platform.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{platform.description}</p>

                  {integration?.error_message && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">
                      {integration.error_message}
                    </div>
                  )}

                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={connecting || connected}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      connected
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : connecting
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : connected ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Connect {platform.name}
                      </>
                    )}
                  </button>

                  {connecting && (
                    <p className="mt-3 text-xs text-gray-600 text-center">
                      Complete the setup in the new tab...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-purple-600" />
            How It Works
          </h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">1.</span>
              <span>Click "Connect" on your platform to open Zapier setup in a new tab</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">2.</span>
              <span>Complete the authentication process with your store credentials</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">3.</span>
              <span>Your orders will automatically sync to StarShipIt under NSJ Express branding</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">4.</span>
              <span>Track all shipments from your NSJ Express dashboard</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
