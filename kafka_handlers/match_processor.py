from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
import asyncio
import json
import uuid
from datetime import datetime
import random
from enum import Enum

# Определение моделей данных
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

class MatchProcessor:
    def __init__(self, kafka_host='localhost', kafka_port=9092):
        self.kafka_host = kafka_host
        self.kafka_port = kafka_port
        self.consumer = None
        self.producer = None
        self.running = False

    async def start(self):
        """Запуск обработчика Kafka"""
        # Инициализация producer и consumer
        self.producer = AIOKafkaProducer(
            bootstrap_servers=[f'{self.kafka_host}:{self.kafka_port}']
        )
        await self.producer.start()
        
        self.consumer = AIOKafkaConsumer(
            'match_requests',
            bootstrap_servers=[f'{self.kafka_host}:{self.kafka_port}'],
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        await self.consumer.start()
        
        print("MatchProcessor started")
        self.running = True
        
        try:
            await self.process_messages()
        except KeyboardInterrupt:
            print("Shutting down...")
        finally:
            await self.stop()

    async def process_messages(self):
        """Обработка сообщений из Kafka"""
        async for msg in self.consumer:
            try:
                data = msg.value
                print(f"Processing match request: {data}")
                
                # Обработка запроса на матч
                result = await self.handle_match_request(data)
                
                # Отправка результата обратно
                await self.send_match_result(result)
                
            except Exception as e:
                print(f"Error processing message: {e}")
                # Отправка ошибки обратно
                error_response = {
                    'error': str(e),
                    'request_id': data.get('request_id') if 'data' in locals() else None
                }
                await self.producer.send_and_wait('match_results', json.dumps(error_response).encode())

    async def handle_match_request(self, data):
        """Обработка запроса на проведение матча"""
        player_id = data['player_id']
        opponent_type = data.get('opponent_type', 'bot')  # 'bot' или 'player'
        player_health = data.get('player_health', 100)
        match_timeout = data.get('timeout', 45)  # 45 секунд по требованиям
        
        # Начало таймера матча
        start_time = asyncio.get_event_loop().time()
        
        # Симуляция игрового процесса (очки набираются во время игры)
        player_score = data.get('player_score', 0)
        
        # Если противник - бот, генерируем его результат
        if opponent_type == 'bot':
            # Результат противника - случайный, как указано в требованиях
            opponent_score = random.randint(max(0, player_score - 50), player_score + 50)
            opponent_health = 100  # Здоровье бота
        else:
            # Если это реальный игрок, предполагаем, что его данные придут в запросе
            opponent_score = data.get('opponent_score', random.randint(0, 100))
            opponent_health = data.get('opponent_health', 100)
        
        # Проверяем таймаут (если игра не заканчивается за 45 секунд, побеждает у кого больше HP)
        current_time = asyncio.get_event_loop().time()
        elapsed_time = current_time - start_time
        
        if elapsed_time > match_timeout:
            # По истечении времени побеждает тот, у кого больше здоровья
            if player_health > opponent_health:
                winner_id = player_id
            elif opponent_health > player_health:
                winner_id = data.get('opponent_id', 'bot')
            else:
                # При равном здоровье побеждает случайный
                winner_id = player_id if random.choice([True, False]) else data.get('opponent_id', 'bot')
        else:
            # В нормальных условиях побеждает тот, кто больше набрал очков
            if player_score > opponent_score:
                winner_id = player_id
            elif opponent_score > player_score:
                winner_id = data.get('opponent_id', 'bot')
            else:
                # При равных очках побеждает тот, у кого больше здоровья
                if player_health > opponent_health:
                    winner_id = player_id
                else:
                    winner_id = data.get('opponent_id', 'bot')
        
        # Определяем награду для победителя
        reward_item = None
        if winner_id == player_id:
            # Генерируем случайный предмет как награду
            qualities = list(ItemQuality)
            quality = random.choice(qualities)
            types = list(ItemType)
            item_type = random.choice(types)
            
            reward_item = {
                'id': str(uuid.uuid4()),
                'name': f"{quality.value.title()} {item_type.value.title()}",
                'quality': quality.value,
                'type': item_type.value,
                'health_bonus': random.randint(0, 10) if item_type == ItemType.ARMOR else 0,
                'attack_bonus': random.randint(0, 10) if item_type == ItemType.WEAPON else 0,
                'defense_bonus': random.randint(0, 5)
            }
        
        # Формируем результат матча
        result = {
            'request_id': data.get('request_id', str(uuid.uuid4())),
            'match_id': str(uuid.uuid4()),
            'player_id': player_id,
            'opponent_id': data.get('opponent_id', 'bot'),
            'player_score': player_score,
            'opponent_score': opponent_score,
            'player_health': player_health,
            'opponent_health': opponent_health,
            'duration': elapsed_time,
            'winner_id': winner_id,
            'reward_item': reward_item,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return result

    async def send_match_result(self, result):
        """Отправка результата матча обратно через Kafka"""
        await self.producer.send_and_wait('match_results', json.dumps(result).encode())
        print(f"Sent match result: {result['match_id']}")

    async def stop(self):
        """Остановка обработчика"""
        self.running = False
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        print("MatchProcessor stopped")

# Запуск обработчика
if __name__ == "__main__":
    processor = MatchProcessor()
    asyncio.run(processor.start())