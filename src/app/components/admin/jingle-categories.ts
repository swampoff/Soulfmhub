// Professional Radio Jingle Categories

export interface JingleCategory {
  value: string;
  label: string;
  color: string;
  description: string;
  icon: string;
  examples: string[];
  recommendedDuration: string;
  typicalFrequency: string;
}

export const JINGLE_CATEGORIES: JingleCategory[] = [
  // ========== IMAGING ==========
  {
    value: 'station_id',
    label: 'Station ID',
    color: 'bg-cyan-500',
    description: 'Full station identification with call letters and frequency',
    icon: '📻',
    examples: ['"Soul FM Hub - 101.5 FM"', '"You\'re listening to Soul FM"'],
    recommendedDuration: '3-5s',
    typicalFrequency: 'Every hour (top of hour)'
  },
  {
    value: 'sweeper',
    label: 'Sweeper',
    color: 'bg-purple-500',
    description: 'Quick branding elements between songs',
    icon: '✨',
    examples: ['"Soul FM!"', '"More music, less talk"', '"The best funk and soul"'],
    recommendedDuration: '2-4s',
    typicalFrequency: 'Every 3-5 songs'
  },
  {
    value: 'bumper',
    label: 'Bumper',
    color: 'bg-indigo-500',
    description: 'Short transition between segments',
    icon: '🔄',
    examples: ['"Coming up..."', '"Stay tuned"', '"More music next"'],
    recommendedDuration: '1-2s',
    typicalFrequency: 'Before/after breaks'
  },
  {
    value: 'stinger',
    label: 'Stinger',
    color: 'bg-pink-500',
    description: 'Very short sonic logo or accent',
    icon: '⚡',
    examples: ['Quick musical hit', 'Signature sound effect', 'Audio logo'],
    recommendedDuration: '0.5-1s',
    typicalFrequency: 'Multiple per hour'
  },
  {
    value: 'drop_in',
    label: 'Drop-In',
    color: 'bg-rose-500',
    description: 'Voice-over liner played over music intro',
    icon: '🎤',
    examples: ['"Soul FM keeps you moving"', '"Your funk headquarters"'],
    recommendedDuration: '3-5s',
    typicalFrequency: 'During song intros'
  },
  {
    value: 'liner',
    label: 'Liner',
    color: 'bg-amber-500',
    description: 'Standalone voice positioning statement',
    icon: '💬',
    examples: ['"The soul of the city"', '"Funk, soul, and everything groovy"'],
    recommendedDuration: '3-6s',
    typicalFrequency: 'Every 15-20 minutes'
  },

  // ========== PROGRAMMING ==========
  {
    value: 'show_intro',
    label: 'Show Intro',
    color: 'bg-green-500',
    description: 'Opening for a specific show or program',
    icon: '🎬',
    examples: ['"The Morning Funk Show"', '"Midnight Soul Session"'],
    recommendedDuration: '5-10s',
    typicalFrequency: 'Show start'
  },
  {
    value: 'show_outro',
    label: 'Show Outro',
    color: 'bg-lime-500',
    description: 'Closing for a specific show or program',
    icon: '🎭',
    examples: ['"Thanks for listening!"', '"We\'ll be back tomorrow"'],
    recommendedDuration: '5-10s',
    typicalFrequency: 'Show end'
  },
  {
    value: 'segment_transition',
    label: 'Segment Transition',
    color: 'bg-emerald-500',
    description: 'Transition between show segments',
    icon: '↔️',
    examples: ['"After the break"', '"Coming up next"'],
    recommendedDuration: '2-3s',
    typicalFrequency: 'Between segments'
  },

  // ========== TIME & INFO ==========
  {
    value: 'time_check',
    label: 'Time Check',
    color: 'bg-blue-500',
    description: 'Time announcement bumper',
    icon: '⏰',
    examples: ['"It\'s 9 AM on Soul FM"', '"Time check"'],
    recommendedDuration: '2-4s',
    typicalFrequency: 'Every hour/half-hour'
  },
  {
    value: 'weather_bumper',
    label: 'Weather Bumper',
    color: 'bg-sky-500',
    description: 'Intro/outro for weather reports',
    icon: '🌤️',
    examples: ['"Your Soul FM weather"', '"Weather update"'],
    recommendedDuration: '2-3s',
    typicalFrequency: 'Before weather segments'
  },
  {
    value: 'traffic_bumper',
    label: 'Traffic Bumper',
    color: 'bg-slate-500',
    description: 'Intro/outro for traffic reports',
    icon: '🚗',
    examples: ['"Soul FM traffic"', '"Your commute report"'],
    recommendedDuration: '2-3s',
    typicalFrequency: 'Before traffic segments'
  },

  // ========== COMMERCIAL ==========
  {
    value: 'commercial_intro',
    label: 'Commercial Intro',
    color: 'bg-red-500',
    description: 'Lead-in before commercial break',
    icon: '💰',
    examples: ['"We\'ll be right back"', '"Stay with us"'],
    recommendedDuration: '2-3s',
    typicalFrequency: 'Before ad breaks'
  },
  {
    value: 'commercial_outro',
    label: 'Commercial Outro',
    color: 'bg-orange-500',
    description: 'Return from commercial break',
    icon: '↩️',
    examples: ['"Welcome back to Soul FM"', '"You\'re back with us"'],
    recommendedDuration: '2-3s',
    typicalFrequency: 'After ad breaks'
  },

  // ========== SPECIAL ==========
  {
    value: 'contest',
    label: 'Contest/Promo',
    color: 'bg-yellow-500',
    description: 'Contest announcements and promos',
    icon: '🎁',
    examples: ['"Win with Soul FM!"', '"Call now to win!"'],
    recommendedDuration: '5-10s',
    typicalFrequency: 'As scheduled'
  },
  {
    value: 'holiday',
    label: 'Holiday/Seasonal',
    color: 'bg-red-600',
    description: 'Holiday and seasonal imaging',
    icon: '🎄',
    examples: ['"Happy Holidays from Soul FM"', '"Summer vibes"'],
    recommendedDuration: '3-5s',
    typicalFrequency: 'Seasonal rotation'
  },
  {
    value: 'event',
    label: 'Event Promo',
    color: 'bg-fuchsia-500',
    description: 'Promotion for specific events',
    icon: '🎪',
    examples: ['"Live concert Saturday"', '"Meet & greet this weekend"'],
    recommendedDuration: '5-15s',
    typicalFrequency: 'As scheduled'
  },

  // ========== TECHNICAL ==========
  {
    value: 'emergency',
    label: 'Emergency Alert',
    color: 'bg-red-700',
    description: 'Emergency broadcasting system alerts',
    icon: '🚨',
    examples: ['EAS tones', 'Emergency notifications'],
    recommendedDuration: 'Variable',
    typicalFrequency: 'As required by law'
  },
  {
    value: 'technical',
    label: 'Technical',
    color: 'bg-gray-600',
    description: 'Silence fillers and technical elements',
    icon: '⚙️',
    examples: ['Dead air prevention', 'Stream buffer fills'],
    recommendedDuration: 'Variable',
    typicalFrequency: 'Automated fallback'
  },

  // ========== OTHER ==========
  {
    value: 'other',
    label: 'Other',
    color: 'bg-gray-500',
    description: 'Miscellaneous jingles',
    icon: '📦',
    examples: ['Custom elements', 'Uncategorized'],
    recommendedDuration: 'Variable',
    typicalFrequency: 'Variable'
  },
];

// Grouped categories for better UI organization
export const CATEGORY_GROUPS = {
  imaging: {
    label: 'Imaging & Branding',
    icon: '🎨',
    categories: ['station_id', 'sweeper', 'bumper', 'stinger', 'drop_in', 'liner']
  },
  programming: {
    label: 'Programming',
    icon: '📺',
    categories: ['show_intro', 'show_outro', 'segment_transition']
  },
  info: {
    label: 'Time & Information',
    icon: '📰',
    categories: ['time_check', 'weather_bumper', 'traffic_bumper']
  },
  commercial: {
    label: 'Commercial Breaks',
    icon: '💼',
    categories: ['commercial_intro', 'commercial_outro']
  },
  special: {
    label: 'Special & Promos',
    icon: '🌟',
    categories: ['contest', 'holiday', 'event']
  },
  technical: {
    label: 'Technical',
    icon: '🔧',
    categories: ['emergency', 'technical']
  },
  other: {
    label: 'Other',
    icon: '📦',
    categories: ['other']
  }
};

// Radio format presets
export const FORMAT_PRESETS = {
  top_40: {
    name: 'Top 40/CHR',
    description: 'High-energy Contemporary Hit Radio',
    recommendedCategories: ['sweeper', 'stinger', 'drop_in', 'contest'],
    frequency: 'High rotation - many short elements'
  },
  adult_contemporary: {
    name: 'Adult Contemporary',
    description: 'Smooth, professional sound',
    recommendedCategories: ['station_id', 'liner', 'bumper'],
    frequency: 'Medium rotation - longer elements'
  },
  classic_hits: {
    name: 'Classic Hits',
    description: 'Nostalgic, warm imaging',
    recommendedCategories: ['station_id', 'sweeper', 'liner', 'show_intro'],
    frequency: 'Medium rotation'
  },
  urban: {
    name: 'Urban/R&B',
    description: 'Street-smart, energetic',
    recommendedCategories: ['sweeper', 'drop_in', 'stinger'],
    frequency: 'High rotation - rhythmic elements'
  },
  talk_radio: {
    name: 'Talk Radio',
    description: 'Information-focused',
    recommendedCategories: ['segment_transition', 'time_check', 'bumper', 'show_intro'],
    frequency: 'Frequent bumpers and transitions'
  },
  smooth_jazz: {
    name: 'Smooth Jazz/Chill',
    description: 'Minimal, subtle imaging',
    recommendedCategories: ['station_id', 'bumper'],
    frequency: 'Low rotation - non-intrusive'
  }
};

// Helper functions
export function getCategoryInfo(value: string): JingleCategory {
  return JINGLE_CATEGORIES.find(c => c.value === value) || JINGLE_CATEGORIES[JINGLE_CATEGORIES.length - 1];
}

export function getCategoriesByGroup(groupKey: string): JingleCategory[] {
  const group = CATEGORY_GROUPS[groupKey as keyof typeof CATEGORY_GROUPS];
  if (!group) return [];
  return group.categories.map(catValue => getCategoryInfo(catValue));
}

export function getAllCategoryValues(): string[] {
  return JINGLE_CATEGORIES.map(c => c.value);
}
