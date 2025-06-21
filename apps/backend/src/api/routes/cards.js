import { Router } from 'express';
import cardController from '../controllers/cardController.js';

const router = Router();
// Rutas para cards pokemon
router.get('/', cardController.getAllCards);

export default router