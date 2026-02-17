import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  HelpCircle,
  ChevronDown,
  Search,
  Radio,
  Music,
  Headphones,
  Settings,
  Heart,
  MessageCircle,
  Mic2,
  Shield,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: Radio,
    color: '#00d9ff',
    items: [
      {
        question: 'What is Soul FM Hub?',
        answer: 'Soul FM Hub is an online radio station dedicated to soul, funk, R&B, and jazz music. We broadcast 24/7 with a mix of Auto DJ programming and live DJ sets, featuring curated playlists, original shows, and community-driven content.',
      },
      {
        question: 'How do I listen to Soul FM?',
        answer: 'You can listen directly on our website by clicking the play button on any page. Our radio player is always available at the bottom of the screen. You can also use the dedicated Stream Player page for a focused listening experience.',
      },
      {
        question: 'Is Soul FM free to listen to?',
        answer: 'Yes! Soul FM is completely free to listen to. We are community-supported through donations and sponsorships. If you enjoy our content, consider supporting us on our Support page.',
      },
      {
        question: 'What genres does Soul FM play?',
        answer: 'We primarily play soul, funk, R&B, jazz, neo-soul, and related genres. Our music library spans from classic Motown to contemporary neo-soul artists, ensuring a diverse and soulful listening experience.',
      },
    ],
  },
  {
    id: 'listening',
    label: 'Listening & Stream',
    icon: Headphones,
    color: '#00ffaa',
    items: [
      {
        question: 'What audio quality do you stream in?',
        answer: 'We stream in high-quality 128kbps AAC / 320kbps MP3, providing crystal-clear audio. The exact bitrate may vary based on your connection speed.',
      },
      {
        question: 'Can I listen on my phone?',
        answer: 'Absolutely! Our website is fully responsive and works great on mobile browsers. Just visit our site on your phone and hit play. We recommend using headphones for the best experience.',
      },
      {
        question: 'The stream keeps buffering. What can I do?',
        answer: 'Buffering is usually caused by slow internet. Try: 1) Check your internet connection, 2) Close other streaming apps, 3) Refresh the page, 4) Try a different browser. If issues persist, reach out to us via the Contact page.',
      },
    ],
  },
  {
    id: 'interactive',
    label: 'Interactive Features',
    icon: MessageCircle,
    color: '#FF8C42',
    items: [
      {
        question: 'How do I request a song?',
        answer: 'Head to our "Request a Song" page from the navigation menu. Search for a track or artist, add a personal message if you like, and submit! Our DJs will try to play your request during the next available slot.',
      },
      {
        question: 'How do I send a shoutout?',
        answer: 'Visit our "Send a Shoutout" page. Fill in your name, the person you want to shout out, and your message. Shoutouts may be read on air during live shows!',
      },
      {
        question: 'Can I call in during live shows?',
        answer: 'Yes! During live shows, you can join the call queue through our website. The DJ will take calls in order. Check the show schedule for live show times.',
      },
    ],
  },
  {
    id: 'shows',
    label: 'Shows & Podcasts',
    icon: Mic2,
    color: '#E91E63',
    items: [
      {
        question: 'How can I listen to past shows?',
        answer: 'All our shows are available as podcasts on the Shows & Podcasts page. Browse by category, find your favorite show, and listen to any episode on-demand.',
      },
      {
        question: 'Can I become a DJ or host a show?',
        answer: 'We love welcoming new talent! If you\'re interested in hosting a show or doing a guest DJ set, reach out through our Contact page with your proposal and a demo mix.',
      },
    ],
  },
  {
    id: 'support',
    label: 'Support & Donations',
    icon: Heart,
    color: '#9C27B0',
    items: [
      {
        question: 'How can I support Soul FM?',
        answer: 'You can support us by donating on our Support page. We offer different tiers with exclusive perks. You can also help by sharing our station with friends and following us on social media.',
      },
      {
        question: 'Are donations tax-deductible?',
        answer: 'Currently, donations are considered personal contributions and may not be tax-deductible. We are working on obtaining non-profit status. Check our Support page for the latest information.',
      },
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: Settings,
    color: '#607D8B',
    items: [
      {
        question: 'What browsers are supported?',
        answer: 'Soul FM works best on modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated to the latest version for the best experience.',
      },
      {
        question: 'Do you have a mobile app?',
        answer: 'We don\'t have a dedicated app yet, but our website is a Progressive Web App (PWA) that works beautifully on mobile. You can add it to your home screen for an app-like experience.',
      },
      {
        question: 'How do I report a bug or issue?',
        answer: 'Please use our Contact page to report any bugs or technical issues. Include details about your browser, device, and what happened. Screenshots are always helpful!',
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-1 text-left group"
      >
        <span className={`text-sm font-medium transition-colors ${isOpen ? 'text-[#00d9ff]' : 'text-white/80 group-hover:text-white'}`}>
          {item.question}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 ml-4 transition-transform ${isOpen ? 'rotate-180 text-[#00d9ff]' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-white/50 pb-4 px-1 leading-relaxed">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQPage() {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCategories = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const totalQuestions = FAQ_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d9ff]/10 border border-[#00d9ff]/30 mb-6">
            <HelpCircle className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-sm text-[#00d9ff] font-medium">{totalQuestions} Questions Answered</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Righteous, cursive' }}
          >
            Frequently Asked <span className="text-[#00d9ff]">Questions</span>
          </h1>
          <p className="text-cyan-100/60 text-lg max-w-2xl mx-auto">
            Everything you need to know about Soul FM Hub. Can't find your answer? Contact us!
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </motion.div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {filteredCategories.map((cat, ci) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + ci * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <h2 className="text-lg font-bold text-white">{cat.label}</h2>
                    <span className="text-xs text-white/30 ml-auto">{cat.items.length} questions</span>
                  </div>
                  <div>
                    {cat.items.map((item, ii) => {
                      const key = `${cat.id}-${ii}`;
                      return (
                        <AccordionItem
                          key={key}
                          item={item}
                          isOpen={openItems.has(key)}
                          onToggle={() => toggleItem(key)}
                        />
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No results for "{search}"</p>
            <p className="text-white/25 text-sm mt-1">Try different keywords or browse all categories</p>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Card className="bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/5 border-[#00d9ff]/20 p-8 inline-block">
            <h3 className="text-lg font-bold text-white mb-2">Still have questions?</h3>
            <p className="text-sm text-white/50 mb-4">We're here to help. Reach out and we'll get back to you ASAP.</p>
            <Link to="/contact">
              <Button className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold gap-2">
                <MessageCircle className="w-4 h-4" />
                Contact Us
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
