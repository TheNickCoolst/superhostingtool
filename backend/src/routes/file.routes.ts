import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import FileManagerService from '../services/file-manager.service';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// List files in a directory
router.get('/server/:serverId/list', authenticate, async (req, res, next) => {
  try {
    const path = (req.query.path as string) || '/';
    const files = await FileManagerService.listFiles(req.params.serverId, path);
    res.json(files);
  } catch (error) {
    next(error);
  }
});

// Read file content
router.get('/server/:serverId/read', authenticate, async (req, res, next) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    const content = await FileManagerService.readFile(req.params.serverId, filePath);
    res.json({ content });
  } catch (error) {
    next(error);
  }
});

// Write file content
router.post('/server/:serverId/write', authenticate, async (req, res, next) => {
  try {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content required' });
    }
    await FileManagerService.writeFile(req.params.serverId, filePath, content);
    res.json({ message: 'File written successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/server/:serverId/file', authenticate, async (req, res, next) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    await FileManagerService.deleteFile(req.params.serverId, filePath);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Create directory
router.post('/server/:serverId/directory', authenticate, async (req, res, next) => {
  try {
    const { dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path required' });
    }
    await FileManagerService.createDirectory(req.params.serverId, dirPath);
    res.json({ message: 'Directory created successfully' });
  } catch (error) {
    next(error);
  }
});

// Upload file
router.post('/server/:serverId/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.body.path || `/${req.file.originalname}`;
    await FileManagerService.uploadFile(req.params.serverId, filePath, req.file.buffer);
    res.json({ message: 'File uploaded successfully', path: filePath });
  } catch (error) {
    next(error);
  }
});

// Download file
router.get('/server/:serverId/download', authenticate, async (req, res, next) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    const fileData = await FileManagerService.downloadFile(req.params.serverId, filePath);
    const fileName = filePath.split('/').pop() || 'download';

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileData);
  } catch (error) {
    next(error);
  }
});

// Get file info
router.get('/server/:serverId/info', authenticate, async (req, res, next) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    const info = await FileManagerService.getFileInfo(req.params.serverId, filePath);
    res.json(info);
  } catch (error) {
    next(error);
  }
});

export default router;
