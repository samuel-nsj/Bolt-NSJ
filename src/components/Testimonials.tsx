import { Star } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      company: 'Small Business Owner',
      text: 'NSJ Express has been a game changer for my online shop. The booking is simple and delivery is always on time.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      company: 'E-Commerce Manager',
      text: 'The integration with our system was seamless. Customer support is responsive and helpful.',
      rating: 5,
    },
    {
      name: 'Emma Davis',
      company: 'Logistics Director',
      text: 'Reliable, affordable, and their tracking system gives us and our customers complete visibility.',
      rating: 5,
    },
  ];

  return (
    <section id="about" className="bg-gradient-to-br from-purple-50 to-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Trusted by Businesses Everywhere</h2>
          <p className="text-xl text-gray-600">See what our customers have to say</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-8 border border-gray-100 hover:shadow-lg transition">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.text}"</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
