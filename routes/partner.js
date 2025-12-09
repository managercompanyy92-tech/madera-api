// routes/partner.js
import express from 'express';
import { createPartnerRequest } from '../controllers/partnerController.js';

const router = express.Router();

// POST /api/partner
router.post('/', createPartnerRequest);

export default router;
