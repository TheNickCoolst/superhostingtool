import { Router } from 'express';
import { ModController } from '../controllers/mod.controller';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const modController = new ModController();

// Multer Setup für Datei-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads/mods');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.jar')) {
      cb(null, true);
    } else {
      cb(new Error('Only .jar files are allowed'));
    }
  }
});

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// GET /api/mods - Hole alle verfügbaren Mods
router.get('/', modController.getAllMods);

// GET /api/mods/:id - Hole einen spezifischen Mod
router.get('/:id', modController.getModById);

// POST /api/mods - Upload einen neuen Mod
router.post('/', upload.single('file'), modController.uploadMod);

// POST /api/mods/:modId/install/:serverId - Installiere Mod auf Server
router.post('/:modId/install/:serverId', modController.installMod);

// DELETE /api/mods/:modId/uninstall/:serverId - Deinstalliere Mod von Server
router.delete('/:modId/uninstall/:serverId', modController.uninstallMod);

export default router;
