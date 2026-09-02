import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const server = app.listen(config.port, () => {
  logger.info(`===================================================`);
  logger.info(`FoodBaskets Corp POS Backend running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
  logger.info(`===================================================`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
