import * as kv from './kv_store.tsx';

// Seed initial podcasts data
export async function seedPodcasts() {
  try {
    // Check if podcasts already exist
    const existing = await kv.getByPrefix('podcast:');
    if (existing.length > 0) {
      console.log('Podcasts already seeded, skipping...');
      return;
    }

    console.log('Seeding podcasts...');

    const podcasts = [
      {
        id: crypto.randomUUID(),
        slug: 'soul-stories',
        title: 'Soul Stories',
        description: 'Deep conversations with legendary soul, funk, and R&B artists. Hear the untold stories behind the music that shaped generations.',
        host: 'Maya Soul',
        hostAvatar: '/assets/maya-avatar.png',
        coverImage: '/assets/podcast-soul-stories.jpg',
        category: 'interviews',
        totalListeners: 45230,
        averageRating: 4.8,
        featured: true,
        subscribed: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'crate-diggers-deep-dive',
        title: 'Crate Diggers: Deep Dive',
        description: 'Journey into the world of rare vinyl hunting. Each episode explores the history, culture, and obsession behind collecting soul and funk records.',
        host: 'Vinyl Detective',
        hostAvatar: '/assets/vinyl-detective-avatar.png',
        coverImage: '/assets/podcast-crate-diggers.jpg',
        category: 'history',
        totalListeners: 38450,
        averageRating: 4.9,
        featured: true,
        subscribed: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'the-midnight-session',
        title: 'The Midnight Session',
        description: 'Late-night philosophical conversations about music, life, and everything in between. Hosted by Niko from Labyrinth of Eternity.',
        host: 'Niko',
        hostAvatar: 'https://images.unsplash.com/photo-1659682342865-c58cb5e069f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
        coverImage: '/assets/podcast-midnight-session.jpg',
        category: 'culture',
        totalListeners: 32100,
        averageRating: 4.7,
        featured: false,
        subscribed: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'behind-the-groove',
        title: 'Behind the Groove',
        description: 'Get an inside look at how Soul FM operates. Studio sessions, DJ prep, music curation, and the magic that happens behind the scenes.',
        host: 'Rhythm Architect',
        hostAvatar: '/assets/rhythm-architect-avatar.png',
        coverImage: '/assets/podcast-behind-groove.jpg',
        category: 'behind-scenes',
        totalListeners: 28900,
        averageRating: 4.6,
        featured: false,
        subscribed: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'funk-fundamentals',
        title: 'Funk Fundamentals',
        description: 'A masterclass in funk music. Breaking down the basslines, drum patterns, and production techniques that make funk so infectious.',
        host: 'Smooth Operator',
        hostAvatar: '/assets/smooth-operator-avatar.png',
        coverImage: '/assets/podcast-funk-fundamentals.jpg',
        category: 'history',
        totalListeners: 25600,
        averageRating: 4.5,
        featured: false,
        subscribed: false,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Save all podcasts - use BOTH slug-based and id-based keys for compatibility
    for (const podcast of podcasts) {
      await kv.set(`podcast:${podcast.slug}`, podcast);
      console.log(`✅ Seeded podcast: ${podcast.title}`);
    }

    // Now seed episodes for each podcast
    await seedEpisodes();

    console.log(`✅ Successfully seeded ${podcasts.length} podcasts`);
  } catch (error) {
    console.error('Error seeding podcasts:', error);
  }
}

// Seed initial shows data
export async function seedShows() {
  try {
    const existing = await kv.getByPrefix('show:');
    if (existing.length > 0) {
      console.log('Shows already seeded, skipping...');
      return;
    }

    console.log('Seeding shows...');

    const shows = [
      {
        id: crypto.randomUUID(),
        slug: 'soul-sunrise',
        title: 'Soul Sunrise',
        description: 'Start your morning with the smoothest soul, jazz, and R&B. Maya Soul brings the positive vibes to wake up your spirit every weekday.',
        host: 'Maya Soul',
        hostAvatar: '',
        coverImage: '',
        genre: 'Soul',
        type: 'live',
        schedule: [
          { day: 'Monday', startTime: '06:00', endTime: '10:00' },
          { day: 'Tuesday', startTime: '06:00', endTime: '10:00' },
          { day: 'Wednesday', startTime: '06:00', endTime: '10:00' },
          { day: 'Thursday', startTime: '06:00', endTime: '10:00' },
          { day: 'Friday', startTime: '06:00', endTime: '10:00' },
        ],
        status: 'active',
        totalListeners: 12400,
        averageRating: 4.8,
        featured: true,
        episodes: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'funk-factory',
        title: 'The Funk Factory',
        description: 'Non-stop funk, disco, and grooves to get you through the afternoon. Bootsy, Parliament, Earth Wind & Fire - we play it all.',
        host: 'DJ Groove Master',
        hostAvatar: '',
        coverImage: '',
        genre: 'Funk',
        type: 'live',
        schedule: [
          { day: 'Monday', startTime: '14:00', endTime: '18:00' },
          { day: 'Wednesday', startTime: '14:00', endTime: '18:00' },
          { day: 'Friday', startTime: '14:00', endTime: '18:00' },
        ],
        status: 'active',
        totalListeners: 9800,
        averageRating: 4.7,
        featured: true,
        episodes: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'jazz-after-dark',
        title: 'Jazz After Dark',
        description: 'Late-night jazz vibes for the night owls. From classic Blue Note recordings to contemporary jazz fusion. The perfect wind-down soundtrack.',
        host: 'Niko',
        hostAvatar: '',
        coverImage: '',
        genre: 'Jazz',
        type: 'live',
        schedule: [
          { day: 'Friday', startTime: '22:00', endTime: '02:00' },
          { day: 'Saturday', startTime: '22:00', endTime: '02:00' },
        ],
        status: 'active',
        totalListeners: 7600,
        averageRating: 4.9,
        featured: false,
        episodes: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'rnb-lounge',
        title: 'R&B Lounge',
        description: 'The silkiest R&B tracks from the 90s to today. Usher, SZA, The Weeknd, Aaliyah - smooth vocals and feel-good rhythms all day.',
        host: 'Smooth Operator',
        hostAvatar: '',
        coverImage: '',
        genre: 'R&B',
        type: 'live',
        schedule: [
          { day: 'Tuesday', startTime: '18:00', endTime: '22:00' },
          { day: 'Thursday', startTime: '18:00', endTime: '22:00' },
        ],
        status: 'active',
        totalListeners: 8200,
        averageRating: 4.6,
        featured: false,
        episodes: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'reggae-riddims',
        title: 'Reggae Riddims',
        description: 'From Bob Marley to modern dancehall. Positive vibrations, roots reggae, and Caribbean rhythms to lift your soul every weekend.',
        host: 'Rhythm Architect',
        hostAvatar: '',
        coverImage: '',
        genre: 'Reggae',
        type: 'live',
        schedule: [
          { day: 'Saturday', startTime: '12:00', endTime: '16:00' },
          { day: 'Sunday', startTime: '12:00', endTime: '16:00' },
        ],
        status: 'active',
        totalListeners: 6300,
        averageRating: 4.5,
        featured: false,
        episodes: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        slug: 'disco-inferno',
        title: 'Disco Inferno',
        description: 'Saturday night fever every weekend! Classic disco, nu-disco, and dance floor anthems. Get your dancing shoes ready.',
        host: 'Vinyl Detective',
        hostAvatar: '',
        coverImage: '',
        genre: 'Disco',
        type: 'live',
        schedule: [
          { day: 'Saturday', startTime: '20:00', endTime: '00:00' },
        ],
        status: 'active',
        totalListeners: 11200,
        averageRating: 4.8,
        featured: true,
        episodes: [],
        createdAt: new Date().toISOString(),
      },
    ];

    for (const show of shows) {
      await kv.set(`show:${show.id}`, show);
      console.log(`✅ Seeded show: ${show.title}`);
    }

    console.log(`✅ Successfully seeded ${shows.length} shows`);
  } catch (error) {
    console.error('Error seeding shows:', error);
  }
}

async function seedEpisodes() {
  const episodes = [
    // Soul Stories Episodes
    {
      podcastSlug: 'soul-stories',
      id: crypto.randomUUID(),
      title: 'The Stevie Wonder Chronicles: Part 1',
      description: 'A deep dive into Stevie Wonder\'s revolutionary period from 1972-1976. How he changed music forever with classics like Innervisions and Songs in the Key of Life.',
      duration: 3420, // 57 minutes
      audioUrl: '/audio/soul-stories-ep1.mp3',
      publishedAt: new Date('2026-01-15').toISOString(),
      plays: 12450,
      likes: 892,
      isLiked: false,
      active: true,
    },
    {
      podcastSlug: 'soul-stories',
      id: crypto.randomUUID(),
      title: 'Chaka Khan: From Rufus to Solo Stardom',
      description: 'The Queen of Funk shares stories about her journey from Chicago to becoming one of the most influential voices in soul and R&B history.',
      duration: 4200, // 70 minutes
      audioUrl: '/audio/soul-stories-ep2.mp3',
      publishedAt: new Date('2026-01-08').toISOString(),
      plays: 10230,
      likes: 743,
      isLiked: false,
      active: true,
    },
    {
      podcastSlug: 'soul-stories',
      id: crypto.randomUUID(),
      title: 'The Motown Sound: Berry Gordy\'s Vision',
      description: 'Exploring the genius behind Motown Records and how it became the Sound of Young America.',
      duration: 3900, // 65 minutes
      audioUrl: '/audio/soul-stories-ep3.mp3',
      publishedAt: new Date('2026-01-01').toISOString(),
      plays: 8950,
      likes: 621,
      isLiked: false,
      active: true,
    },

    // Crate Diggers Episodes
    {
      podcastSlug: 'crate-diggers-deep-dive',
      id: crypto.randomUUID(),
      title: 'The Holy Grail: Finding Rare Soul 45s',
      description: 'What makes a record valuable? We explore the world of rare Northern Soul singles and the collectors who hunt them.',
      duration: 3300, // 55 minutes
      audioUrl: '/audio/crate-diggers-ep1.mp3',
      publishedAt: new Date('2026-01-20').toISOString(),
      plays: 9870,
      likes: 654,
      isLiked: false,
      active: true,
    },
    {
      podcastSlug: 'crate-diggers-deep-dive',
      id: crypto.randomUUID(),
      title: 'Funk on a Budget: Dollar Bin Gems',
      description: 'You don\'t need deep pockets to find great funk. We uncover incredible records hiding in the dollar bins.',
      duration: 2880, // 48 minutes
      audioUrl: '/audio/crate-diggers-ep2.mp3',
      publishedAt: new Date('2026-01-13').toISOString(),
      plays: 8540,
      likes: 587,
      isLiked: false,
      active: true,
    },

    // The Midnight Session Episodes
    {
      podcastSlug: 'the-midnight-session',
      id: crypto.randomUUID(),
      title: 'Music as Medicine: The Healing Power of Soul',
      description: 'A philosophical exploration of how soul music heals, comforts, and transforms our emotional landscape.',
      duration: 4500, // 75 minutes
      audioUrl: '/audio/midnight-session-ep1.mp3',
      publishedAt: new Date('2026-01-18').toISOString(),
      plays: 7230,
      likes: 512,
      isLiked: false,
      active: true,
    },
    {
      podcastSlug: 'the-midnight-session',
      id: crypto.randomUUID(),
      title: 'The Concept of Time in Jazz',
      description: 'How jazz musicians play with time, and what that teaches us about living in the present moment.',
      duration: 3600, // 60 minutes
      audioUrl: '/audio/midnight-session-ep2.mp3',
      publishedAt: new Date('2026-01-11').toISOString(),
      plays: 6540,
      likes: 478,
      isLiked: false,
      active: true,
    },

    // Behind the Groove Episodes
    {
      podcastSlug: 'behind-the-groove',
      id: crypto.randomUUID(),
      title: 'Building the Perfect Playlist: A DJ\'s Perspective',
      description: 'Maya Soul breaks down her process for creating the perfect morning show playlist. Energy, flow, and storytelling through music.',
      duration: 2700, // 45 minutes
      audioUrl: '/audio/behind-groove-ep1.mp3',
      publishedAt: new Date('2026-01-22').toISOString(),
      plays: 6890,
      likes: 445,
      isLiked: false,
      active: true,
    },
    {
      podcastSlug: 'behind-the-groove',
      id: crypto.randomUUID(),
      title: 'Studio Setup: Getting That Warm Analog Sound',
      description: 'Our chief engineer reveals the gear, techniques, and philosophy behind Soul FM\'s signature sound.',
      duration: 3000, // 50 minutes
      audioUrl: '/audio/behind-groove-ep2.mp3',
      publishedAt: new Date('2026-01-15').toISOString(),
      plays: 5670,
      likes: 392,
      isLiked: false,
      active: true,
    },

    // Funk Fundamentals Episodes
    {
      podcastSlug: 'funk-fundamentals',
      id: crypto.randomUUID(),
      title: 'The One: Understanding James Brown\'s Revolution',
      description: 'How James Brown\'s emphasis on "the one" changed music forever. A technical and cultural analysis.',
      duration: 3240, // 54 minutes
      audioUrl: '/audio/funk-fundamentals-ep1.mp3',
      publishedAt: new Date('2026-01-19').toISOString(),
      plays: 5430,
      likes: 367,
      isLiked: false,
      active: true,
    },
    {
      podcastSlug: 'funk-fundamentals',
      id: crypto.randomUUID(),
      title: 'Bass is the Place: The Low End Theory',
      description: 'Celebrating the bassline. From Bootsy Collins to Larry Graham, we explore what makes funk bass so distinctive.',
      duration: 2940, // 49 minutes
      audioUrl: '/audio/funk-fundamentals-ep2.mp3',
      publishedAt: new Date('2026-01-12').toISOString(),
      plays: 4890,
      likes: 334,
      isLiked: false,
      active: true,
    },
  ];

  for (const episode of episodes) {
    const key = `podcast:${episode.podcastSlug}:episode:${episode.id}`;
    await kv.set(key, episode);
    console.log(`  ✅ Seeded episode: ${episode.title}`);
  }
}