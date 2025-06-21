import React from "react";

const Card = ({ pokemon, onCardClick }) => {
  const handleInternalClick = () => {
    if (onCardClick) {
      onCardClick(pokemon);
    }
  };

  return (
    <div
      // Contenedor de la tarjeta con sombra, bordes redondeados y efecto hover
      className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:scale-105 cursor-pointer flex flex-col items-center justify-center text-center border border-gray-200"
      onClick={handleInternalClick}
    >
      <div className="mb-4">
        {/* Imagen del Pokémon con tamaño fijo y borde */}
        <img
          src={pokemon.sprite}
          alt={pokemon.name}
          className="w-32 h-32 object-contain mx-auto border-2 border-blue-400 rounded-full bg-blue-50 p-1"
        />
      </div>
      <div>
        {/* Nombre del Pokémon con estilo de texto */}
        <h2 className="text-xl font-bold capitalize text-gray-800 tracking-wide">
          {pokemon.name}
        </h2>
      </div>
    </div>
  );
};

export default Card;