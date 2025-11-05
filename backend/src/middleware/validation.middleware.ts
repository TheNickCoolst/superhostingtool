import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';

/**
 * Validation Middleware
 * Provides comprehensive input validation for all endpoints
 */

/**
 * Handles validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Auth Validation Rules
 */
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Server Creation Validation Rules
 */
export const createServerValidation = [
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Server name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-\s]+$/)
    .withMessage('Server name can only contain letters, numbers, spaces, underscores, and hyphens')
    .trim(),
  body('minecraftVersion')
    .notEmpty()
    .withMessage('Minecraft version is required')
    .matches(/^\d+\.\d+(\.\d+)?$/)
    .withMessage('Invalid Minecraft version format (e.g., 1.20.4)'),
  body('versionType')
    .isIn(['vanilla', 'forge', 'fabric', 'paper', 'spigot'])
    .withMessage('Version type must be one of: vanilla, forge, fabric, paper, spigot'),
  body('allocatedRam')
    .isInt({ min: 512, max: 32768 })
    .withMessage('Allocated RAM must be between 512 MB and 32 GB'),
  body('allocatedCpu')
    .isFloat({ min: 0.5, max: 32 })
    .withMessage('Allocated CPU must be between 0.5 and 32 cores'),
  body('maxPlayers')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max players must be between 1 and 1000'),
  body('difficulty')
    .isIn(['peaceful', 'easy', 'normal', 'hard'])
    .withMessage('Difficulty must be one of: peaceful, easy, normal, hard'),
  body('gameMode')
    .isIn(['survival', 'creative', 'adventure', 'spectator'])
    .withMessage('Game mode must be one of: survival, creative, adventure, spectator'),
  body('modIds')
    .optional()
    .isArray()
    .withMessage('Mod IDs must be an array'),
  handleValidationErrors
];

/**
 * Server Update Validation Rules
 */
export const updateServerValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid server ID'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Server name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-\s]+$/)
    .withMessage('Server name can only contain letters, numbers, spaces, underscores, and hyphens')
    .trim(),
  body('allocatedRam')
    .optional()
    .isInt({ min: 512, max: 32768 })
    .withMessage('Allocated RAM must be between 512 MB and 32 GB'),
  body('allocatedCpu')
    .optional()
    .isFloat({ min: 0.5, max: 32 })
    .withMessage('Allocated CPU must be between 0.5 and 32 cores'),
  body('maxPlayers')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max players must be between 1 and 1000'),
  handleValidationErrors
];

/**
 * Server Command Validation Rules
 */
export const executeCommandValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid server ID'),
  body('command')
    .notEmpty()
    .withMessage('Command is required')
    .isLength({ max: 500 })
    .withMessage('Command must be less than 500 characters')
    .trim()
    // Prevent dangerous commands
    .custom((value) => {
      const dangerousCommands = ['rm ', 'del ', 'format', 'shutdown', 'reboot'];
      const lowerCommand = value.toLowerCase();
      for (const dangerous of dangerousCommands) {
        if (lowerCommand.includes(dangerous)) {
          throw new Error('Command contains potentially dangerous operations');
        }
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Backup Validation Rules
 */
export const createBackupValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid server ID'),
  body('backupName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Backup name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Backup name can only contain letters, numbers, underscores, and hyphens'),
  handleValidationErrors
];

export const restoreBackupValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid server ID'),
  body('backupPath')
    .notEmpty()
    .withMessage('Backup path is required')
    .matches(/^[a-zA-Z0-9_\/-]+\.tar\.gz$/)
    .withMessage('Invalid backup path format'),
  handleValidationErrors
];

/**
 * Host Validation Rules
 */
export const createHostValidation = [
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Host name must be between 1 and 50 characters')
    .trim(),
  body('ipAddress')
    .isIP()
    .withMessage('Must be a valid IP address'),
  body('totalRam')
    .isInt({ min: 1024, max: 1048576 })
    .withMessage('Total RAM must be between 1 GB and 1 TB'),
  body('totalCpu')
    .isInt({ min: 1, max: 256 })
    .withMessage('Total CPU must be between 1 and 256 cores'),
  body('totalStorage')
    .isInt({ min: 10240, max: 10485760 })
    .withMessage('Total storage must be between 10 GB and 10 TB'),
  handleValidationErrors
];

/**
 * Mod Validation Rules
 */
export const uploadModValidation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Mod name must be between 1 and 100 characters')
    .trim(),
  body('version')
    .notEmpty()
    .withMessage('Mod version is required')
    .matches(/^\d+\.\d+(\.\d+)?$/)
    .withMessage('Invalid version format (e.g., 1.0.0)'),
  body('minecraftVersion')
    .notEmpty()
    .withMessage('Minecraft version is required')
    .matches(/^\d+\.\d+(\.\d+)?$/)
    .withMessage('Invalid Minecraft version format (e.g., 1.20.4)'),
  body('modLoader')
    .isIn(['forge', 'fabric'])
    .withMessage('Mod loader must be either forge or fabric'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

/**
 * Generic ID Validation
 */
export const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Pagination Validation
 */
export const paginationValidation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  if (page < 1) {
    return res.status(400).json({ error: 'Page must be greater than 0' });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Limit must be between 1 and 100' });
  }

  req.query.page = page.toString();
  req.query.limit = limit.toString();
  next();
};
