import { PokeApiService } from '../../services/pokeapi-service.js';
import { Logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/apiResponse.js';

const pokeApiService = new PokeApiService();

const cardController = {
  getAllCards: async (req, res) => {
    const numberOfCards = 6;
    const cards = [];
    const fetchedIds = new Set();

    try {
      while (cards.length < numberOfCards) {
        // Genera un ID de Pokémon aleatorio (aproximadamente 1025 Pokémon hasta ahora)
        const randomId = Math.floor(Math.random() * 1025) + 1;

        // Si el ID ya fue usado, intenta con otro
        if (fetchedIds.has(randomId)) {
          continue;
        }

        try {
          const pokemonData = await pokeApiService.getPokemonDetails(randomId.toString());

          cards.push(pokemonData);
          fetchedIds.add(randomId);
        } catch (innerError) {
          Logger.warn(`No se pudo obtener Pokémon con ID ${randomId}: ${innerError.message}`);
        }
      }
      successResponse(res, 200, 'Cartas de Pokémon obtenidas exitosamente', cards);
    } catch (error) {
      Logger.error('Error al obtener el array de cartas:', error);
      errorResponse(res, 500, 'Error interno del servidor al obtener las cartas.');
    }
  }
};

export default cardController; 