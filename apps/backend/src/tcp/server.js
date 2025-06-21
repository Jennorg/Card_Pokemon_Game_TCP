import { WebSocketServer } from 'ws';
import { Logger } from '../utils/logger.js';

const rooms = new Map(); 
let nextPlayerId = 1;

const tcpSocketManagerInstance = {
    _onTcpMessageReceived: null,

    setOnTcpMessageReceived: (callback) => {
        tcpSocketManagerInstance._onTcpMessageReceived = callback;
    },

    sendToPlayerInRoom: (roomId, targetPlayerId, data) => {
        const room = rooms.get(roomId);
        if (room) {
            const clientWs = room.players.get(targetPlayerId);
            if (clientWs && clientWs.readyState === clientWs.OPEN) {
                Logger.debug(`[WS Player Manager] Enviando datos a Jugador ${targetPlayerId} en Sala ${roomId}: ${data}`);
                clientWs.send(data);
                return true;
            } else {
                Logger.warn(`[WS Player Manager] Jugador ${targetPlayerId} no encontrado o WebSocket no abierto en Sala ${roomId}.`);
            }
        } else {
            Logger.warn(`[WS Player Manager] Sala ${roomId} no encontrada para enviar a Jugador ${targetPlayerId}.`);
        }
        return false;
    },

    getAllRooms: () => {
        const roomsInfo = {};
        rooms.forEach((room, roomId) => {
            roomsInfo[roomId] = {
                currentPlayerCount: room.players.size,
                maxPlayers: room.maxPlayers,
                playerIds: Array.from(room.players.keys())
            };
        });
        return roomsInfo;
    }
};

const startTcpServer = (port) => {
    const wssPlayers = new WebSocketServer({ port: port });

    wssPlayers.on('connection', (ws) => {
        const playerId = `player-${nextPlayerId++}`;
        const roomId = 'room-1';

        let room = rooms.get(roomId);
        if (!room) {
            room = { maxPlayers: 2, players: new Map() };
            rooms.set(roomId, room);
            Logger.info(`[WS Player Room] Creada nueva sala: ${roomId}`);
        }

        if (room.players.size >= room.maxPlayers) {
            Logger.warn(`[WS Player] Sala ${roomId} llena. Desconectando a nuevo jugador.`);
            ws.send(JSON.stringify({ type: 'error', message: `Sala ${roomId} está llena. Intenta más tarde.` }));
            ws.close();
            return;
        }

        room.players.set(playerId, ws);
        Logger.info(`[WS Player] Jugador ${playerId} conectado. Sala: ${roomId}.`);

        ws.send(`Bienvenido, Jugador ${playerId}! Estás en la Sala ${roomId}.`);

        const roomStatusMessage = `[Sala ${roomId}] Jugador ${playerId} se ha unido. (${room.players.size}/${room.maxPlayers})`;
        room.players.forEach((playerWs) => {
            if (playerWs.readyState === playerWs.OPEN) {
                playerWs.send(roomStatusMessage);
            }
        });

        ws.on('message', (message) => {
            const msgString = message.toString();
            Logger.info(`[WS Player] Mensaje recibido de Jugador ${playerId} en Sala ${roomId}: ${msgString}`);

            try {
                const parsedPayload = JSON.parse(msgString);
                if (tcpSocketManagerInstance._onTcpMessageReceived) {
                    tcpSocketManagerInstance._onTcpMessageReceived(playerId, roomId, parsedPayload);
                }
            } catch (e) {
                Logger.error(`[WS Player] Error al parsear mensaje JSON de Jugador ${playerId}: ${e.message}. Mensaje original: ${msgString}`);
                ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensaje JSON inválido en WS Player.' }));
            }
        });

        ws.on('close', () => {
            room.players.delete(playerId);
            Logger.info(`[WS Player] Jugador ${playerId} desconectado de Sala ${roomId}. Jugadores restantes: ${room.players.size}`);
            
            const disconnectMessage = `[Sala ${roomId}] Jugador ${playerId} se ha desconectado.`;
            room.players.forEach((playerWs) => {
                if (playerWs.readyState === playerWs.OPEN) {
                    playerWs.send(disconnectMessage);
                }
            });

            if (room.players.size === 0) {
                rooms.delete(roomId);
                Logger.info(`[WS Player Room] Sala ${roomId} vacía y eliminada.`);
            }
        });

        ws.on('error', (err) => {
            Logger.error(`[WS Player] Error en la conexión de Jugador ${playerId}: ${err.message}`);
        });
    });

    wssPlayers.on('listening', () => {
        Logger.info(`WebSocket Server for Players (formerly TCP) listening on port ${port}`);
    });

    wssPlayers.on('error', (err) => {
        Logger.error(`Failed to start WebSocket Server for Players: ${err.message}`);
    });
};

export { startTcpServer, tcpSocketManagerInstance as getTcpSocketManager };
