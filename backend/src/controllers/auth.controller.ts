import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { body, validationResult } from 'express-validator';

export class AuthController {
  private authService = new AuthService();

  register = [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 20 }).trim(),
    body('password').isLength({ min: 8 }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, username, password } = req.body;
        const result = await this.authService.register(email, username, password);

        res.status(201).json({
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            role: result.user.role
          },
          token: result.token
        });
      } catch (error) {
        next(error);
      }
    }
  ];

  login = [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const result = await this.authService.login(email, password);

        res.json({
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            role: result.user.role,
            maxServers: result.user.maxServers
          },
          token: result.token
        });
      } catch (error) {
        next(error);
      }
    }
  ];
}
