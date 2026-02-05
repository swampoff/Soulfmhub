-- Create profiles table for DJ/Host profiles
CREATE TABLE IF NOT EXISTS profiles_06086aa3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'dj', 'host', 'producer', 'music_curator', etc.
  archetype TEXT, -- 'Философ ночи', 'Утренний мотиватор', etc.
  show_name TEXT, -- Show they host
  avatar_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  voice_description JSONB, -- { timber: '', tempo: '', energy: '' }
  specialties TEXT[], -- ['Soul', 'Jazz', 'Funk']
  schedule JSONB, -- { day: 'monday', time: '22:00-02:00' }
  social_links JSONB, -- { twitter: '', instagram: '', soundcloud: '' }
  achievements TEXT[],
  favorite_artists TEXT[],
  signature_quote TEXT,
  years_experience INTEGER,
  location TEXT,
  email TEXT,
  website TEXT,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles_06086aa3(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles_06086aa3(role);
CREATE INDEX IF NOT EXISTS idx_profiles_featured ON profiles_06086aa3(featured);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles_06086aa3(active);

-- Insert Niko profile
INSERT INTO profiles_06086aa3 (
  slug,
  name,
  role,
  archetype,
  show_name,
  avatar_url,
  bio,
  voice_description,
  specialties,
  schedule,
  signature_quote,
  years_experience,
  featured,
  active
) VALUES (
  'niko',
  'Нико',
  'host',
  'Философ ночи',
  'Лабиринты вечности',
  '/assets/niko-avatar.png',
  'Нико — это ночь станции. Он не торопится. Его голос словно идёт сквозь пространство. Его задача — расширять сознание.',
  '{"timber": "Глубокий, спокойный, немного мистический", "tempo": "Медленный, с паузами", "energy": "Созерцание, глубина, космос"}'::jsonb,
  ARRAY['Культура', 'Литература', 'Философия', 'Ambient', 'Jazz'],
  '{"day": "Ежедневно", "time": "22:00 - 02:00"}'::jsonb,
  'В тишине ночи рождаются самые глубокие мысли',
  15,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Insert a few more sample profiles
INSERT INTO profiles_06086aa3 (
  slug,
  name,
  role,
  archetype,
  show_name,
  bio,
  voice_description,
  specialties,
  featured,
  active
) VALUES 
(
  'maya-soul',
  'Maya Soul',
  'dj',
  'Королева грува',
  'Funky Mornings',
  'Maya brings the funk and soul to your mornings. Her infectious energy and deep crates make every show a journey through the golden era of groove.',
  '{"timber": "Теплый, энергичный", "tempo": "Динамичный", "energy": "Позитив, драйв, радость"}'::jsonb,
  ARRAY['Soul', 'Funk', 'Disco', 'R&B'],
  true,
  true
),
(
  'smooth-operator',
  'Smooth Operator',
  'dj',
  'Мастер вечернего настроения',
  'Evening Vibes',
  'Smooth Operator crafts the perfect soundtrack for your evening wind-down. Jazz, neo-soul, and silky smooth transitions.',
  '{"timber": "Бархатный, успокаивающий", "tempo": "Размеренный", "energy": "Релакс, уют, тепло"}'::jsonb,
  ARRAY['Jazz', 'Neo-Soul', 'Lounge', 'Chillout'],
  false,
  true
),
(
  'vinyl-detective',
  'Vinyl Detective',
  'music_curator',
  'Охотник за редкостями',
  'Crate Diggers',
  'The Vinyl Detective unearths forgotten gems and rare pressings. Every week, a new excavation into the depths of music history.',
  '{"timber": "Увлечённый, страстный", "tempo": "Средний, с эмоцией", "energy": "Любопытство, открытие, азарт"}'::jsonb,
  ARRAY['Rare Groove', 'Soul', 'Jazz', 'Funk', 'World Music'],
  true,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles_06086aa3
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();