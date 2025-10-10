import winston from 'winston';
import { LogEntry, LogContext } from '../types';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
      ),
    ),
  }),
];

// If we're not in production, log to the console with the format:
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`,
        ),
      ),
    }),
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false,
});

// Enhanced logger interface
export class Logger {
  private winston: winston.Logger;

  constructor() {
    this.winston = logger;
  }

  error(message: string, context?: LogContext): void {
    this.winston.error(message, { context });
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, { context });
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, { context });
  }

  http(message: string, context?: LogContext): void {
    this.winston.http(message, { context });
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, { context });
  }

  // Structured logging methods
  logRequest(method: string, url: string, statusCode: number, responseTime: number): void {
    this.http('HTTP Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`
    });
  }

  logError(error: Error, context?: LogContext): void {
    this.error('Application Error', {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  logDatabase(operation: string, collection: string, context?: LogContext): void {
    this.info(`Database ${operation}`, {
      operation,
      collection,
      ...context
    });
  }

  logSecurity(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, context);
  }
}

export default new Logger();