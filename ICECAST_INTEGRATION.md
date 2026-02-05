# 🎵 Интеграция Soul FM Hub с Icecast

## Обзор

Soul FM Hub может работать с любым Icecast-совместимым стриминг сервером. Эта документация объясняет, как подключить ваш Icecast сервер к платформе.

## Архитектура интеграции

```
[Auto DJ / Source] → [Icecast Server] → [Soul FM Hub] → [Listeners]
      ↓                      ↓                 ↓
   Metadata           Metadata API        Web Player
```

## Шаг 1: Настройка Icecast сервера

### Установка Icecast (если еще не установлен)

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install icecast2
```

#### macOS:
```bash
brew install icecast
```

### Базовая конфигурация Icecast

Отредактируйте `/etc/icecast2/icecast.xml`:

```xml
<icecast>
    <limits>
        <clients>100</clients>
        <sources>2</sources>
    </limits>

    <authentication>
        <source-password>YOUR_SOURCE_PASSWORD</source-password>
        <relay-password>YOUR_RELAY_PASSWORD</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>YOUR_ADMIN_PASSWORD</admin-password>
    </authentication>

    <hostname>stream.yourdomain.com</hostname>

    <listen-socket>
        <port>8000</port>
    </listen-socket>

    <mount>
        <mount-name>/stream</mount-name>
        <fallback-mount>/fallback.mp3</fallback-mount>
        <fallback-override>1</fallback-override>
    </mount>

    <!-- CORS Headers для web-плеера -->
    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*" />
        <header name="Access-Control-Allow-Headers" value="Origin, Accept, X-Requested-With, Content-Type" />
        <header name="Access-Control-Allow-Methods" value="GET, OPTIONS, HEAD" />
    </http-headers>
</icecast>
```

### Запуск Icecast

```bash
sudo systemctl start icecast2
sudo systemctl enable icecast2
```

## Шаг 2: Подключение к Soul FM Hub

### Обновите URL стрима в коде

Откройте `/src/app/components/RadioPlayer.tsx` и измените:

```typescript
const STREAM_URL = 'http://stream.yourdomain.com:8000/stream';
```

### Варианты URL

#### HTTP (незащищенное соединение):
```typescript
const STREAM_URL = 'http://stream.yourdomain.com:8000/stream';
```

#### HTTPS (рекомендуется):
```typescript
const STREAM_URL = 'https://stream.yourdomain.com/stream';
```

**Примечание:** Для HTTPS необходимо настроить reverse proxy (Nginx/Apache) с SSL сертификатом.

## Шаг 3: Настройка автоматического обновления метаданных

### Вариант A: Использование Icecast API

Создайте скрипт для опроса Icecast API:

```python
# icecast_sync.py
import requests
import time
import json

ICECAST_STATS_URL = 'http://stream.yourdomain.com:8000/status-json.xsl'
SOULFM_API = 'https://your-project.supabase.co/functions/v1/make-server-06086aa3'
API_KEY = 'your_api_key'

def get_icecast_metadata():
    response = requests.get(ICECAST_STATS_URL)
    data = response.json()
    source = data['icestats']['source']
    
    return {
        'title': source.get('title', ''),
        'artist': source.get('artist', ''),
        'listeners': source.get('listeners', 0),
        'bitrate': source.get('bitrate', '128'),
    }

def update_soulfm(metadata):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    }
    
    # Update now playing
    requests.post(
        f'{SOULFM_API}/stream/nowplaying',
        headers=headers,
        json={
            'track': {
                'title': metadata['title'],
                'artist': metadata['artist'],
            },
            'show': {
                'name': 'Live Stream',
                'isLive': True
            }
        }
    )
    
    # Update stream status
    requests.post(
        f'{SOULFM_API}/stream/status',
        headers=headers,
        json={
            'status': 'online',
            'listeners': metadata['listeners'],
            'bitrate': f"{metadata['bitrate']}kbps"
        }
    )

if __name__ == '__main__':
    while True:
        try:
            metadata = get_icecast_metadata()
            update_soulfm(metadata)
            print(f"Updated: {metadata['artist']} - {metadata['title']}")
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(10)  # Обновлять каждые 10 секунд
```

Запустите скрипт:
```bash
python3 icecast_sync.py
```

### Вариант B: Webhook от Auto DJ системы

Если вы используете Auto DJ (например, Liquidsoap, AzuraCast):

```javascript
// webhook_handler.js (пример для Node.js)
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const SOULFM_API = 'https://your-project.supabase.co/functions/v1/make-server-06086aa3';
const API_KEY = 'your_api_key';

app.post('/metadata', async (req, res) => {
    const { artist, title, album, cover } = req.body;
    
    try {
        await axios.post(
            `${SOULFM_API}/stream/nowplaying`,
            {
                track: { artist, title, album, cover },
                show: { name: 'Auto DJ', isLive: false }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => {
    console.log('Webhook handler listening on port 3001');
});
```

## Шаг 4: Настройка HTTPS для стриминга

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/stream
server {
    listen 443 ssl http2;
    server_name stream.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/stream.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stream.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, Accept, X-Requested-With, Content-Type' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/stream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Получение SSL сертификата (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d stream.yourdomain.com
```

## Шаг 5: Настройка Auto DJ

### Liquidsoap (рекомендуется)

Установка:
```bash
sudo apt install liquidsoap
```

Конфигурация (`radio.liq`):
```liquidsoap
#!/usr/bin/liquidsoap

# Настройки
set("log.file.path", "/var/log/liquidsoap/radio.log")
set("server.telnet", true)

# Музыкальная библиотека
music = playlist("/path/to/music")

# Джинглы между треками
jingles = playlist("/path/to/jingles")

# Микс с джинглами каждые 3 трека
radio = rotate(weights=[1,3], [jingles, music])

# Кроссфейд между треками
radio = crossfade(radio)

# Нормализация громкости
radio = normalize(radio)

# Отправка метаданных в Soul FM Hub
def send_metadata(m) =
    artist = m["artist"]
    title = m["title"]
    
    # Вызов вашего webhook
    ignore(http.post(
        "https://your-project.supabase.co/functions/v1/make-server-06086aa3/stream/nowplaying",
        headers=[
            ("Content-Type", "application/json"),
            ("Authorization", "Bearer YOUR_API_KEY")
        ],
        data='{"track":{"artist":"#{artist}","title":"#{title}"},"show":{"name":"Auto DJ","isLive":false}}'
    ))
end

# Регистрация обработчика метаданных
radio = on_metadata(send_metadata, radio)

# Вывод на Icecast
output.icecast(
    %mp3(bitrate=128),
    host="localhost",
    port=8000,
    password="YOUR_SOURCE_PASSWORD",
    mount="/stream",
    name="Soul FM Hub",
    description="The Wave of Your Soul",
    genre="Soul, Funk, Jazz",
    url="https://soulfm.radio",
    radio
)
```

Запуск Liquidsoap:
```bash
liquidsoap radio.liq
```

### AzuraCast (полнофункциональное решение)

AzuraCast - это готовое решение для радиостанций с веб-интерфейсом:

```bash
# Установка через Docker
cd /var/azuracast
curl -fsSL https://raw.githubusercontent.com/AzuraCast/AzuraCast/main/docker.sh > docker.sh
chmod a+x docker.sh
./docker.sh install
```

После установки:
1. Откройте `http://your-server:8000`
2. Создайте радиостанцию
3. Загрузите музыку
4. Настройте плейлисты
5. В настройках → Webhooks → добавьте Soul FM Hub webhook

## Шаг 6: Мониторинг и отладка

### Проверка стрима

```bash
# Проверка работы Icecast
curl http://localhost:8000/status-json.xsl

# Проверка метаданных
curl http://stream.yourdomain.com:8000/status-json.xsl | jq '.icestats.source'

# Прослушивание стрима
mpv http://stream.yourdomain.com:8000/stream
```

### Логи

```bash
# Icecast логи
tail -f /var/log/icecast2/error.log
tail -f /var/log/icecast2/access.log

# Liquidsoap логи
tail -f /var/log/liquidsoap/radio.log
```

### Тестирование в Soul FM Hub

1. Откройте консоль браузера (F12)
2. Перейдите на главную страницу
3. Нажмите Play на радиоплеере
4. Проверьте Network вкладку на наличие подключения к стриму
5. Проверьте Console на наличие ошибок

## Решение проблем

### Проблема: CORS ошибки

**Решение:** Убедитесь, что Icecast или Nginx настроены с правильными CORS заголовками.

### Проблема: Нет звука в браузере

**Решение:** 
- Проверьте, что стрим доступен по HTTPS (если сайт на HTTPS)
- Убедитесь, что формат аудио поддерживается (MP3 работает везде)

### Проблема: Метаданные не обновляются

**Решение:**
- Проверьте работу скрипта синхронизации
- Убедитесь, что Icecast отправляет метаданные
- Проверьте логи API запросов

## Дополнительные возможности

### Множественные качества стрима

```xml
<!-- В Icecast конфигурации -->
<mount>
    <mount-name>/stream-128</mount-name>
    <bitrate>128</bitrate>
</mount>

<mount>
    <mount-name>/stream-320</mount-name>
    <bitrate>320</bitrate>
</mount>
```

В Soul FM Hub добавьте переключатель качества в RadioPlayer.tsx.

### Статистика слушателей

Используйте Icecast API для получения статистики:

```javascript
// stats_collector.js
setInterval(async () => {
    const stats = await fetch('http://localhost:8000/status-json.xsl');
    const data = await stats.json();
    const listeners = data.icestats.source.listeners;
    
    // Отправка в Soul FM Hub
    await fetch(SOULFM_API + '/stream/status', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({ listeners })
    });
}, 30000); // Каждые 30 секунд
```

## Безопасность

1. **Используйте HTTPS** для всех соединений
2. **Защитите API ключи** - не храните в публичном коде
3. **Ограничьте доступ к Icecast админке** через файрволл
4. **Используйте сильные пароли** для Icecast
5. **Регулярно обновляйте** Icecast и зависимости

## Поддержка

Если возникли проблемы с интеграцией:

1. Проверьте логи Icecast
2. Проверьте Network вкладку в браузере
3. Убедитесь, что CORS настроен правильно
4. Проверьте формат аудио стрима

---

**Готово!** Ваша радиостанция Soul FM Hub теперь полностью интегрирована с Icecast! 🎵
