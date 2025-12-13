export default function TrustLogos() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Trusted By Industry Leaders
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powering logistics for some of Australia's most innovative companies
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16 mb-16">
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/Microsoft.jpg"
              alt="Microsoft"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/oracle.png"
              alt="Oracle"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/shopify (1).png"
              alt="Shopify"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/Woo.png"
              alt="WooCommerce"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/Neto.png"
              alt="Neto"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/wms.png"
              alt="WMS"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            <img
              src="/pronto.jpg"
              alt="Pronto"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-2">
              50,000+
            </div>
            <p className="text-sm md:text-base text-gray-600 font-medium">Shipments Delivered</p>
          </div>

          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-2">
              99.8%
            </div>
            <p className="text-sm md:text-base text-gray-600 font-medium">On-Time Delivery</p>
          </div>

          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-2">
              5,000+
            </div>
            <p className="text-sm md:text-base text-gray-600 font-medium">Happy Customers</p>
          </div>

          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-2">
              24/7
            </div>
            <p className="text-sm md:text-base text-gray-600 font-medium">Customer Support</p>
          </div>
        </div>
      </div>
    </section>
  );
}
