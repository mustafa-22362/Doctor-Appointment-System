import express from 'express';
import { sendContactMessage } from '../Controllers/contactController.js';

const router = express.Router();

// Contact form route
router.post('/send', sendContactMessage);

export default router;
