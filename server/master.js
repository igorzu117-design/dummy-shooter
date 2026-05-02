const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Хранилище серверов в оперативной памяти
let activeServers = [];
const SERVER_TIMEOUT = 10000; // 10 секунд без вестей = удаление

/**
 * GET /servers - Получение списка активных игр
 */
app.get('/servers', (req, res) => {
    const list = activeServers.map(s => ({
        id: s.id,
        name: s.name,
        players: s.players,
        maxPlayers: s.maxPlayers,
        hasPassword: s.hasPassword,
        address: s.address
    }));
    res.json(list);
});

/**
 * POST /register - Регистрация нового игрового сервера
 */
app.post('/register', (req, res) => {
    const { name, address, maxPlayers, hasPassword } = req.body;
    
    const newServer = {
        id: Math.random().toString(36).substr(2, 9),
        name: name || "Unnamed Server",
        address: address || "ws://localhost:8080",
        players: 1,
        maxPlayers: maxPlayers || 10,
        hasPassword: !!hasPassword,
        lastSeen: Date.now()
    };

    activeServers.push(newServer);
    console.log(`[MASTER] Зарегистрирован: ${newServer.name} на ${newServer.address}`);
    res.json({ id: newServer.id });
});

/**
 * POST /heartbeat - Подтверждение активности сервера
 */
app.post('/heartbeat', (req, res) => {
    const { id, players } = req.body;
    const server = activeServers.find(s => s.id === id);

    if (server) {
        server.lastSeen = Date.now();
        if (players !== undefined) server.players = players;
        res.sendStatus(200);
    } else {
        res.status(404).send("Server not found");
    }
});

/**
 * Цикл очистки неактивных серверов
 */
setInterval(() => {
    const now = Date.now();
    const before = activeServers.length;
    activeServers = activeServers.filter(s => (now - s.lastSeen) < SERVER_TIMEOUT);
    if (activeServers.length < before) {
        console.log(`[MASTER] Удалено неактивных серверов: ${before - activeServers.length}`);
    }
}, 5000);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Master Server запущен на http://localhost:${PORT}`);
});
