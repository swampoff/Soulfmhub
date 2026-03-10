import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Radio,
  Music,
  Headphones,
  MapPin,
  MessageCircle,
  Play,
  Users,
  Mic2,
  Mountain,
  Waves,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';

interface CityData {
  name: string;
  nameEn: string;
  heroTitle: string;
  heroSubtitle: string;
  metaTitle: string;
  metaDescription: string;
  landmarks: { name: string; description: string; icon: typeof MapPin }[];
  competitors: { name: string; frequency: string; weakness: string }[];
  uniqueValue: string;
  seoText: string[];
  callToAction: string;
}

const CITIES: Record<string, CityData> = {
  calpe: {
    name: 'Кальпе',
    nameEn: 'Calpe',
    heroTitle: 'Soul FM Hub — Твоё душевное радио в Кальпе',
    heroSubtitle:
      'Слушай soul, funk и jazz у подножия Пеньон-де-Ифач — 24/7 онлайн',
    metaTitle:
      'Soul FM Hub — Soul, Funk & Jazz Radio в Кальпе | Слушай онлайн 24/7',
    metaDescription:
      'Слушай лучшее soul, funk и jazz радио в Кальпе у подножия Пеньон-де-Ифач. Soul FM Hub — онлайн-радио для ценителей настоящей музыки на Costa Blanca.',
    landmarks: [
      {
        name: 'Пеньон-де-Ифач (Peñón de Ifach)',
        description:
          'Слушай soul с видом на легендарную скалу высотой 330 метров — символ Costa Blanca',
        icon: Mountain,
      },
      {
        name: 'Playa del Arenal-Bol',
        description:
          'Funk и groove на главном пляже Кальпе с панорамой Средиземного моря',
        icon: Waves,
      },
      {
        name: 'Старый город и Torreó de la Peça',
        description:
          'Jazz в атмосфере средневековых улочек у башни XIV века',
        icon: MapPin,
      },
      {
        name: 'Plaça dels Mariners',
        description:
          'Neo-soul на Площади Моряков — сердце старого Кальпе',
        icon: Star,
      },
    ],
    competitors: [
      {
        name: 'Bay Radio',
        frequency: '98.5 / 89.4 FM',
        weakness: 'Pop и новости, нет soul/funk',
      },
      {
        name: 'XtraFM',
        frequency: '88.4 FM',
        weakness: 'All music — без жанровой специализации',
      },
      {
        name: 'Costa Blanca FM',
        frequency: 'Online',
        weakness: 'Hits 70s–today, нет soul/jazz фокуса',
      },
    ],
    uniqueValue:
      'Единственное онлайн-радио на Costa Blanca, полностью посвящённое soul, funk, jazz и R&B.',
    seoText: [
      'Представь: ты сидишь на террасе с видом на величественный Пеньон-де-Ифач, закат окрашивает Средиземное море в золото, а из колонок звучит глубокий soul Марвина Гэя или грув Джеймса Брауна. Это не мечта — это Soul FM Hub.',
      'В Кальпе есть Bay Radio, XtraFM и Costa Blanca FM. Но ни одна станция не даёт тебе чистый soul, funk, jazz и R&B без перерывов на попсу. Soul FM Hub — 10 000+ треков от классического Motown до современного neo-soul.',
      'Напиши нам прямо сейчас! Закажи любимый трек, отправь привет из Кальпе или стань частью нашего сообщества.',
    ],
    callToAction: 'Закажи трек с видом на Пеньон-де-Ифач!',
  },
  alicante: {
    name: 'Аликанте',
    nameEn: 'Alicante',
    heroTitle: 'Soul FM Hub — Звук души Аликанте',
    heroSubtitle:
      'Soul, funk и jazz для столицы Costa Blanca — слушай онлайн 24/7',
    metaTitle:
      'Soul FM Hub — Soul & Funk Radio Аликанте | Онлайн 24/7 | Costa Blanca',
    metaDescription:
      'Лучшее soul, funk, jazz и R&B радио в Аликанте. Слушай Soul FM Hub онлайн — идеальный саундтрек для жизни на Costa Blanca.',
    landmarks: [
      {
        name: 'Крепость Санта-Барбара',
        description:
          'Jazz на высоте — слушай Soul FM с видом на замок на горе Бенакантиль',
        icon: Mountain,
      },
      {
        name: 'Explanada de España',
        description:
          'Funk-прогулка по легендарному бульвару с мозаичной мостовой',
        icon: MapPin,
      },
      {
        name: 'Playa del Postiguet',
        description:
          'Soul на городском пляже у подножия крепости',
        icon: Waves,
      },
      {
        name: 'Barrio de Santa Cruz',
        description:
          'Neo-soul в узких улочках старого квартала с белыми домами',
        icon: Star,
      },
    ],
    competitors: [
      {
        name: 'Spectrum FM',
        frequency: '106.1 FM',
        weakness: 'Широкий формат — поп, ток-шоу, новости',
      },
      {
        name: 'Bay Radio',
        frequency: '89.4 FM',
        weakness: 'Поп-музыка и классифайды',
      },
      {
        name: 'XtraFM',
        frequency: '92.7 FM',
        weakness: 'All music — не специализируется',
      },
    ],
    uniqueValue:
      'Единственное англоязычное радио в Аликанте, играющее только soul, funk, jazz и R&B.',
    seoText: [
      'Аликанте — столица Costa Blanca, город с крепостью Санта-Барбара, живописным бульваром Explanada de España и тысячами экспатов из UK, NL, DE и Скандинавии. Всем им нужна музыка, которая говорит на языке души.',
      'Spectrum FM, Bay Radio, XtraFM — отличные станции, но они играют всё подряд. Soul FM Hub играет только то, что заставляет двигаться и чувствовать. 10 000+ треков, 20+ авторских шоу, качество 320kbps.',
      'Присоединяйся к 50 000+ слушателей! Напиши нам — расскажи, какой soul трек напоминает тебе об Аликанте.',
    ],
    callToAction: 'Напиши нам — расскажи свой Аликанте через музыку!',
  },
  denia: {
    name: 'Дения',
    nameEn: 'Dénia',
    heroTitle: 'Soul FM Hub — Музыка с душой у замка Дении',
    heroSubtitle:
      'Soul, jazz и funk для творческого города гастрономии ЮНЕСКО',
    metaTitle:
      'Soul FM Hub — Soul, Jazz & Funk Radio в Дении | Слушай у стен замка',
    metaDescription:
      'Soul FM Hub — онлайн-радио с лучшим soul, funk и jazz для Дении и Marina Alta. Музыка у подножия замка Дении и горы Монтго.',
    landmarks: [
      {
        name: 'Замок Дении (Castell de Dénia)',
        description:
          'Funk и groove у мавританского замка XI века с панорамой на море и Монтго',
        icon: Mountain,
      },
      {
        name: 'Гора Монтго (Montgó)',
        description:
          'Soul после горного хайкинга — природа и музыка в гармонии',
        icon: Mountain,
      },
      {
        name: 'Playa de Las Marinas',
        description:
          'Smooth jazz на 2 км золотого песка — идеальное утро',
        icon: Waves,
      },
      {
        name: 'Puerto de Dénia',
        description:
          'Neo-soul на закате в порту с видом на остров Ибица',
        icon: Star,
      },
    ],
    competitors: [
      {
        name: 'Bay Radio',
        frequency: '89.2 FM',
        weakness: 'Поп и новости, без soul/funk',
      },
      {
        name: 'XtraFM',
        frequency: '88.4 FM',
        weakness: 'All music без специализации',
      },
    ],
    uniqueValue:
      'В Дении только 2 англоязычные станции — и обе играют попсу. Soul FM Hub — первое soul/funk/jazz радио для Marina Alta.',
    seoText: [
      'Замок Дении возвышается над городом с XI века, охраняя берега Средиземного моря. Город, признанный ЮНЕСКО «Творческим городом гастрономии». А теперь у Дении есть Soul FM Hub — радио с душой.',
      'В Дении Bay Radio и XtraFM — единственные англоязычные альтернативы. Но если тебе нужен Stevie Wonder, а не Шакира — тебе к нам. 20+ уникальных шоу, заказ треков и посвящений.',
      'Не жди — напиши нам сейчас! Закажи трек, расскажи свою историю или предложи идею для шоу.',
    ],
    callToAction: 'Закажи трек у стен замка Дении!',
  },
  benidorm: {
    name: 'Бенидорм',
    nameEn: 'Benidorm',
    heroTitle: 'Soul FM Hub — Душа Бенидорма звучит в ритме funk',
    heroSubtitle:
      'Альтернатива мейнстриму — soul, funk и jazz для города небоскрёбов',
    metaTitle:
      'Soul FM Hub — Лучшее Soul & Funk Радио Бенидорма | Онлайн 24/7',
    metaDescription:
      'Soul FM Hub — soul, funk, jazz радио для Бенидорма. От пляжа Леванте до старого города — слушай настоящую музыку онлайн.',
    landmarks: [
      {
        name: 'Playa de Levante',
        description:
          'Утренний soul на легендарном пляже под небоскрёбами',
        icon: Waves,
      },
      {
        name: 'Balcón del Mediterráneo',
        description:
          'Jazz на закате с культовой смотровой площадки Бенидорма',
        icon: Star,
      },
      {
        name: 'Casco Antiguo (старый город)',
        description:
          'Funk в узких улочках — настоящий Бенидорм без туристических клише',
        icon: MapPin,
      },
      {
        name: 'Playa de Poniente',
        description:
          'R&B на западном пляже — 3 км спокойствия и стиля',
        icon: Waves,
      },
    ],
    competitors: [
      {
        name: 'XtraFM',
        frequency: '93.4 FM',
        weakness: 'All music — тот же формат везде',
      },
      {
        name: 'Spectrum FM',
        frequency: 'FM',
        weakness: 'Поп, новости, ток-шоу',
      },
      {
        name: 'Bay Radio',
        frequency: 'FM',
        weakness: 'Поп-микс и реклама',
      },
    ],
    uniqueValue:
      'Бенидорм перенасыщен поп-радио. Soul FM Hub — единственная станция, где Бенидорм звучит по-настоящему.',
    seoText: [
      'Бенидорм — небоскрёбы у моря, легендарные пляжи Леванте и Поньенте, бурная ночная жизнь и 200 000+ туристов каждый сезон. Но за блеском неоновых вывесок скрывается город с душой.',
      'XtraFM, Spectrum FM, Bay Radio — все играют одно и то же. Soul FM Hub — альтернатива для тех, кто ценит soul, funk, jazz и R&B. 10 000+ треков, 20+ шоу, 50 000+ слушателей.',
      'Владеете баром или рестораном в Бенидорме? Поставьте Soul FM Hub — стильный музыкальный фон вместо очередного Despacito. Напишите нам для партнёрства!',
    ],
    callToAction: 'Напиши нам — стань партнёром Soul FM в Бенидорме!',
  },
  altea: {
    name: 'Альтеа',
    nameEn: 'Altea',
    heroTitle: 'Soul FM Hub — Музыка для самого красивого города Costa Blanca',
    heroSubtitle:
      'Soul и jazz под голубым куполом Альтеа — слушай онлайн 24/7',
    metaTitle:
      'Soul FM Hub — Soul & Jazz Radio Альтеа | Самый красивый город Costa Blanca',
    metaDescription:
      'Soul FM Hub — идеальное soul, funk и jazz радио для Альтеа. Слушай у голубого купола, в старом городе, на набережной.',
    landmarks: [
      {
        name: 'Церковь Nuestra Señora del Consuelo',
        description:
          'Soul под знаменитым голубым куполом — символом Альтеа',
        icon: Star,
      },
      {
        name: 'Casco Antiguo (старый город)',
        description:
          'Jazz в лабиринте белоснежных улочек с галереями и кафе',
        icon: MapPin,
      },
      {
        name: 'Paseo Marítimo (набережная)',
        description:
          'Smooth jazz на вечерней прогулке вдоль моря',
        icon: Waves,
      },
      {
        name: 'Playa de l\'Olla',
        description:
          'Funk для загара у знаменитого островка напротив пляжа',
        icon: Waves,
      },
    ],
    competitors: [
      {
        name: 'Hot FM',
        frequency: '96.2 FM',
        weakness: 'Pop hits — без soul/jazz',
      },
      {
        name: 'XtraFM',
        frequency: '92.7 FM',
        weakness: 'All music без специализации',
      },
    ],
    uniqueValue:
      'В Альтеа — городе искусства — нет ни одной станции, посвящённой soul и jazz. Soul FM Hub заполняет этот пробел.',
    seoText: [
      'Альтеа — жемчужина Средиземноморья. Голубой купол церкви Nuestra Señora del Consuelo, белоснежные домики старого города, узкие мощёные улочки с галереями. Город, созданный для soul музыки.',
      'Альтеа — город искусства. Галереи, мастерские, факультет изящных искусств. Soul, jazz и funk — это тоже искусство. Soul FM Hub — радио для тех, кто понимает красоту звука.',
      'Ты художник из Альтеа? Музыкант? Просто ценитель? Напиши нам свою историю — мы посвятим тебе трек в эфире.',
    ],
    callToAction: 'Напиши свою историю — мы посвятим тебе трек!',
  },
  valencia: {
    name: 'Валенсия',
    nameEn: 'Valencia',
    heroTitle: 'Soul FM Hub — Саундтрек великого города',
    heroSubtitle:
      'Soul, funk и jazz от Города Искусств до Эль Кармен — онлайн 24/7',
    metaTitle:
      'Soul FM Hub — Soul, Funk & Jazz Radio Валенсия | Город Искусств и музыки души',
    metaDescription:
      'Soul FM Hub — лучшее soul, funk, jazz и R&B онлайн-радио для Валенсии. От Города Искусств до Эль Кармен — музыка с душой 24/7.',
    landmarks: [
      {
        name: 'Ciudad de las Artes y las Ciencias',
        description:
          'Jazz у футуристических зданий Калатравы — архитектура и музыка будущего',
        icon: Star,
      },
      {
        name: 'Barrio del Carmen',
        description:
          'Funk в самом богемном районе Валенсии — стрит-арт и грув',
        icon: MapPin,
      },
      {
        name: 'Jardines del Turia',
        description:
          'Soul music для пробежки по 9-километровому парку в русле старой реки',
        icon: Mountain,
      },
      {
        name: 'Playa de la Malvarrosa',
        description:
          'R&B на закате у моря — пляж, вдохновлявший художника Соролью',
        icon: Waves,
      },
    ],
    competitors: [
      {
        name: 'Radio City Valencia',
        frequency: 'Venue + Stream',
        weakness: 'Клуб, не онлайн-радио — ограниченный охват',
      },
      {
        name: 'Bay Radio',
        frequency: '89.2 FM',
        weakness: 'Новости и поп-музыка',
      },
      {
        name: 'Soul Radio Live',
        frequency: '101.9 FM',
        weakness: 'Только на испанском языке',
      },
    ],
    uniqueValue:
      'Единственное англоязычное онлайн-радио в Валенсии, на 100% посвящённое soul, funk, jazz и R&B.',
    seoText: [
      'Валенсия — третий по величине город Испании, родина паэльи, дом футуристического Города Искусств и Наук Сантьяго Калатравы. Город с 2000-летней историей и бесконечной креативной энергией.',
      'Radio City Valencia — venue с live funk и soul, но это клуб. Bay Radio — новости и поп. Soul Radio Live — на испанском. Soul FM Hub — единственное англоязычное радио, полностью посвящённое soul, funk, jazz и R&B.',
      'Валенсия — 800 000 жителей и огромное экспат-сообщество. Британцы, немцы, голландцы, скандинавы — все ищут качественное радио. Действуй — напиши нам, закажи трек или предложи партнёрство!',
    ],
    callToAction: 'Стань частью Soul FM в Валенсии — напиши нам!',
  },
};

const CITY_SLUGS = Object.keys(CITIES);

export function CityLandingPage() {
  const { city } = useParams<{ city: string }>();
  const navigate = useNavigate();

  if (!city || !CITIES[city]) {
    return <Navigate to="/" replace />;
  }

  const data = CITIES[city];

  // Set document title for SEO
  React.useEffect(() => {
    document.title = data.metaTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', data.metaDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = data.metaDescription;
      document.head.appendChild(meta);
    }
  }, [data]);

  const otherCities = CITY_SLUGS.filter((s) => s !== city);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0533]/90 via-[#0d1b2a]/80 to-[#1a0533]/90" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#00d9ff]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FF8C42]/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white/80 mb-6">
              <MapPin className="w-4 h-4 text-[#00d9ff]" />
              <span>
                {data.nameEn}, Costa Blanca, Spain
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {data.heroTitle}
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              {data.heroSubtitle}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#00d9ff] to-[#0088cc] text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-[#00d9ff]/25 transition-all"
                onClick={() => navigate('/stream')}
              >
                <Play className="w-5 h-5 mr-2" />
                Слушать сейчас
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-3 rounded-xl"
                onClick={() => navigate('/contact')}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Написать нам
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#FF8C42]/40 text-[#FF8C42] hover:bg-[#FF8C42]/10 px-8 py-3 rounded-xl"
                onClick={() => navigate('/request-song')}
              >
                <Music className="w-5 h-5 mr-2" />
                Заказать трек
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-b border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Слушателей', value: '50K+', icon: Users },
            { label: 'Эфир', value: '24/7', icon: Radio },
            { label: 'Шоу и подкастов', value: '20+', icon: Mic2 },
            { label: 'Треков', value: '10K+', icon: Music },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <stat.icon className="w-8 h-8 text-[#00d9ff] mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Soul FM + Unique Value */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Почему {data.name} выбирает Soul FM Hub?
            </h2>
            <Card className="bg-gradient-to-r from-[#00d9ff]/10 to-[#FF8C42]/10 border-[#00d9ff]/20 p-6 mb-8">
              <p className="text-lg text-[#00d9ff] font-semibold text-center">
                {data.uniqueValue}
              </p>
            </Card>

            <div className="space-y-6">
              {data.seoText.map((paragraph, i) => (
                <p key={i} className="text-white/70 text-lg leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Landmarks */}
      <section className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Где слушать Soul FM Hub в {data.nameEn}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {data.landmarks.map((landmark, i) => (
              <motion.div
                key={landmark.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 p-6 hover:border-[#00d9ff]/30 transition-colors h-full">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[#00d9ff]/10">
                      <landmark.icon className="w-6 h-6 text-[#00d9ff]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {landmark.name}
                      </h3>
                      <p className="text-white/60">{landmark.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitors Comparison */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Радиостанции в {data.nameEn} — и почему Soul FM Hub лучше
          </h2>
          <div className="space-y-4">
            {data.competitors.map((comp) => (
              <Card
                key={comp.name}
                className="bg-white/5 border-white/10 p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold">{comp.name}</h3>
                    <p className="text-white/40 text-sm">{comp.frequency}</p>
                  </div>
                  <div className="text-white/50 text-sm md:text-right">
                    {comp.weakness}
                  </div>
                </div>
              </Card>
            ))}
            <Card className="bg-gradient-to-r from-[#00d9ff]/15 to-[#FF8C42]/15 border-[#00d9ff]/30 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-[#00d9ff] font-bold text-lg">
                    Soul FM Hub
                  </h3>
                  <p className="text-white/60 text-sm">
                    Online 24/7 — 128kbps AAC / 320kbps MP3
                  </p>
                </div>
                <div className="text-[#00ffaa] text-sm font-semibold md:text-right">
                  100% Soul, Funk, Jazz & R&B
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-br from-[#1a0533] to-[#0d1b2a] border-[#00d9ff]/20 p-10">
              <Headphones className="w-16 h-16 text-[#00d9ff] mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">
                {data.callToAction}
              </h2>
              <p className="text-white/60 mb-8 text-lg">
                50 000+ слушателей, 10 000+ треков, 20+ шоу. Стань частью Soul FM Hub!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#00d9ff] to-[#0088cc] text-white font-semibold px-8 rounded-xl"
                  onClick={() => navigate('/stream')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Слушать 24/7
                </Button>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#FF8C42] to-[#FF6B1A] text-white font-semibold px-8 rounded-xl"
                  onClick={() => navigate('/contact')}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Написать нам
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 px-8 rounded-xl"
                  onClick={() => navigate('/request-song')}
                >
                  <Music className="w-5 h-5 mr-2" />
                  Заказать трек
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Other Cities */}
      <section className="py-16 px-4 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Soul FM Hub также слушают в
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {otherCities.map((slug) => (
              <Button
                key={slug}
                variant="outline"
                className="border-white/10 text-white/70 hover:text-[#00d9ff] hover:border-[#00d9ff]/30 rounded-xl"
                onClick={() => navigate(`/city/${slug}`)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {CITIES[slug].nameEn}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RadioStation',
            name: 'Soul FM Hub',
            description: data.metaDescription,
            url: 'https://soulfm.radio',
            areaServed: {
              '@type': 'City',
              name: data.nameEn,
              containedInPlace: {
                '@type': 'Country',
                name: 'Spain',
              },
            },
            genre: ['Soul', 'Funk', 'Jazz', 'R&B', 'Neo-Soul'],
            broadcastFrequency: 'Online',
            broadcaster: {
              '@type': 'Organization',
              name: 'Soul FM Hub',
            },
          }),
        }}
      />
    </div>
  );
}
