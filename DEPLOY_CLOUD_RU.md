# Деплой на Cloud.ru

## Шаг 1: Подготовка

### 1.1 Установите Docker

```bash
# macOS
brew install --cask docker

# Linux (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 1.2 Зарегистрируйтесь в Cloud.ru

- Перейдите на https://cloud.ru
- Войдите в личный кабинет

### 1.3 Создайте PostgreSQL базу данных

1. В личном кабинете найдите **Managed Databases** или **PostgreSQL**
2. Создайте новую базу данных
3. Сохраните connection string (например: `postgresql://user:pass@host:5432/db`)

---

## Шаг 2: Сборка и загрузка Docker образов

### 2.1 Создайте реестр в Artifact Registry

1. Перейдите в **Artifact Registry**
2. Нажмите **Создать реестр**
3. Укажите название (например: `kokojambo`)
4. Сохраните URI реестра (например: `kokojambo.cr.cloud.ru`)

### 2.2 Получите ключи доступа

1. Перейдите в **Управление доступом** → **Ключи доступа**
2. Создайте новый ключ
3. Сохраните `key_id` и `key_secret`

### 2.3 Авторизуйтесь в Docker

```bash
docker login <registry_name>.cr.cloud.ru -u <key_id> -p <key_secret>
```

### 2.4 Соберите и загрузите образы

**API Server:**

```bash
docker build --platform linux/amd64 -t <registry_name>.cr.cloud.ru/kokojambo-api:latest .
docker push <registry_name>.cr.cloud.ru/kokojambo-api:latest
```

**Scanner:**

```bash
docker build --platform linux/amd64 -t <registry_name>.cr.cloud.ru/kokojambo-scanner:latest -f Dockerfile.scanner .
docker push <registry_name>.cr.cloud.ru/kokojambo-scanner:latest
```

---

## Шаг 3: Создание Container Apps

### 3.1 Создайте API Container App

1. Перейдите в **Container Apps**
2. Нажмите **Создать Container App**
3. Заполните:
   - **Название**: `kokojambo-api`
   - **Реестр**: выберите ваш реестр
   - **Репозиторий**: `kokojambo-api`
   - **Тег**: `latest`
   - **Порт контейнера**: `8080`
4. **Переменные окружения** (Secrets):
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   BINGX_API_KEY=your_api_key
   BINGX_SECRET_KEY=your_secret_key
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_chat_id
   PORT=8080
   BASE_PATH=/
   ```
5. **Публичный адрес**: включите
6. Нажмите **Создать**

### 3.2 Создайте Scanner Container App

1. Перейдите в **Container Apps**
2. Нажмите **Создать Container App**
3. Заполните:
   - **Название**: `kokojambo-scanner`
   - **Реестр**: выберите ваш реестр
   - **Репозиторий**: `kokojambo-scanner`
   - **Тег**: `latest`
   - **Порт контейнера**: `8080` (сканер не использует, но нужен для платформы)
4. **Переменные окружения** (Secrets):
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   BINGX_API_KEY=your_api_key
   BINGX_SECRET_KEY=your_secret_key
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_chat_id
   DASHBOARD_URL=https://kokojambo-api.capp.cloud.ru
   REPLIT_DEPLOYMENT=1
   ```
5. **Публичный адрес**: выключите (сканер не требует публичного доступа)
6. **Масштабирование**: 1 инстанс (scanner должен быть один)
7. Нажмите **Создать**

---

## Шаг 4: Инициализация базы данных

После создания API подождите пока контейнер запустится, затем:

```bash
# Выполните миграцию БД
docker run --rm \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  <registry_name>.cr.cloud.ru/kokojambo-api:latest \
  npx drizzle-kit push
```

Или инициализируйте через API:

```bash
curl -X POST https://kokojambo-api.capp.cloud.ru/api/scanner/status \
  -H "Content-Type: application/json" \
  -d '{"isScanning": false, "isPaused": false}'
```

---

## Шаг 5: Проверка

1. Откройте https://kokojambo-api.capp.cloud.ru в браузере
2. Проверьте работу API:
   ```bash
   curl https://kokojambo-api.capp.cloud.ru/api/healthz
   curl https://kokojambo-api.capp.cloud.ru/api/scanner/status
   curl https://kokojambo-api.capp.cloud.ru/api/live-trading
   ```

---

## Управление

### Просмотр логов

```bash
# Через CLI cloud.ru или консоль управления
```

### Обновление версий

```bash
# Пересоберите образы с новым тегом
docker build -t <registry_name>.cr.cloud.ru/kokojambo-api:v2 .
docker push <registry_name>.cr.cloud.ru/kokojambo-api:v2

# В Container Apps выберите новую версию образа
```

### Мониторинг

- Включите логирование в Container Apps
- Настройте оповещения на ошибки

---

## Альтернатива: Docker Compose на VM

Если Container Apps не подходит, используйте VM:

1. Создайте VM с Docker
2. Установите Docker Compose
3. Скопируйте файлы:
   ```bash
   scp docker-compose.yml .env.example user@vm:~/
   ```
4. Настройте .env:
   ```bash
   cp .env.example .env
   nano .env  # введите реальные значения
   ```
5. Запустите:
   ```bash
   docker compose up -d
   ```

---

## Troubleshooting

### Контейнер не запускается

- Проверьте логи в Cloud.ru Console
- Убедитесь что переменные окружения заданы корректно
- Проверьте что DATABASE_URL доступен

### Ошибка подключения к БД

- Проверьте firewall/security groups для PostgreSQL
- Убедитесь что IP контейнера разрешен в БД

### Scanner не работает

- Проверьте что DASHBOARD_URL указывает на API
- Убедитесь что API запущен и работает
