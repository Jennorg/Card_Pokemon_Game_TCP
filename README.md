# Monorepo: Pokemon Game

Este monorepo contiene la aplicación **"Pokemon Game"**, dividida en un backend (servidor) y un frontend (cliente web), diseñados para comunicar la lógica del juego a través de WebSockets, incluyendo una simulación de conexión de jugadores tipo TCP.

---

## 🗂️ Estructura del Proyecto

El proyecto está organizado como un monorepo, conteniendo las siguientes aplicaciones principales:

- **`apps/backend`**: Servidor Express/Node.js que maneja la lógica de la API, las conexiones WebSocket principales y el servidor WebSocket para la simulación de jugadores (anteriormente TCP).
- **`apps/frontend`**: Aplicación cliente desarrollada con React que interactúa con el backend para la lógica del juego y la visualización.

---

## ⚙️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- **Node.js**: Versión 18.x o superior recomendada.
- **npm** (viene con Node.js) o **Yarn**: Para la gestión de paquetes.

---

## 🚀 Configuración e Instalación

### 1. Clonar el repositorio

```bash
git clone <URL_DE_TU_REPOSOITORIO>
cd Card_Pokemon_Game
```

### 2. Instalar dependencias del monorepo

Desde la raíz del monorepo, instala todas las dependencias para ambos backend y frontend:

```bash
npm install
```

### 3. Configurar variables de entorno (backend)

Crea un archivo `.env` en la raíz de la carpeta `apps/backend` con el siguiente contenido:

```env
API_PORT=3000
TCP_PORT=4000
```

> Estos son los puertos que usarán los servidores API/WebSocket principal y el servidor de jugadores, respectivamente.

---

## 🏃 Ejecución de la Aplicación

Para ejecutar la aplicación, debes iniciar tanto el backend como el frontend en terminales separadas.

### 1. Iniciar el Backend

Abre una nueva terminal, navega a la raíz del monorepo (`Card_Pokemon_Game/`) y ejecuta:

```bash
npm run dev --workspace=backend
```

Verás mensajes en la consola indicando que el **API Server** está escuchando en el puerto 3000 y el **WebSocket Server for Players** en el puerto 4000.

### 2. Iniciar el Frontend

Abre otra terminal, navega a la raíz del monorepo y ejecuta:

```bash
npm run dev --workspace=frontend
```

Esto iniciará la aplicación React. Se abrirá automáticamente en tu navegador (normalmente en [http://localhost:5173/](http://localhost:5173/)).

---

## 🎮 Cómo Jugar y Probar

Este juego simula una interacción de cartas entre jugadores. Cada instancia del frontend representa un jugador.

### 1. Abre dos pestañas/ventanas del navegador

Abre [http://localhost:5173/](http://localhost:5173/) en dos pestañas o ventanas diferentes de tu navegador. Cada una actuará como un jugador independiente.

### 2. Identifica los IDs de Jugador

En cada pestaña, observa la sección **"Tu ID de Jugador (WS Jugador - Puerto 4000)"**. Verás un ID generado automáticamente (ej., `player-XXXX`). Estos son los IDs que se usan para la comunicación entre jugadores.

### 3. Solicita Información de Salas

En cualquiera de las pestañas, haz clic en el botón **"Solicitar Info de Salas"**. Esto actualizará la sección **"Salas Activas"**, donde deberías ver `room-1` con el conteo de jugadores (2/2 si ambas pestañas están conectadas) y los IDs de los jugadores presentes.

### 4. Envía una Carta

**En la primera pestaña:**

- Selecciona una carta de Pokémon haciendo clic en ella (aparecerá un panel con los detalles de la carta).
- En el campo **"Enviar a Jugador ID (WS Jugador)"**, ingresa el ID del jugador de la SEGUNDA pestaña (el `player-XXXX` que observaste en la otra ventana).
- Haz clic en el botón **"Enviar Carta a Jugador WS"**.

### 5. Observa la Animación y el Mensaje

En la segunda pestaña (la que recibió la carta), deberías ver una animación de una Poké Ball cayendo en el centro de la pantalla, parpadeando, y luego revelando el Pokémon que le enviaste.

También se actualizará el mensaje de **"Notificación"** y **"Mensaje del Oponente"** en la interfaz.

---

## 🔄 Flujo de Comunicación (simplificado)

Cada instancia de Frontend ([http://localhost:5173/](http://localhost:5173/)) se conecta a:

- **Backend principal (Puerto 3000):** Para registrar su ID de WebSocket y manejar comandos generales (como pedir info de salas).
- **Servidor de Jugadores (Puerto 4000):** Se conecta como un "jugador" de sala. El backend asigna un `player-ID` (ej., `player-1`, `player-2`) a esta conexión.

**Cuando un Frontend envía una carta:**

1. El Frontend A (tu pestaña actual) envía un mensaje de `game_message` al Backend principal (Puerto 3000), especificando su propio `PlayerId` y el `targetPlayerId` (el player-ID del otro jugador conectado al puerto 4000).
2. El Backend principal recibe esto y le dice al Servidor de Jugadores (Puerto 4000) que envíe la carta al `targetPlayerId`.
3. El Servidor de Jugadores (Puerto 4000) encuentra la conexión WebSocket del `targetPlayerId` y le envía el JSON de la carta.
4. El Servidor de Jugadores (Puerto 4000) también notifica a TODOS los demás jugadores en la misma sala (excepto al remitente original) a través de sus conexiones del puerto 4000 que se ha jugado una carta. Esta es la notificación que activa la animación en la pestaña del receptor.

