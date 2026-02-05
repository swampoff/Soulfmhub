import * as kv from './kv_store.tsx';

// Seed initial profiles data
export async function seedProfiles() {
  try {
    // Check if profiles already exist
    const existing = await kv.getByPrefix('profile:');
    if (existing.length > 0) {
      console.log('Profiles already seeded, skipping...');
      return;
    }

    console.log('Seeding profiles...');

    const profiles = [
      // Niko - Featured Host
      {
        id: crypto.randomUUID(),
        slug: 'niko',
        name: 'Нико',
        role: 'host',
        archetype: 'Философ ночи',
        show_name: 'Лабиринты вечности',
        avatar_url: '/assets/niko-avatar.png',
        bio: 'Нико — это ночь станции. Он не торопится. Его голос словно идёт сквозь пространство. Его задача — расширять сознание.',
        voice_description: {
          timber: 'Глубокий, спокойный, немного мистический',
          tempo: 'Медленный, с паузами',
          energy: 'Созерцание, глубина, космос'
        },
        specialties: ['Культура', 'Литература', 'Философия', 'Ambient', 'Jazz'],
        schedule: {
          day: 'Ежедневно',
          time: '22:00 - 02:00'
        },
        signature_quote: 'В тишине ночи рождаются самые глубокие мысли',
        years_experience: 15,
        featured: true,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      
      // Maya Soul - Featured DJ
      {
        id: crypto.randomUUID(),
        slug: 'maya-soul',
        name: 'Maya Soul',
        role: 'dj',
        archetype: 'Королева грува',
        show_name: 'Funky Mornings',
        bio: 'Maya brings the funk and soul to your mornings. Her infectious energy and deep crates make every show a journey through the golden era of groove.',
        voice_description: {
          timber: 'Теплый, энергичный',
          tempo: 'Динамичный',
          energy: 'Позитив, драйв, радость'
        },
        specialties: ['Soul', 'Funk', 'Disco', 'R&B'],
        schedule: {
          day: 'Monday - Friday',
          time: '07:00 - 10:00'
        },
        favorite_artists: ['James Brown', 'Stevie Wonder', 'Chaka Khan', 'Earth Wind & Fire'],
        years_experience: 8,
        featured: true,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      
      // Smooth Operator - DJ
      {
        id: crypto.randomUUID(),
        slug: 'smooth-operator',
        name: 'Smooth Operator',
        role: 'dj',
        archetype: 'Мастер вечернего настроения',
        show_name: 'Evening Vibes',
        bio: 'Smooth Operator crafts the perfect soundtrack for your evening wind-down. Jazz, neo-soul, and silky smooth transitions.',
        voice_description: {
          timber: 'Бархатный, успокаивающий',
          tempo: 'Размеренный',
          energy: 'Релакс, уют, тепло'
        },
        specialties: ['Jazz', 'Neo-Soul', 'Lounge', 'Chillout'],
        schedule: {
          day: 'Monday - Friday',
          time: '18:00 - 21:00'
        },
        favorite_artists: ['Miles Davis', 'Erykah Badu', 'D\'Angelo', 'Robert Glasper'],
        years_experience: 12,
        featured: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      
      // Vinyl Detective - Featured Curator
      {
        id: crypto.randomUUID(),
        slug: 'vinyl-detective',
        name: 'Vinyl Detective',
        role: 'music_curator',
        archetype: 'Охотник за редкостями',
        show_name: 'Crate Diggers',
        bio: 'The Vinyl Detective unearths forgotten gems and rare pressings. Every week, a new excavation into the depths of music history.',
        voice_description: {
          timber: 'Увлечённый, страстный',
          tempo: 'Средний, с эмоцией',
          energy: 'Любопытство, открытие, азарт'
        },
        specialties: ['Rare Groove', 'Soul', 'Jazz', 'Funk', 'World Music'],
        schedule: {
          day: 'Saturday',
          time: '14:00 - 16:00'
        },
        achievements: [
          'Discovered over 500 forgotten soul records',
          'Curated vinyl collection featured in Billboard',
          'Guest lecturer at Music Academy'
        ],
        years_experience: 20,
        featured: true,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },

      // Rhythm Architect - Producer
      {
        id: crypto.randomUUID(),
        slug: 'rhythm-architect',
        name: 'Rhythm Architect',
        role: 'producer',
        archetype: 'Звуковой инженер',
        bio: 'Behind the scenes, crafting the perfect sound. From live shows to studio sessions, ensuring Soul FM sounds immaculate.',
        specialties: ['Audio Engineering', 'Live Production', 'Sound Design', 'Mixing'],
        years_experience: 15,
        location: 'Soul FM Studios',
        featured: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },

      // Luna Waves - Night DJ
      {
        id: crypto.randomUUID(),
        slug: 'luna-waves',
        name: 'Luna Waves',
        role: 'dj',
        archetype: 'Хранительница ночных волн',
        show_name: 'Midnight Soul',
        bio: 'When the city sleeps, Luna keeps you company with deep cuts and soulful selections that speak to the heart.',
        voice_description: {
          timber: 'Мягкий, интимный',
          tempo: 'Спокойный',
          energy: 'Медитация, погружение'
        },
        specialties: ['Deep Soul', 'Quiet Storm', 'Late Night Jazz'],
        schedule: {
          day: 'Friday - Sunday',
          time: '00:00 - 03:00'
        },
        favorite_artists: ['Sade', 'Anita Baker', 'Bill Withers', 'Al Green'],
        signature_quote: 'Music is the bridge between the conscious and the dream',
        years_experience: 6,
        featured: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Save all profiles to KV store
    for (const profile of profiles) {
      await kv.set(`profile:${profile.slug}`, profile);
      console.log(`✅ Seeded profile: ${profile.name} (${profile.slug})`);
    }

    console.log(`✅ Successfully seeded ${profiles.length} profiles`);
  } catch (error) {
    console.error('Error seeding profiles:', error);
  }
}
