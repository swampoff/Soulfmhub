import React, { useState } from 'react';
import { Card } from './ui/card';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do monthly donations work?',
    answer:
      'Monthly donations are recurring contributions that are automatically charged to your payment method each month. You can cancel or modify your monthly donation at any time from your account settings.',
  },
  {
    question: 'Is my donation tax-deductible?',
    answer:
      'Soul FM Hub is currently working towards obtaining 501(c)(3) status. Once approved, your donations will be tax-deductible. We will provide receipts for all contributions.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay. All transactions are securely processed through our payment partner.',
  },
  {
    question: 'Can I change my support tier?',
    answer:
      'Absolutely! You can upgrade or downgrade your support tier at any time. Changes to monthly donations will take effect on your next billing cycle.',
  },
  {
    question: 'What happens if I cancel my monthly donation?',
    answer:
      'You can cancel your monthly donation anytime without penalty. Your benefits will continue through the end of your current billing period. We appreciate any support you can provide!',
  },
  {
    question: 'How do I receive my supporter benefits?',
    answer:
      'Most digital benefits (ad-free listening, exclusive content) are activated immediately upon donation. Physical rewards like merchandise are shipped within 2-4 weeks. Event invitations are sent via email.',
  },
  {
    question: 'Can I make an anonymous donation?',
    answer:
      'Yes! During checkout, you can choose to make your donation anonymous. Your name will not appear on our public supporters list, though you will still receive all tier benefits.',
  },
  {
    question: 'Do you accept corporate sponsorships?',
    answer:
      'Yes! We offer corporate sponsorship packages for businesses interested in supporting Soul FM Hub. Please contact us at sponsors@soulfmhub.com for more information.',
  },
];

export function SupportFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-white text-center mb-10 flex items-center justify-center gap-2">
        <HelpCircle className="w-8 h-8 text-[#00d9ff]" />
        Frequently Asked Questions
      </h2>

      <div className="max-w-3xl mx-auto space-y-4">
        {FAQ_ITEMS.map((item, index) => (
          <Card
            key={index}
            className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden"
          >
            <button
              onClick={() => toggleQuestion(index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-white font-semibold pr-4">{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-[#00d9ff] flex-shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 text-white/70 leading-relaxed">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-white/60 mb-4">Still have questions?</p>
        <a
          href="mailto:support@soulfmhub.com"
          className="inline-block px-6 py-3 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
