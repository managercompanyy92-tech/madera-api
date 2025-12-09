// routes/partner.js
import express from 'express';
import { createPartnerRequest } from '../controllers/partnerController.js';

const router = express.Router();

// Правильный маршрут для формы партнера
router.post('/submit', createPartnerRequest);

export default router;
