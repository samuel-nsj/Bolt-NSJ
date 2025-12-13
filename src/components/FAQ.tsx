import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How long does delivery take?',
      answer: 'Delivery times depend on the option selected. Standard delivery takes 3-5 business days, Express takes 1-2 days, and Overnight is available for next-day delivery.',
    },
    {
      question: 'What areas do you deliver to?',
      answer: 'We deliver nationwide across the entire region. For specific locations, please enter your postal code on our booking page.',
    },
    {
      question: 'Is my package insured?',
      answer: 'Yes, all packages are automatically insured during transit at no extra cost. Coverage includes loss and damage up to the declared value.',
    },
    {
      question: 'Can I track my shipment?',
      answer: 'Absolutely! You get real-time tracking updates via email and our dashboard. You can see your package status at any time.',
    },
    {
      question: 'What if my package is lost?',
      answer: 'In the rare case of loss, we handle claims immediately with full compensation. Our support team will assist you throughout the process.',
    },
    {
      question: 'Do you offer bulk discounts?',
      answer: 'Yes! We offer volume discounts for regular shippers. Contact our sales team for a custom quote.',
    },
  ];

  return (
    <section id="tracking" className="bg-white py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600">Find answers to common questions</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg hover:border-purple-300 transition">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <span className="text-left font-semibold text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-gray-600 border-t border-gray-200 pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
