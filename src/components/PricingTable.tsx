import { Check } from 'lucide-react';

interface PricingTableProps {
  onBookNow: () => void;
}

export default function PricingTable({ onBookNow }: PricingTableProps) {
  const plans = [
    {
      name: 'Standard',
      description: 'Perfect for occasional shippers',
      volume: '1 shipment',
      features: [
        'Pay as you go',
        'Standard rates',
        'Real-time tracking',
        'Email notifications',
        'Basic insurance coverage',
        'Online support',
      ],
    },
    {
      name: 'Express',
      description: 'Great for growing businesses',
      volume: '20 shipments/month',
      popular: true,
      features: [
        'Discounted shipping rates',
        'Priority handling',
        'Real-time tracking',
        'SMS & email updates',
        'Enhanced insurance coverage',
        'Priority support',
        'Dedicated account manager',
      ],
    },
    {
      name: 'Pro',
      description: 'Best value for high-volume shippers',
      volume: '200 shipments/month',
      features: [
        'Maximum savings on all shipments',
        'Premium priority handling',
        'Advanced tracking & analytics',
        'Multi-channel notifications',
        'Premium insurance coverage',
        'VIP support 24/7',
        'Dedicated account manager',
        'Custom integrations',
      ],
    },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Choose your plan</h2>
          <p className="text-xl text-gray-600">The more you ship, the more you save</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl bg-white p-8 ${
                plan.popular
                  ? 'border-2 border-purple-600 shadow-2xl scale-105'
                  : 'border border-gray-200 shadow-lg hover:shadow-xl'
              } transition relative`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <div className="text-3xl font-bold text-purple-600 mb-2">{plan.volume}</div>
                <p className="text-sm text-gray-500">Volume commitment</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onBookNow}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg'
                    : 'border-2 border-gray-200 text-gray-900 hover:border-purple-600 hover:text-purple-600'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">All plans include real-time tracking, insurance coverage, and flexible pickup options</p>
          <button onClick={onBookNow} className="text-purple-600 hover:text-purple-700 font-semibold text-lg">
            Need a custom solution? Contact us →
          </button>
        </div>
      </div>
    </section>
  );
}
