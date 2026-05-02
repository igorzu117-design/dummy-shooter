const WebSocket = require('ws');
const axios = require('axios');

const GAME_PORT = process.env.PORT || 8080;
const MASTER_URL = process.env.MASTER_URL || 'http://localhost:3000';
const wss = new WebSocket.Server({ port: GAME_PORT });

let players = {};
let serverId = null;

// Конфигурация сервера
const config = {
    name: "Official Dummy Server",
    maxPlayers: 10,
    address: `ws://localhost:${GAME_PORT}` // В реальном проекте здесь будет внешний IP
};

/**
 * Регистрация на Master Server
 */
async function registerOnMaster() {
    try {
        const res = await axios.post(`${MASTER_URL}/register`, {
            name: config.name,
            address: config.address,
            maxPlayers: config.maxPlayers,
            hasPassword: false
        });
        serverId = res.data.id;
        console.log(`[GAME] Успешная регистрация. ID: ${serverId}`);
        
        // Heartbeat каждые 5 секунд
        setInterval(async () => {
            try {
                await axios.post(`${MASTER_URL}/heartbeat`, {
                    id: serverId,
                    players: Object.keys(players).length
                });
            } catch (e) {
                console.log("[GAME] Ошибка Heartbeat (Master Server может быть выключен)");
            }
        }, 5000);
    } catch (e) {
        console.error("[GAME] Критическая ошибка: Не удалось связаться с Master Server. Попробуйте запустить его первым.");
    }
}

/**
 * Логика WebSocket сервера
 */
wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 5);
    players[id] = { id, x: 0, y: 1.6, z: 0, team: 'blue' };
    
    console.log(`[GAME] Игрок ${id} подключился. Всего игроков: ${Object.keys(players).length}`);

    // Отправляем ID игроку
    ws.send(JSON.stringify({ type: 'init', id }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'move') {
                if (players[id]) {
                    players[id].x = data.x;
                    players[id].y = data.y;
                    players[id].z = data.z;
                }
            }

            // Рассылка состояния всем игрокам (Broadcast)
            const state = JSON.stringify({ type: 'update', players });
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(state);
                }
            });
        } catch (e) {
            console.error("[GAME] Ошибка обработки сообщения:", e);
        }
    });

    ws.on('close', () => {
        delete players[id];
        console.log(`[GAME] Игрок ${id} отключился. Осталось: ${Object.keys(players).length}`);
    });
});

registerOnMaster();
console.log(`[GAME] Game Server запущен на порту ${GAME_PORT}`);
