# Тихонов Клочкова онлайн мморпг 3 в ряд - Деплоймент

## Архитектура приложения

Проект состоит из следующих компонентов:

1. **Frontend** - веб-интерфейс на HTML/CSS/JavaScript с игрой "три в ряд"
2. **Backend** - API на FastAPI для обработки игровой логики
3. **Admin Panel** - панель администратора для управления игроками и предметами
4. **Kafka Processor** - сервис обработки матчей через Apache Kafka
5. **Apache Kafka** - брокер сообщений для асинхронной обработки матчей
6. **Zookeeper** - для координации Kafka

## Запуск приложения

### С использованием Docker Compose (рекомендуется)

1. Убедитесь, что у вас установлены Docker и Docker Compose
2. В корневой директории проекта выполните:

```bash
docker-compose up --build
```

3. Приложение будет доступно по следующим адресам:
   - Игра: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8001

### Ручной запуск

1. Установите зависимости для backend:
```bash
pip install -r backend/requirements.txt
```

2. Запустите Kafka и Zookeeper (например, через Docker)

3. Запустите backend:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

4. Запустите admin panel:
```bash
cd admin_panel
uvicorn main:app --host 0.0.0.0 --port 8001
```

5. Запустите обработчик Kafka:
```bash
python kafka_handlers/match_processor.py
```

6. Запустите frontend (например, через простой HTTP сервер):
```bash
cd frontend/public
python -m http.server 3000
```

## Особенности реализации

### Игровая механика "три в ряд"
- Игровое поле 8x8 с 6 типами камней
- Возможность обмена соседними камнями
- Автоматическое обнаружение и удаление линий из 3+ одинаковых камней
- Каскадное заполнение новыми камнями после удаления совпадений

### Система матчей
- Ограничение по времени: 45 секунд на матч
- При истечении времени побеждает игрок с большим количеством здоровья
- В обычной игре побеждает игрок с большим количеством очков
- Результаты матчей обрабатываются на сервере через Kafka

### Система предметов
- 6 уровней качества предметов: common, uncommon, rare, epic, legendary, mythic
- 3 типа предметов: weapon, armor, accessory
- Предметы дают бонусы к здоровью, атаке и защите

### Рейтинговая система
- Система рейтинга Эло для определения силы игроков
- Отслеживание побед и поражений

### Админ-панель
- Просмотр всех игроков и их статистики
- Просмотр всех матчей
- Возможность выдавать и забирать предметы у игроков
- Просмотр инвентаря игроков

## Структура API

### Backend endpoints:
- `GET /` - Главная страница API
- `POST /players/` - Создать игрока
- `GET /players/` - Получить всех игроков
- `GET /players/{player_id}` - Получить конкретного игрока
- `PUT /players/{player_id}` - Обновить игрока
- `GET /matches/` - Получить все матчи
- `POST /matches/process` - Обработать результат матча

### Admin Panel endpoints:
- `GET /admin/players` - Получить всех игроков
- `GET /admin/players/{player_id}` - Получить конкретного игрока
- `DELETE /admin/players/{player_id}` - Удалить игрока
- `GET /admin/items` - Получить все предметы
- `POST /admin/players/{player_id}/items` - Выдать предмет игроку
- `DELETE /admin/players/{player_id}/items/{item_id}` - Забрать предмет у игрока
- `GET /admin/matches` - Получить все матчи
- `GET /admin/matches/{match_id}` - Получить конкретный матч
- `POST /admin/sync` - Синхронизировать с основным API

## Технологии

- **Backend**: Python, FastAPI, Pydantic
- **Frontend**: HTML, CSS, JavaScript (без дополнительных фреймворков)
- **Сообщения**: Apache Kafka, aiokafka
- **Контейнеризация**: Docker, Docker Compose
- **Асинхронность**: asyncio