import { Zap, Lock, Leaf, BarChart3 } from 'lucide-react';

export default function Features() {
  return (
    <section id="pricing" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Why Choose NSJ Express?</h2>
          <p className="text-xl text-gray-600">Everything you need for seamless shipping</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 hover:shadow-lg hover:border-purple-200 transition">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Get pickups scheduled instantly and deliveries completed on time</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 hover:shadow-lg hover:border-purple-200 transition">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Insured</h3>
            <p className="text-gray-600 text-sm leading-relaxed">All shipments fully insured with secure handling and tracking</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 hover:shadow-lg hover:border-purple-200 transition">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Leaf className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eco-Friendly</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Carbon-neutral shipping options available for all deliveries</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 hover:shadow-lg hover:border-purple-200 transition">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Analytics</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Dashboard with detailed tracking and shipping insights</p>
          </div>
        </div>
      </div>
    </section>
  );
}
