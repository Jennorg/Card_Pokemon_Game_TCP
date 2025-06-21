import cardsRoutes from './cards.js';

function setupApiRoutes(app) {
    app.use('/api/cards', cardsRoutes);
}

export { setupApiRoutes };