import Application from './app';
import logger from './services/logger';

async function startServer(): Promise<void> {
  try {
    const app = new Application();
    await app.start();
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Start the server
startServer();