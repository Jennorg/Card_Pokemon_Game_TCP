import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import Card from './components/Card';

function App() {
  const [pokemonCards, setPokemonCards] = useState({ data: [] });
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [wsMessage, setWsMessage] = useState('');
  const [PokemonRecived, setPokemonRecived] = useState(null)
  
  // ID para el WebSocket principal del frontend (único por pestaña/instancia)
  const [PlayerId, setPlayerId] = useState(`ws-player-${Math.floor(Math.random() * 10000)}`);
  // EL ID ASIGNADO POR EL SERVIDOR TCP/WS (antes era el de Netcat)
  const [tcpPlayerId, setTcpPlayerId] = useState(null); 
  // ID del jugador TCP/WS a quien enviar la carta (el otro jugador)
  const [targetPlayerId, setTargetPlayerId] = useState(''); 
  const [currentRoomId, setCurrentRoomId] = useState('room-1'); 
  const [roomInfo, setRoomInfo] = useState(null); 
  const [opponentPlayMessage, setOpponentPlayMessage] = useState(null); 

  const ws = useRef(null); // WebSocket principal (para lógica de juego, puerto 3000)
  const tcpWs = useRef(null); 

  const WS_SERVER_URL = 'ws://localhost:3000'; // URL para el WebSocket principal
  const TCP_SERVER_URL = 'ws://localhost:4000';

  useEffect(() => {
    ws.current = new WebSocket(WS_SERVER_URL);

    ws.current.onopen = () => {
      console.log('Conectado al servidor WebSocket principal (puerto 3000)');
      setWsMessage('Conectado al servidor WebSocket principal.');
  
      ws.current.send(JSON.stringify({
          type: 'register_player_to_room',
          playerId: PlayerId,
          roomId: currentRoomId 
      }));
    };

    ws.current.onmessage = (event) => {
      console.log('Mensaje recibido del WS principal:', event.data);
      try {
        const parsedData = JSON.parse(event.data);

        if (parsedData.type === 'rooms_info') {
            setRoomInfo(parsedData.rooms);
            setWsMessage('Información de salas actualizada.');
        } else if (parsedData.type === 'opponent_played_card') {
            setOpponentPlayMessage({
                message: parsedData.message,
                card: parsedData.card,
                sender: parsedData.senderPlayerId
            });
            setWsMessage(`Notificación: ${parsedData.message}`);
        } else if (parsedData.type === 'registration_success') {
            console.log(`Registro WS exitoso: ${parsedData.playerId} en ${parsedData.roomId}`);
            setWsMessage(`WS Registrado: ${parsedData.playerId} en ${parsedData.roomId}`);
        } else if (parsedData.type === 'error') {
            console.error("Error recibido del backend (WS principal):", parsedData.message);
            setWsMessage(`ERROR: ${parsedData.message}`);
            alert(`ERROR del Servidor: ${parsedData.message}`);
        } else if (parsedData.type === 'game_message_status') { 
            setWsMessage(`Estado de envío: ${parsedData.message}`);
            console.log(`Estado de envío de carta: ${parsedData.message}`);
        }
        else {
            setWsMessage(`Mensaje WS no reconocido: ${event.data}`);
        }
      } catch (e) {
          console.error("Error al parsear mensaje WS principal (no JSON esperado):", e, "Mensaje crudo:", event.data);
          setWsMessage(`Mensaje WS principal (no JSON): ${event.data}`);
      }
    };

    ws.current.onclose = () => {
      console.log('Desconectado del servidor WebSocket principal');
      setWsMessage('Desconectado del servidor WebSocket principal.');
    };

    ws.current.onerror = (err) => {
      console.error('Error del WebSocket principal:', err);
      setWsMessage('Error en la conexión WebSocket principal.');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [PlayerId, currentRoomId]); 

  useEffect(() => {
    tcpWs.current = new WebSocket(TCP_SERVER_URL);

    tcpWs.current.onopen = () => {
      console.log('Conectado al servidor WebSocket para Jugadores (puerto 4000).');
    };

    tcpWs.current.onmessage = (event) => {
        console.log('Mensaje recibido del servidor WS Jugador (puerto 4000):', event.data);
        const message = event.data;

        if (message.startsWith('Bienvenido, Jugador ')) {
            const assignedPlayerId = message.split(' ')[2].replace('!', ''); 
            setTcpPlayerId(assignedPlayerId); 
            console.log(`Mi ID de jugador asignado por el servidor (puerto 4000) es: ${assignedPlayerId}`);
            setWsMessage(`Conectado como jugador de sala: ${assignedPlayerId}`);

        } else {
            try {
                const parsedData = JSON.parse(message);
                if (parsedData.type === 'card_play') {
                    console.log('Datos de la carta recibida justo antes de setear:', parsedData.card);
                    setPokemonRecived(parsedData.card)

                } else if (parsedData.type === 'error') {
                    console.error("Error recibido del servidor WS Jugador:", parsedData.message);
                }
            } catch (e) {
                console.log("Mensaje WS Jugador (no JSON):", message);
            }
        }
    };

    tcpWs.current.onclose = () => {
      console.log('Desconectado del servidor WS Jugador (puerto 4000).');
    };

    tcpWs.current.onerror = (err) => {
      console.error('Error del WebSocket Jugador (puerto 4000):', err);
    };

    return () => {
      if (tcpWs.current) {
        tcpWs.current.close();
      }
    };
  }, []); // Se ejecuta una vez al montar el componente

  useEffect(() => {
    if (PokemonRecived) {
      console.log('PokemonRecived se ha actualizado y ahora es:', PokemonRecived);``
    }
  }, [PokemonRecived]); // Dependencia: Se ejecuta cuando PokemonRecived cambia.

  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const response = await axios.get('/api/cards'); 
        setPokemonCards(response.data);
        setError(null); 
      } catch (err) {
        console.error("Error fetching from backend:", err);
        setError("Error al cargar las cartas de Pokémon desde el backend.");
        setPokemonCards({ data: [] });
      }
    };
    fetchBackendData();
  }, []); 

  const handleCardClick = (pokemonData) => {
    console.log("¡Se hizo clic en la tarjeta de:", pokemonData.name);
    setSelectedCard(pokemonData);
    setOpponentPlayMessage(null); 
  };

  const sendCardToTcpPlayer = () => {
    if (!selectedCard) {
      setWsMessage("Por favor, selecciona una carta primero.");
      return;
    }
    if (!targetPlayerId) {
      setWsMessage("Por favor, ingresa el ID del jugador destino.");
      return;
    }
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setWsMessage("Conexión WebSocket principal no está abierta. Intentando reconectar...");
      return;
    }

    try {
      const messagePayload = {
        type: 'game_message',
        roomId: currentRoomId, 
        senderPlayerId: PlayerId,
        targetPlayerId: targetPlayerId,
        payload: {
          type: 'card_play',
          card: selectedCard, 
          timestamp: new Date().toISOString()
        }
      };

      ws.current.send(JSON.stringify(messagePayload));
      console.log(`Carta "${selectedCard.name}" enviada por WebSocket a ${targetPlayerId}.`);
      setWsMessage(`Carta "${selectedCard.name}" enviada a ${targetPlayerId}.`);
    } catch (e) {
      console.error("Error al serializar o enviar la carta:", e);
      setWsMessage("Error al enviar la carta.");
    }
  };


  const requestRoomsInfo = () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'request_rooms_info' }));
          setWsMessage('Solicitando información de salas...');
      } else {
          setWsMessage('WebSocket principal no conectado para solicitar info de salas.');
      }
  };

  return (
    <main className='flex justify-center items-center flex-col w-dvw ming:h-dvh p-8 bg-gray-100 min-h-screen'>
      <h2 className='text-5xl font-extrabold text-blue-700 mb-10 drop-shadow-lg'>Pokemon Game!</h2>

      {error && (
        <p className="text-red-600 text-lg mb-4 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>
      )}

      <div className="mb-6 bg-white p-4 rounded-lg shadow-md w-full max-w-lg text-center">
        <p className="text-gray-700 text-lg mb-2">Tu ID de Jugador (WS Jugador - Puerto 4000): <span className="font-bold text-green-600">{tcpPlayerId || 'Conectando...'}</span></p>
        <p className="text-gray-700 mb-2">Tu Sala Asignada: <span className="font-bold text-blue-600">{currentRoomId}</span></p>
        <p className="mb-2 text-gray-700">Estado WS Principal: <span className="font-semibold">{wsMessage}</span></p>

        <div className="flex items-center justify-center gap-2 mb-2">
            <label htmlFor="targetPlayer" className="text-gray-700">Enviar a Jugador ID (WS Jugador):</label>
            <input
                id="targetPlayer"
                type="text"
                value={targetPlayerId}
                onChange={(e) => setTargetPlayerId(e.target.value)}
                placeholder="oponente-id"
                className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
        </div>
        <button
            onClick={requestRoomsInfo}
            className="mt-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200"
        >
            Solicitar Info de Salas
        </button>
        {roomInfo && (
            <div className="mt-4 text-left p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-black">Salas Activas:</h4>
                {Object.keys(roomInfo).length > 0 ? (
                    Object.entries(roomInfo).map(([id, info]) => (
                        <p key={id} className="text-sm text-black">
                            <span className="font-bold text-black">{id}</span>: {info.currentPlayerCount}/{info.maxPlayers} jugadores (IDs: {info.playerIds.join(', ') || 'Ninguno'})
                        </p>
                    ))
                ) : (
                    <p className="text-sm text-black">No hay salas activas.</p>
                )}
            </div>
        )}
      </div>

      {opponentPlayMessage && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-lg mb-6 shadow-md w-full max-w-lg text-center">
          <p className="font-bold text-xl mb-2">{opponentPlayMessage.message}</p>
          <p className="text-md">Carta: <span className="capitalize font-semibold">{opponentPlayMessage.card.name}</span> (ID: {opponentPlayMessage.card.id})</p>
          <img src={opponentPlayMessage.card.sprite} alt={opponentPlayMessage.card.name} className="w-24 h-24 mx-auto mt-2" />
        </div>
      )}

      {!pokemonCards.data || pokemonCards.data.length === 0 && !error ? (
        <p className="text-2xl text-gray-600">Cargando cartas de Pokémon...</p>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 max-w-7xl mx-auto'>
          {Array.isArray(pokemonCards.data) && pokemonCards.data.map((pokeData) => (
            <Card
              key={pokeData.id}
              pokemon={pokeData}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {selectedCard && (
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-xl text-center w-full max-w-lg">
          <h3 className="text-3xl font-bold text-blue-800 mb-4">Detalles de la Tarjeta Seleccionada:</h3>
          <img
            src={selectedCard.sprite}
            alt={selectedCard.name}
            className="w-48 h-48 object-contain mx-auto mb-4 border-4 border-blue-300 rounded-full bg-white"
          />
          <p className="text-2xl capitalize font-semibold text-gray-800">{selectedCard.name}</p>
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={sendCardToTcpPlayer}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-all duration-200"
            >
              Enviar Carta a Jugador WS
            </button>
            <button
              onClick={() => setSelectedCard(null)}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all duration-200"
            >
              Cerrar Detalles
            </button>
          </div>
        </div>
      )}

      {PokemonRecived &&
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-xl text-center w-full max-w-lg">
          <h3 className="text-3xl font-bold text-blue-800 mb-4">Pokémon Recibido:</h3>
          <img src={PokemonRecived.sprite} alt={PokemonRecived.name} className="w-48 h-48 object-contain mx-auto mb-4 border-4 border-blue-300 rounded-full bg-white" />
          <p className="text-2xl capitalize font-semibold text-gray-800">{PokemonRecived.name}</p>
        </div>
      }
    </main>
  );
}

export default App;