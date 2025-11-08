import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginRateLimiter, strictRateLimiter } from '../middleware/rateLimit.middleware';
import { registerValidation, loginValidation } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

// GET /api/auth/setup - Check if first user setup is required
router.get('/setup', authController.checkSetup);

// POST /api/auth/register - Benutzer registrieren
router.post('/register', strictRateLimiter, registerValidation, authController.register);

// POST /api/auth/login - Benutzer anmelden
router.post('/login', loginRateLimiter, loginValidation, authController.login);

export default router;
