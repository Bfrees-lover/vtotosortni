from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import uuid
from enum import Enum

# Импортируем модели, которые совпадают с backend
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

# Временные хранилища для демонстрации (в реальности подключались бы к общей БД или API)
players_db_admin: List[Player] = []
matches_db_admin: List[MatchResult] = []

app = FastAPI(title="Тихонов Клочкова Admin Panel")

@app.get("/")
def admin_root():
    return {"message": "Welcome to Admin Panel for Тихонов Клочкова онлайн мморпг 3 в ряд"}

# CRUD для игроков
@app.get("/admin/players", response_model=List[Player])
def get_all_players():
    # В реальности этот метод бы запрашивал данные из основного API или БД
    return players_db_admin

@app.get("/admin/players/{player_id}", response_model=Player)
def get_player_by_id(player_id: str):
    for player in players_db_admin:
        if player.id == player_id:
            return player
    raise HTTPException(status_code=404, detail="Player not found")

@app.delete("/admin/players/{player_id}")
def remove_player(player_id: str):
    global players_db_admin
    players_db_admin = [p for p in players_db_admin if p.id != player_id]
    return {"message": f"Player {player_id} removed successfully"}

# CRUD для предметов
@app.get("/admin/items", response_model=List[Item])
def get_all_items():
    all_items = []
    for player in players_db_admin:
        all_items.extend(player.character.items)
    return all_items

@app.post("/admin/players/{player_id}/items", response_model=Item)
def give_item_to_player(player_id: str, item: Item):
    for player in players_db_admin:
        if player.id == player_id:
            player.character.items.append(item)
            return item
    raise HTTPException(status_code=404, detail="Player not found")

@app.delete("/admin/players/{player_id}/items/{item_id}")
def remove_item_from_player(player_id: str, item_id: str):
    for player in players_db_admin:
        if player.id == player_id:
            player.character.items = [item for item in player.character.items if item.id != item_id]
            return {"message": f"Item {item_id} removed from player {player_id}"}
    raise HTTPException(status_code=404, detail="Player not found")

# Просмотр матчей
@app.get("/admin/matches", response_model=List[MatchResult])
def get_all_matches():
    return matches_db_admin

@app.get("/admin/matches/{match_id}", response_model=MatchResult)
def get_match_by_id(match_id: str):
    for match in matches_db_admin:
        if match.player_id == match_id or match.opponent_id == match_id:
            return match
    raise HTTPException(status_code=404, detail="Match not found")

# Синхронизация с основным API (в реальности было бы подключение к API backend)
@app.post("/admin/sync")
def sync_with_main_api():
    # Здесь была бы логика синхронизации с основным API
    # Например, запрос всех игроков и матчей с основного сервера
    return {"message": "Sync completed", "players_count": len(players_db_admin), "matches_count": len(matches_db_admin)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)