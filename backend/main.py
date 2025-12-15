from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from enum import Enum
from typing import List, Optional
import uuid
import time
import random

app = FastAPI(title="Тихонов Клочкова онлайн мморпг 3 в ряд API")

# Модели данных
class ItemQuality(str, Enum):
    COMMON = "common"
    UNCOMMON = "uncommon" 
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"
    MYTHIC = "mythic"

class ItemType(str, Enum):
    WEAPON = "weapon"
    ARMOR = "armor"
    ACCESSORY = "accessory"

class Item(BaseModel):
    id: str = str(uuid.uuid4())
    name: str
    quality: ItemQuality
    type: ItemType
    health_bonus: int = 0
    attack_bonus: int = 0
    defense_bonus: int = 0

class Character(BaseModel):
    id: str = str(uuid.uuid4())
    name: str
    level: int = 1
    experience: int = 0
    health: int = 100
    items: List[Item] = []

class Player(BaseModel):
    id: str = str(uuid.uuid4())
    username: str
    email: str
    character: Character
    rating: int = 1000
    wins: int = 0
    losses: int = 0

class MatchResult(BaseModel):
    player_id: str
    opponent_id: str
    player_score: int
    opponent_score: int
    duration: float  # время в секундах
    winner_id: str
    reward_item: Optional[Item] = None

# Временные хранилища (заменить на базу данных в продакшене)
players_db: List[Player] = []
matches_db: List[MatchResult] = []

@app.get("/")
def read_root():
    return {"message": "Welcome to Тихонов Клочкова онлайн мморпг 3 в ряд API"}

@app.post("/players/", response_model=Player)
def create_player(player: Player):
    players_db.append(player)
    return player

@app.get("/players/", response_model=List[Player])
def get_players():
    return players_db

@app.get("/players/{player_id}", response_model=Player)
def get_player(player_id: str):
    for player in players_db:
        if player.id == player_id:
            return player
    raise HTTPException(status_code=404, detail="Player not found")

@app.put("/players/{player_id}", response_model=Player)
def update_player(player_id: str, updated_player: Player):
    for i, player in enumerate(players_db):
        if player.id == player_id:
            players_db[i] = updated_player
            return updated_player
    raise HTTPException(status_code=404, detail="Player not found")

@app.get("/matches/", response_model=List[MatchResult])
def get_matches():
    return matches_db

@app.get("/matches/{match_id}")
def get_match(match_id: str):
    for match in matches_db:
        if match.player_id == match_id or match.opponent_id == match_id:
            return match
    raise HTTPException(status_code=404, detail="Match not found")

@app.post("/matches/start")
def start_match(player_id: str, opponent_type: str = "bot"):
    # Логика начала матча
    # Возвращаем ID матча
    match_id = str(uuid.uuid4())
    return {"match_id": match_id}

@app.post("/matches/process", response_model=MatchResult)
def process_match_result(player_score: int, opponent_score: int, player_id: str, opponent_id: str = None):
    # Обработка результата матча на сервере
    start_time = time.time()
    
    # Если противник - бот, генерируем случайный результат
    if not opponent_id:
        opponent_score = random.randint(0, player_score + 100)  # чтобы был шанс проиграть
    
    # Рассчитываем победителя
    if player_score > opponent_score:
        winner_id = player_id
    elif opponent_score > player_score:
        # В этом случае победитель - оппонент, но у нас нет его ID, если это бот
        winner_id = opponent_id if opponent_id else "bot"
    else:
        # Ничья - победителем считается тот, у кого больше здоровья
        # Для простоты пусть побеждает игрок
        winner_id = player_id
    
    # Создаем результат матча
    match_result = MatchResult(
        player_id=player_id,
        opponent_id=opponent_id or "bot",
        player_score=player_score,
        opponent_score=opponent_score,
        duration=time.time() - start_time,
        winner_id=winner_id
    )
    
    # Добавляем награду
    if match_result.winner_id == player_id:
        # Генерируем случайный предмет как награду
        qualities = list(ItemQuality)
        quality = random.choice(qualities)
        types = list(ItemType)
        item_type = random.choice(types)
        
        reward = Item(
            name=f"{quality.value.title()} {item_type.value.title()}",
            quality=quality,
            type=item_type,
            health_bonus=random.randint(0, 10) if item_type == ItemType.ARMOR else 0,
            attack_bonus=random.randint(0, 10) if item_type == ItemType.WEAPON else 0,
            defense_bonus=random.randint(0, 5)
        )
        match_result.reward_item = reward
        
        # Добавляем предмет игроку
        for player in players_db:
            if player.id == player_id:
                player.character.items.append(reward)
                break
    
    matches_db.append(match_result)
    return match_result

# Запуск сервера
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)