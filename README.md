# nurl.pw

Передача файлов между устройствами без регистрации: загрузили файлы, получили ссылку, QR-код или 6-символьный код и открыли на другом устройстве.

- Папки бывают публичные, приватные (с паролем) и одноразовые (удаляются после первого скачивания).
- Срок хранения зависит от размера: **1 ч: 16 ГБ · 12 ч: 8 ГБ · 1 день: 4 ГБ · 3 дня: 2 ГБ**. Просроченные папки удаляются автоматически.

**Стек:** Next.js 16 · FastAPI · PostgreSQL 17 (SQLAlchemy + Alembic) · Caddy · Docker Compose

```
backend/     API: app/core (конфиг, БД, хранилище), app/features (drops, health), alembic/
frontend/    UI: src/app (страницы), src/features (экраны), src/shared (ui, lib)
Caddyfile    /api/* → backend, остальное → frontend, автоматический HTTPS
```

## Деплой на сервер

Нужны Linux-сервер с Docker (Compose v2), открытые порты **80** и **443** и A-запись домена, указывающая на IP сервера.

```bash
git clone <repo-url> nurl && cd nurl
cp .env.example .env
nano .env
docker compose up -d --build
```

Что заполнить в `.env`:

| Переменная | Значение |
|---|---|
| `SITE_ADDRESS` | ваш домен, например `nurl.pw`. Caddy сам выпустит и будет продлевать сертификат |
| `POSTGRES_PASSWORD` | надёжный пароль без символов `@ : / ? #` |
| `SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `STORAGE_QUOTA_GB` | лимит диска под файлы (`0` = без лимита) |
| `MAX_FILES_PER_DROP` | максимум файлов в одной папке |

Миграции БД применяются автоматически при старте backend. Swagger доступен по адресу `https://<домен>/api/docs`.

**Обслуживание:**

```bash
git pull && docker compose up -d --build   # обновление
docker compose logs -f backend             # логи
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > db.sql   # бэкап БД
```

Данные лежат в volume'ах `pg_data` (БД), `uploads` (файлы) и `caddy_data` (сертификаты).

## Локальный запуск

```bash
cp .env.example .env
docker compose up -d --build
```

Откроется на http://localhost (при `SITE_ADDRESS=:80`). Остановить: `docker compose down` (с удалением данных: `down -v`).

## Разработка

Нужны [uv](https://docs.astral.sh/uv/) и Node.js 20+. База поднимается в Docker:

```bash
docker compose up -d db
```

Backend (берёт `DATABASE_URL` из корневого `.env`):

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Frontend (в `frontend/.env.local` укажите `NEXT_PUBLIC_API_URL=http://localhost:8000`):

```bash
cd frontend
npm install
npm run dev
```

Новая миграция после изменения моделей: `uv run alembic revision --autogenerate -m "описание"`.
