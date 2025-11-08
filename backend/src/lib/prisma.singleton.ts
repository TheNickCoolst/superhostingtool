import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Singleton PrismaClient to prevent multiple instances
 * Multiple instances can exhaust database connections
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.prisma;
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Closing database connection');
  await prisma.$disconnect();
});

export default prisma;
