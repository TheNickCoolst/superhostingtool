import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import ScheduledTaskService from '../services/scheduled-task.service';

const router = Router();

// Get all tasks for a server
router.get('/server/:serverId', authenticate, async (req, res, next) => {
  try {
    const tasks = await ScheduledTaskService.getTasks(req.params.serverId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await ScheduledTaskService.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create a task
router.post('/', authenticate, async (req, res, next) => {
  try {
    const task = await ScheduledTaskService.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// Update a task
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await ScheduledTaskService.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Delete a task
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await ScheduledTaskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Manually trigger a task
router.post('/:id/trigger', authenticate, async (req, res, next) => {
  try {
    await ScheduledTaskService.triggerTask(req.params.id);
    res.json({ message: 'Task triggered successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
