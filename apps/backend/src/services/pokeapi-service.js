import axios from 'axios'; // Importa Axios para hacer las peticiones HTTP
import { Logger } from '../utils/logger.js'; // Importa tu Logger para registrar eventos

/**
 * Servicio para interactuar con la PokeAPI.
 * Encapsula la lógica para obtener datos de Pokémon.
 */
class PokeApiService {
  constructor() {
    // URL base de la PokeAPI. Se podría obtener de una variable de entorno si se quisiera.
    this.baseUrl = 'https://pokeapi.co/api/v2';
  }

  /**
   * Obtiene los detalles de un Pokémon por su ID o nombre.
   * @param {string | number} identifier El ID o nombre del Pokémon.
   * @returns {Promise<Object>} Un objeto con los datos relevantes del Pokémon.
   * @throws {Error} Si el Pokémon no se encuentra o hay un error en la conexión.
   */
  async getPokemonDetails(identifier) {
    try {
      Logger.debug(`[PokeAPI Service] Obteniendo detalles para Pokémon: ${identifier}`);
      const response = await axios.get(`${this.baseUrl}/pokemon/${identifier}/`);

      // Axios automáticamente parsea el JSON, los datos están en response.data
      const pokemonData = response.data;

      // Normaliza los datos: devuelve solo la información que realmente necesitas.
      // Esto evita exponer toda la estructura de la PokeAPI a otras partes de tu backend.
      return {
        id: pokemonData.id,
        name: pokemonData.name,
        sprite: pokemonData.sprites.front_default,
        types: pokemonData.types.map(typeInfo => typeInfo.type.name),
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // El servidor de la PokeAPI respondió con un código de estado fuera de 2xx
          Logger.error(`[PokeAPI Service] Error HTTP al obtener Pokémon ${identifier}: ${error.response.status} - ${error.response.statusText}`, error.response.data);
          // Propaga el error con información útil para el controlador
          throw {
            status: error.response.status,
            message: `Pokémon ${identifier} no encontrado o error en PokeAPI.`,
            details: error.response.data // Puedes incluir los detalles que devuelve la PokeAPI
          };
        } else if (error.request) {
          // La petición fue hecha pero no se recibió respuesta (ej. red caída)
          Logger.error(`[PokeAPI Service] No se recibió respuesta al obtener Pokémon ${identifier}: ${error.message}`);
          throw {
            status: 503, // Service Unavailable
            message: 'No se pudo conectar con la PokeAPI. Problema de red o API no disponible.'
          };
        } else {
          // Algo más ocurrió al configurar la petición
          Logger.error(`[PokeAPI Service] Error de configuración de la petición para Pokémon ${identifier}: ${error.message}`);
          throw {
            status: 500,
            message: 'Error interno al procesar la petición a PokeAPI.'
          };
        }
      }
      // Si no es un error de Axios (ej. un error de código en este mismo servicio)
      Logger.error(`[PokeAPI Service] Error inesperado al obtener Pokémon ${identifier}:`, error);
      throw {
        status: 500,
        message: 'Un error inesperado ocurrió en el servicio de PokeAPI.'
      };
    }
  }

  /**
   * Obtiene una lista de todos los tipos de Pokémon.
   * Puedes añadir más métodos según las necesidades de tu aplicación.
   * @returns {Promise<Array<Object>>} Un array de objetos con nombre y URL de cada tipo.
   * @throws {Error} Si no se pueden obtener los tipos.
   */
  async getPokemonTypes() {
    try {
      Logger.debug(`[PokeAPI Service] Obteniendo lista de tipos de Pokémon.`);
      const response = await axios.get(`${this.baseUrl}/type/`);
      return response.data.results; // La PokeAPI devuelve la lista de tipos en 'results'
    } catch (error) {
      Logger.error(`[PokeAPI Service] Error al obtener tipos de Pokémon:`, error);
      throw { status: 500, message: 'No se pudo obtener la lista de tipos de Pokémon.' };
    }
  }

  // Podrías añadir más métodos aquí, por ejemplo:
  // async getAbilityDetails(nameOrId) { ... }
  // async getMoveDetails(nameOrId) { ... }
}

// Exporta la clase PokeApiService para que pueda ser importada en otros módulos
export { PokeApiService };