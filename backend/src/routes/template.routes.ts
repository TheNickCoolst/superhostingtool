import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import TemplateService from '../services/template.service';

const router = Router();

// Get all public templates
router.get('/', async (req, res, next) => {
  try {
    const templates = await TemplateService.getPublicTemplates();
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Get template by ID
router.get('/:id', async (req, res, next) => {
  try {
    const template = await TemplateService.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Create template (authenticated)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const template = await TemplateService.createTemplate({
      ...req.body,
      createdBy: (req as any).user.id
    });
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

// Update template (authenticated)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const template = await TemplateService.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Delete template (authenticated)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await TemplateService.deleteTemplate(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Increment download counter
router.post('/:id/download', async (req, res, next) => {
  try {
    await TemplateService.incrementDownloads(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
