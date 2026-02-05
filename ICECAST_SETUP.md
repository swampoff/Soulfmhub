# 🎵 Icecast Stream Setup для Soul FM Hub

## 🎯 БЫСТРЫЙ СТАРТ

### Вариант 1: Использовать тестовый публичный stream (для demo)

```typescript
// /src/app/components/RadioPlayer.tsx (строка 14)

// Option 1: Exclusively Soul Radio (публичный)
const STREAM_URL = 'https://streaming.radio.co/s2c3cc784b/listen';

// Option 2: Soul Jazz Radio (публичный)
const STREAM_URL = 'https://streamer.radio.co/s8a3416327/listen';

// Option 3: Smooth Jazz Radio
const STREAM_URL = 'https://stream-161.zeno.fm/9sd3n7zvs3duv';
```

### Вариант 2: Твой собственный Icecast сервер

```typescript
// Формат URL:
const STREAM_URL = 'https://your-server.com:8000/stream';

// Или HTTP (не рекомендуется для production):
const STREAM_URL = 'http://your-server.com:8000/stream.mp3';
```

---

## 🔧 НАСТРОЙКА СОБСТВЕННОГО ICECAST

### 1. **Установка Icecast Server**

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install icecast2
```

#### Docker (рекомендуется):
```bash
docker run -d \
  --name icecast \
  -p 8000:8000 \
  -e ICECAST_ADMIN_PASSWORD=hackme \
  -e ICECAST_SOURCE_PASSWORD=hackme \
  -e ICECAST_RELAY_PASSWORD=hackme \
  moul/icecast
```

### 2. **Конфигурация Icecast** (`/etc/icecast2/icecast.xml`)

```xml
<icecast>
    <location>Soul FM Studios</location>
    <admin>admin@soulfm.radio</admin>
    
    <limits>
        <clients>100</clients>
        <sources>2</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <authentication>
        <source-password>your-source-password</source-password>
        <relay-password>your-relay-password</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>your-admin-password</admin-password>
    </authentication>

    <hostname>stream.soulfm.radio</hostname>
    
    <listen-socket>
        <port>8000</port>
        <bind-address>0.0.0.0</bind-address>
    </listen-socket>

    <!-- ВАЖНО: CORS для браузерного воспроизведения -->
    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*" />
        <header name="Access-Control-Allow-Methods" value="GET, POST, OPTIONS" />
        <header name="Access-Control-Allow-Headers" value="Content-Type" />
    </http-headers>

    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status.xsl"/>
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>

    <security>
        <chroot>0</chroot>
    </security>
</icecast>
```

### 3. **Создание Mount Point** (добавь в icecast.xml)

```xml
<mount>
    <mount-name>/stream</mount-name>
    <username>source</username>
    <password>your-source-password</password>
    <max-listeners>100</max-listeners>
    <dump-file>/var/log/icecast2/stream-dump.mp3</dump-file>
    <burst-size>65536</burst-size>
    <fallback-mount>/fallback.mp3</fallback-mount>
    <fallback-override>1</fallback-override>
    
    <stream-name>Soul FM Hub - 24/7 Soul, Funk, Jazz</stream-name>
    <stream-description>The Wave of Your Soul</stream-description>
    <stream-url>https://soulfm.radio</stream-url>
    <genre>Soul, Funk, Jazz, Disco, Reggae</genre>
    <bitrate>128</bitrate>
    <type>audio/mpeg</type>
    <public>1</public>
    
    <!-- Метаданные -->
    <mp3-metadata-interval>8192</mp3-metadata-interval>
</mount>
```

### 4. **Запуск Icecast**

```bash
# Start service
sudo systemctl start icecast2
sudo systemctl enable icecast2

# Check status
sudo systemctl status icecast2

# View logs
sudo tail -f /var/log/icecast2/error.log
```

### 5. **Проверка доступности**

```bash
# Проверь, что Icecast работает
curl http://localhost:8000/status.xsl

# Должен вернуть HTML страницу со статусом
```

---

## 🎙️ AUTO DJ SETUP

### Option A: Liquidsoap (мощный, но сложный)

```bash
# Установка
sudo apt install liquidsoap

# Конфиг файл: /etc/liquidsoap/soul-fm.liq
```

**soul-fm.liq:**
```ruby
#!/usr/bin/liquidsoap

# Logging
set("log.file.path","/var/log/liquidsoap/soul-fm.log")
set("log.level",3)

# Music library paths
soul_dir = "/music/soul"
funk_dir = "/music/funk"
jazz_dir = "/music/jazz"

# Create playlists
soul = playlist(soul_dir, reload=3600)
funk = playlist(funk_dir, reload=3600)
jazz = playlist(jazz_dir, reload=3600)

# Mix genres with weights
radio = random(weights=[2,2,1], [soul, funk, jazz])

# Normalize audio
radio = normalize(radio)

# Add crossfade between tracks
radio = crossfade(start_next=3.0, fade_in=3.0, fade_out=3.0, radio)

# Connect to Icecast
output.icecast(
  %mp3(bitrate=128),
  host = "localhost",
  port = 8000,
  password = "your-source-password",
  mount = "/stream",
  name = "Soul FM Hub",
  description = "24/7 Soul, Funk, Jazz Radio",
  genre = "Soul/Funk",
  url = "https://soulfm.radio",
  radio
)
```

**Запуск:**
```bash
liquidsoap /etc/liquidsoap/soul-fm.liq
```

### Option B: Azuracast (проще, веб-интерфейс)

```bash
# Docker установка
cd /var/azuracast
bash docker.sh install

# Или используй готовый hosting:
# https://www.azuracast.com/
```

**Преимущества Azuracast:**
- ✅ Веб UI для управления
- ✅ Auto DJ из коробки
- ✅ Плейлисты и расписание
- ✅ Метаданные автоматически
- ✅ Статистика слушателей
- ✅ Интеграция с Icecast

### Option C: OBS Studio + Browser Source (для live streaming)

1. Установи OBS Studio
2. Добавь Audio Input источник
3. Settings → Stream:
   - Stream Type: Custom
   - URL: `icecast://your-server:8000/stream`
   - Stream Key: `source:your-source-password`

---

## 🔒 NGINX REVERSE PROXY (для HTTPS)

### nginx.conf:
```nginx
server {
    listen 443 ssl http2;
    server_name stream.soulfm.radio;

    ssl_certificate /etc/letsencrypt/live/stream.soulfm.radio/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stream.soulfm.radio/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS Headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type';
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name stream.soulfm.radio;
    return 301 https://$server_name$request_uri;
}
```

**Получить SSL:**
```bash
sudo certbot --nginx -d stream.soulfm.radio
```

---

## 🎵 STREAM URL В SOUL FM HUB

После настройки, обнови в коде:

```typescript
// /src/app/components/RadioPlayer.tsx

// Твой собственный Icecast:
const STREAM_URL = 'https://stream.soulfm.radio/stream';

// Или с портом (если без nginx):
const STREAM_URL = 'https://stream.soulfm.radio:8000/stream';
```

---

## 🧪 ТЕСТИРОВАНИЕ STREAM

### 1. **Браузер:**
```javascript
// Console
const audio = new Audio('https://stream.soulfm.radio/stream');
audio.play();
```

### 2. **VLC Player:**
```bash
vlc https://stream.soulfm.radio/stream
```

### 3. **curl:**
```bash
curl -I https://stream.soulfm.radio/stream
# Должен вернуть: Content-Type: audio/mpeg
```

### 4. **Проверка метаданных:**
```bash
curl https://stream.soulfm.radio/stream -o /dev/null -D -
```

---

## 📊 МОНИТОРИНГ

### Icecast Admin:
```
https://stream.soulfm.radio/admin/
Username: admin
Password: your-admin-password
```

### Статистика слушателей:
```
https://stream.soulfm.radio/status.xsl
```

### API для интеграции:
```bash
# JSON status
curl https://stream.soulfm.radio/status-json.xsl

# Парсинг в Soul FM Hub:
# Можно получить текущее количество слушателей
```

---

## 🚀 PRODUCTION CHECKLIST

- [ ] HTTPS настроен (SSL certificate)
- [ ] CORS headers включены
- [ ] Firewall открыт для порта 8000
- [ ] Сильные пароли для admin/source/relay
- [ ] Backup конфигурации Icecast
- [ ] Auto-restart настроен (systemd)
- [ ] Мониторинг uptime
- [ ] CDN для stream (опционально, для масштабирования)

---

## 💡 АЛЬТЕРНАТИВЫ (Managed Hosting)

Если не хочешь настраивать сервер:

1. **Radio.co** - https://radio.co
   - От $10/месяц
   - Auto DJ включен
   - Готовый stream URL

2. **Stream.io** - https://stream.io
   - От $15/месяц
   - Unlimited listeners

3. **Shoutcast** - https://shoutcast.com
   - Классический вариант
   - Похож на Icecast

4. **Live365** - https://live365.com
   - Полный сервис
   - Лицензии на музыку включены

---

## 🎯 РЕКОМЕНДАЦИЯ

**Для быстрого старта:**
→ Используй тестовый публичный stream

**Для серьезного проекта:**
→ Radio.co или Azuracast (managed)

**Для полного контроля:**
→ Свой VPS + Icecast + Liquidsoap

---

**После настройки stream, не забудь обновить URL в RadioPlayer.tsx!** 🎵
