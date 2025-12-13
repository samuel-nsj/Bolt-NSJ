import { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WebhookSetupModalProps {
  platform: {
    id: string;
    name: string;
    zapierUrl: string;
  };
  onClose: () => void;
  userId: string;
}

export default function WebhookSetupModal({
  platform,
  onClose,
  userId,
}: WebhookSetupModalProps) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'instructions' | 'confirm'>('instructions');
  const [storeName, setStoreName] = useState('');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-webhook`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmConnection = async () => {
    try {
      await supabase.from('integrations').insert({
        user_id: userId,
        platform: platform.id,
        status: 'connected',
        connected_at: new Date().toISOString(),
        store_name: storeName || null,
      });

      window.location.href = `${window.location.origin}/dashboard/integrations?return=${platform.id}`;
    } catch (error) {
      console.error('Error saving integration:', error);
    }
  };

  const getInstructions = () => {
    if (platform.id === 'shopify') {
      return {
        title: 'Connect Your Shopify Store',
        steps: [
          {
            title: 'Go to Shopify Admin',
            description: 'Log into your Shopify store admin panel',
            link: 'https://admin.shopify.com',
            linkText: 'Open Shopify Admin'
          },
          {
            title: 'Navigate to Settings → Notifications',
            description: 'Click Settings in the bottom left, then click Notifications'
          },
          {
            title: 'Add NSJ Express Store Name',
            description: (
              <div className="space-y-2">
                <p>Before adding the webhook, add a header to identify your store:</p>
                <div className="bg-white rounded border border-gray-200 p-2 space-y-1 text-xs font-mono">
                  <div><span className="text-gray-600">Header Name:</span> X-Shopify-Shop-Domain</div>
                  <div><span className="text-gray-600">Header Value:</span> your-store.myshopify.com</div>
                </div>
                <p className="text-xs text-gray-600 mt-2">Replace "your-store.myshopify.com" with your actual Shopify domain</p>
              </div>
            )
          },
          {
            title: 'Scroll to Webhooks Section',
            description: 'Scroll down to the "Webhooks" section at the bottom of the page'
          },
          {
            title: 'Create Webhook',
            description: 'Click "Create webhook" button'
          },
          {
            title: 'Configure Webhook',
            description: (
              <div className="space-y-2">
                <p>Set the following values:</p>
                <div className="bg-white rounded border border-gray-200 p-2 space-y-1 text-xs font-mono">
                  <div><span className="text-gray-600">Event:</span> Order creation</div>
                  <div><span className="text-gray-600">Format:</span> JSON</div>
                  <div><span className="text-gray-600">URL:</span> (paste the webhook URL below)</div>
                </div>
              </div>
            )
          },
          {
            title: 'Paste Webhook URL',
            description: 'Copy the webhook URL below and paste it into the URL field in Shopify'
          },
          {
            title: 'Save Webhook',
            description: 'Click "Save webhook" in Shopify'
          }
        ]
      };
    }

    if (platform.id === 'woocommerce') {
      return {
        title: 'Connect Your WooCommerce Store',
        steps: [
          {
            title: 'Log into WordPress Admin',
            description: 'Access your WordPress dashboard where WooCommerce is installed',
            link: 'https://wordpress.com/log-in',
            linkText: 'Go to WordPress Login'
          },
          {
            title: 'Navigate to WooCommerce → Settings',
            description: 'In the left sidebar, hover over WooCommerce and click Settings'
          },
          {
            title: 'Go to Advanced Tab',
            description: 'Click on the "Advanced" tab at the top of the settings page'
          },
          {
            title: 'Click Webhooks',
            description: 'Click the "Webhooks" link in the Advanced settings'
          },
          {
            title: 'Add New Webhook',
            description: 'Click the "Add webhook" button at the top'
          },
          {
            title: 'Configure Webhook',
            description: (
              <div className="space-y-2">
                <p>Set the following values:</p>
                <div className="bg-white rounded border border-gray-200 p-2 space-y-1 text-xs font-mono">
                  <div><span className="text-gray-600">Name:</span> NSJ Express Orders</div>
                  <div><span className="text-gray-600">Status:</span> Active</div>
                  <div><span className="text-gray-600">Topic:</span> Order created</div>
                  <div><span className="text-gray-600">Delivery URL:</span> (paste the webhook URL below)</div>
                </div>
              </div>
            )
          },
          {
            title: 'Paste Webhook URL',
            description: 'Copy the webhook URL below and paste it into the "Delivery URL" field'
          },
          {
            title: 'Save Webhook',
            description: 'Click "Save webhook" button at the bottom'
          }
        ]
      };
    }

    return {
      title: `Connect Your ${platform.name} Store`,
      steps: [
        {
          title: 'Access Store Settings',
          description: `Log into your ${platform.name} admin panel and navigate to integrations or webhooks settings`
        },
        {
          title: 'Create New Webhook',
          description: 'Look for webhook or notification settings and create a new webhook for order creation'
        },
        {
          title: 'Configure Webhook',
          description: 'Set the event to "Order Created" or "New Order" and format to JSON'
        },
        {
          title: 'Add Webhook URL',
          description: 'Copy and paste the webhook URL below into your store settings'
        },
        {
          title: 'Save Changes',
          description: 'Save the webhook configuration in your store'
        }
      ]
    };
  };

  const instructions = getInstructions();

  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Confirm Connection
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 rounded-full p-4">
                <ShoppingBag className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Almost Done!
            </h3>

            <p className="text-sm text-gray-600 mb-4 text-center">
              Have you completed the webhook setup in your {platform.name} store?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name (Optional)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="My Store"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-purple-800">
                After confirming, new orders from your store will automatically appear in your NSJ Express dashboard.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('instructions')}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleConfirmConnection}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Confirm Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {instructions.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-900 font-medium mb-2">
              Follow these steps to connect your store:
            </p>
            <p className="text-xs text-purple-800">
              This will allow orders from your {platform.name} store to automatically sync with NSJ Express for fulfillment.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
                  <div className="text-sm text-gray-600">
                    {typeof step.description === 'string' ? step.description : step.description}
                  </div>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-2 font-medium"
                    >
                      {step.linkText}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Webhook URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-700"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-xs text-yellow-900">
              <strong>Important:</strong> Make sure to save the webhook in your {platform.name} settings before clicking "I've Completed Setup" below.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('confirm')}
              className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              I've Completed Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
