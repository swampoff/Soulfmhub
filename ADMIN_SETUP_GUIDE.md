# Soul FM Hub - Admin Setup Guide

## Назначение Super Admin роли

### Метод 1: Через Web UI (Рекомендуется)

1. Убедитесь что пользователь зарегистрирован в системе
2. Войдите в систему с любым аккаунтом
3. Перейдите на `/admin/setup`
4. Введите email пользователя: `niqbello@gmail.com`
5. Нажмите "Assign Super Admin Role"

### Метод 2: Через API напрямую (curl)

#### Шаг 1: Убедитесь что пользователь зарегистрирован

Сначала убедитесь, что пользователь `niqbello@gmail.com` зарегистрирован в системе. Если нет, создайте его через `/auth`:

```bash
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-06086aa3/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "niqbello@gmail.com",
    "password": "NIk4873835",
    "name": "Niko Bello"
  }'
```

#### Шаг 2: Назначьте роль Super Admin

```bash
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-06086aa3/admin/assign-super-admin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "niqbello@gmail.com"
  }'
```

**Ожидаемый ответ:**

```json
{
  "message": "Super Admin role assigned successfully",
  "user": {
    "id": "user_id_here",
    "email": "niqbello@gmail.com",
    "name": "Niko Bello",
    "role": "super_admin"
  }
}
```

### Метод 3: Через Browser Console

Откройте DevTools Console на странице приложения и выполните:

```javascript
// Получите project ID и anon key из utils/supabase/info
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Назначьте super admin роль
const assignSuperAdmin = async (email) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/admin/assign-super-admin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email }),
    }
  );
  
  const data = await response.json();
  console.log('Result:', data);
  return data;
};

// Выполните назначение
assignSuperAdmin('niqbello@gmail.com');
```

## Проверка роли пользователя

Чтобы проверить текущую роль пользователя:

```bash
curl "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-06086aa3/admin/user-by-email?email=niqbello@gmail.com" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ответ:**

```json
{
  "user": {
    "id": "user_id",
    "email": "niqbello@gmail.com",
    "name": "Niko Bello",
    "role": "super_admin",
    "createdAt": "2026-02-05T..."
  }
}
```

## Роли в системе

Soul FM Hub поддерживает следующие роли:

- `listener` - обычный слушатель (по умолчанию)
- `dj` - DJ с правами на загрузку треков и управление плейлистами
- `host` - ведущий шоу
- `music_curator` - музыкальный куратор
- `content_manager` - менеджер контента (новости, блоги)
- `program_director` - программный директор
- `super_admin` - супер администратор с полным доступом

## После назначения роли

После успешного назначения роли `super_admin`, пользователь сможет:

1. Войти в систему с email `niqbello@gmail.com` и паролем `NIk4873835`
2. Получить доступ ко всем административным панелям
3. Управлять другими пользователями и их ролями
4. Загружать треки через `/admin/tracks`
5. Управлять плейлистами, расписанием, шоу и донатами
6. Назначать роли другим пользователям

## Текущее состояние системы

✅ Backend server готов к работе
✅ Endpoint для назначения ролей создан
✅ Web UI для setup создан
✅ Система загрузки треков работает
✅ Генерация коротких ссылок (soulfm.stream/xxxxx) активна
✅ Автоматическое добавление тега "NEWFUNK" работает
✅ Интеграция с Icecast готова (требует настройки сервера)

## Быстрый старт

1. Зарегистрируйтесь с email `niqbello@gmail.com` и паролем `NIk4873835` через страницу `/auth`
2. Перейдите на `/admin/setup` (войдите с любым аккаунтом)
3. Введите email `niqbello@gmail.com` и нажмите "Assign Super Admin Role"
4. Выйдите и войдите снова с учетными данными `niqbello@gmail.com`
5. Теперь у вас полный доступ к админ панели!

## Troubleshooting

### Ошибка "User not found"
- Убедитесь что пользователь сначала зарегистрировался через `/auth`
- Проверьте правильность email адреса

### Ошибка "Invalid secret key"
- Для первого setup secret key не требуется
- Если все равно требуется, используйте: `soulfm-admin-setup-2024`

### Нет доступа к админ панели после назначения роли
- Выйдите из системы полностью
- Очистите cookies и localStorage
- Войдите снова с обновленными учетными данными
