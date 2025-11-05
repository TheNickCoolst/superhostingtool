import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { strictRateLimiter } from '../middleware/rateLimit.middleware';
import { registerValidation, loginValidation } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

// POST /api/auth/register - Benutzer registrieren
router.post('/register', strictRateLimiter, registerValidation, authController.register);

// POST /api/auth/login - Benutzer anmelden
router.post('/login', strictRateLimiter, loginValidation, authController.login);

export default router;
