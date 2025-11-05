import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import NotificationService from '../services/notification.service';

const router = Router();

// Get all notification configs for a user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const configs = await NotificationService.getConfigs((req as any).user.id);
    res.json(configs);
  } catch (error) {
    next(error);
  }
});

// Create a notification config
router.post('/', authenticate, async (req, res, next) => {
  try {
    const config = await NotificationService.createConfig({
      ...req.body,
      userId: (req as any).user.id
    });
    res.status(201).json(config);
  } catch (error) {
    next(error);
  }
});

// Update a notification config
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const config = await NotificationService.updateConfig(req.params.id, req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// Delete a notification config
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await NotificationService.deleteConfig(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
