import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { strictRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();
const authController = new AuthController();

// POST /api/auth/register - Benutzer registrieren
router.post('/register', strictRateLimiter, authController.register);

// POST /api/auth/login - Benutzer anmelden
router.post('/login', strictRateLimiter, authController.login);

export default router;
