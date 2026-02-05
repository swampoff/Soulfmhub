// Initial data for Soul FM Hub
// This file contains sample data for demonstration purposes

export const sampleTracks = [
  {
    title: 'Ain\'t No Mountain High Enough',
    artist: 'Marvin Gaye & Tammi Terrell',
    album: 'United',
    genre: 'Soul',
    year: 1967,
    duration: 162,
    cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=300',
  },
  {
    title: 'Superstition',
    artist: 'Stevie Wonder',
    album: 'Talking Book',
    genre: 'Funk',
    year: 1972,
    duration: 245,
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
  },
  {
    title: 'What a Wonderful World',
    artist: 'Louis Armstrong',
    album: 'Single',
    genre: 'Jazz',
    year: 1967,
    duration: 139,
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300',
  },
];

export const sampleShows = [
  {
    name: 'Morning Soul Sessions',
    host: 'DJ Sarah Collins',
    description: 'Start your day with uplifting soul and funk classics from the 60s and 70s.',
    genre: 'Soul',
    type: 'live',
    schedule: 'Monday to Friday, 6:00 AM - 10:00 AM',
    cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600',
  },
  {
    name: 'Funk Friday',
    host: 'DJ Marcus Groove',
    description: 'The funkiest selection of grooves to get you moving into the weekend.',
    genre: 'Funk',
    type: 'live',
    schedule: 'Every Friday, 8:00 PM - 11:00 PM',
    cover: 'https://images.unsplash.com/photo-1571609835572-b2e137bb4757?w=600',
  },
  {
    name: 'Jazz After Dark',
    host: 'DJ Miles Turner',
    description: 'Smooth jazz and late-night vibes for the soul.',
    genre: 'Jazz',
    type: 'live',
    schedule: 'Every Saturday, 10:00 PM - 2:00 AM',
    cover: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600',
  },
];

export const sampleSchedule = [
  {
    name: 'Morning Soul Sessions',
    host: 'DJ Sarah Collins',
    startTime: '06:00',
    endTime: '10:00',
    duration: '4h',
    genre: 'Soul',
    type: 'live',
    date: new Date().toISOString().split('T')[0],
  },
  {
    name: 'Midday Groove',
    host: 'Auto DJ',
    startTime: '10:00',
    endTime: '14:00',
    duration: '4h',
    genre: 'Funk',
    type: 'playlist',
    date: new Date().toISOString().split('T')[0],
  },
  {
    name: 'Afternoon Jazz',
    host: 'DJ Miles Turner',
    startTime: '14:00',
    endTime: '18:00',
    duration: '4h',
    genre: 'Jazz',
    type: 'live',
    date: new Date().toISOString().split('T')[0],
  },
  {
    name: 'Evening Disco',
    host: 'Auto DJ',
    startTime: '18:00',
    endTime: '22:00',
    duration: '4h',
    genre: 'Disco',
    type: 'playlist',
    date: new Date().toISOString().split('T')[0],
  },
  {
    name: 'Late Night Vibes',
    host: 'DJ Luna',
    startTime: '22:00',
    endTime: '02:00',
    duration: '4h',
    genre: 'Lounge',
    type: 'live',
    date: new Date().toISOString().split('T')[0],
  },
];

export const sampleNews = [
  {
    title: 'Soul FM Hub Celebrates 1 Year Anniversary',
    excerpt: 'Join us as we celebrate one year of bringing soul, funk, and jazz to listeners worldwide.',
    category: 'Station News',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  },
  {
    title: 'New Show: Reggae Sundays Launching Next Month',
    excerpt: 'Get ready for a new weekly show featuring the best reggae and dub selections.',
    category: 'Announcements',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
  },
  {
    title: 'Interview: The Funk Brothers Documentary',
    excerpt: 'We sit down with the filmmakers behind the legendary Motown documentary.',
    category: 'Interviews',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
  },
];
