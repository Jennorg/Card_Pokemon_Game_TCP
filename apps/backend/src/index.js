import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { setupApiRoutes } from './api/routes/index.js';

import { startTcpServer, getTcpSocketManager } from './tcp/server.js'; 
import { Logger } from './utils/logger.js';

dotenv.config();

const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3000;
const TCP_PORT = process.env.TCP_PORT ? parseInt(process.env.TCP_PORT) : 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.static(path.join(__dirname, '../../frontend/dist')));

setupApiRoutes(app);

const wss = new WebSocketServer({ server });
const wsClients = new Map();

wss.on('connection', (ws) => {
    const wsId = `ws-client-${Math.floor(Math.random() * 10000)}`;
    ws.id = wsId;
    wsClients.set(wsId, { ws: ws, playerId: null, roomId: null });

    Logger.info(`[WS] Nuevo cliente conectado: ${wsId}. Clientes activos: ${wsClients.size}`);

    ws.on('message', async (message) => {
        Logger.info(`[WS] Mensaje recibido de ${wsId}: ${message}`);
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === 'register_player_to_room') {
                const { playerId, roomId } = parsedMessage;
                const clientData = wsClients.get(wsId);
                if (clientData) {
                    clientData.playerId = playerId;
                    clientData.roomId = roomId;
                    wsClients.set(wsId, clientData);
                    ws.send(JSON.stringify({ type: 'registration_success', playerId: playerId, roomId: roomId }));
                    Logger.info(`[WS] Cliente ${wsId} registrado como Jugador ${playerId} en Sala ${roomId}.`);
                }
            } else if (parsedMessage.type === 'request_rooms_info') {
                const roomsInfo = getTcpSocketManager.getAllRooms(); 
                ws.send(JSON.stringify({ type: 'rooms_info', rooms: roomsInfo }));
                Logger.info(`[WS] Enviando info de salas a ${wsId}.`);
            } else if (parsedMessage.type === 'game_message') {
                const { roomId, senderPlayerId, targetPlayerId, payload } = parsedMessage;
                
                const clientData = wsClients.get(wsId);
                if (!clientData || clientData.playerId !== senderPlayerId || clientData.roomId !== roomId) {
                    Logger.warn(`[WS] Mensaje de juego inválido: senderPlayerId ${senderPlayerId} no coincide con registro de ${wsId}.`);
                    ws.send(JSON.stringify({ type: 'error', message: 'Error de autenticación/registro.' }));
                    return;
                }

                Logger.info(`[WS] Mensaje de juego de Jugador ${senderPlayerId} para ${targetPlayerId} en Sala ${roomId}.`);

                const sendSuccess = getTcpSocketManager.sendToPlayerInRoom(
                    roomId,
                    targetPlayerId,
                    JSON.stringify(payload)
                );

                if (sendSuccess) {
                    ws.send(JSON.stringify({
                        type: 'game_message_status',
                        status: 'success',
                        message: `Mensaje de juego enviado a Jugador ${targetPlayerId} en Sala ${roomId}.`,
                        targetPlayerId: targetPlayerId
                    }));
                    Logger.info(`[WS] Mensaje de juego enviado exitosamente a Jugador ${targetPlayerId} en Sala ${roomId}.`);
                } else {
                    const errorMessage = {
                        type: 'error',
                        message: `Error: No se pudo enviar el mensaje a Jugador ${targetPlayerId}. Es posible que no esté conectado o no se encuentre en la sala.`,
                        code: 'PLAYER_NOT_FOUND_OR_DISCONNECTED',
                        targetPlayerId: targetPlayerId,
                        roomId: roomId
                    };
                    ws.send(JSON.stringify(errorMessage));
                    Logger.warn(`[WS] Fallo al enviar a TCP/WS Player. Enviando error WS a ${wsId}: ${errorMessage.message}`);
                }
            } else {
                Logger.warn(`[WS] Mensaje WS de ${wsId} de tipo desconocido: ${parsedMessage.type}`);
                ws.send(JSON.stringify({ type: 'error', message: 'Tipo de mensaje WS desconocido.' }));
            }
        } catch (e) {
            Logger.error(`[WS] Error al parsear mensaje JSON de ${wsId}: ${e.message}. Mensaje recibido: "${message}"`);
            ws.send(JSON.stringify({ type: 'error', message: `Error al procesar el mensaje: ${e.message}` }));
        }
    });

    ws.on('close', () => {
        const clientData = wsClients.get(wsId);
        Logger.info(`[WS] Cliente ${wsId} (${clientData?.playerId || 'desconocido'}) desconectado.`);
        wsClients.delete(wsId);
    });

    ws.on('error', (err) => {
        Logger.error(`[WS] Error en el socket WS de ${wsId}: ${err.message}`);
    });
});

const tcpSocketManager = getTcpSocketManager;

tcpSocketManager.setOnTcpMessageReceived((senderTcpPlayerId, roomId, messagePayload) => {
    Logger.info(`[WS-PLAYER-BRIDGE] Mensaje de Jugador TCP/WS ${senderTcpPlayerId} en Sala ${roomId} recibido. Reenviando a clientes WS...`);

    const wsNotification = {
        type: 'opponent_played_card',
        senderPlayerId: senderTcpPlayerId,
        card: messagePayload.card,
        roomId: roomId,
        message: `El otro jugador (${senderTcpPlayerId}) ha jugado: ${messagePayload.card.name}`
    };

    wsClients.forEach((clientData, wsId) => {
        if (clientData.roomId === roomId && clientData.playerId !== messagePayload.senderPlayerId) {
            if (clientData.ws.readyState === clientData.ws.OPEN) {
                clientData.ws.send(JSON.stringify(wsNotification));
                Logger.debug(`[WS-BROADCAST] Notificación enviada a WS cliente ${wsId} (${clientData.playerId}).`);
            }
        }
    });
});

startTcpServer(TCP_PORT);

server.listen(API_PORT, () => {
    Logger.info(`API Server listening on port ${API_PORT}`);
    Logger.info(`WebSocket Server (main) listening on port ${API_PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        Logger.error(`Failed to start API server: ${err.message}. Port ${API_PORT} is already in use.`);
    } else {
        Logger.error(`Failed to start API server: ${err.message}`);
    }
    process.exit(1);
});