import logger from './logger';

export interface CircuitBreakerOptions {
  threshold: number; // Number of failures before opening
  timeout: number; // Time in ms before trying half-open
  resetTimeout: number; // Time in ms before resetting failure count
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private successCount: number = 0;
  private halfOpenMaxCalls: number = 3;

  constructor(private options: CircuitBreakerOptions) {}

  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.nextAttemptTime) {
          this.state = 'HALF_OPEN';
          this.successCount = 0;
          logger.info('Circuit breaker transitioning to HALF_OPEN', {
            service: this.constructor.name,
            failureCount: this.failureCount
          });
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.successCount < this.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  recordSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        logger.info('Circuit breaker transitioning to CLOSED', {
          service: this.constructor.name,
          successCount: this.successCount
        });
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.options.timeout;
      logger.warn('Circuit breaker transitioning to OPEN from HALF_OPEN', {
        service: this.constructor.name,
        failureCount: this.failureCount
      });
    } else if (this.state === 'CLOSED' && this.failureCount >= this.options.threshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.options.timeout;
      logger.warn('Circuit breaker transitioning to OPEN', {
        service: this.constructor.name,
        failureCount: this.failureCount,
        threshold: this.options.threshold
      });
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    
    logger.info('Circuit breaker reset', {
      service: this.constructor.name
    });
  }

  getStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getBreaker(serviceName: string, options: CircuitBreakerOptions): CircuitBreaker {
    const key = `${serviceName}`;
    
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(options));
      logger.info('Circuit breaker created', {
        service: serviceName,
        options
      });
    }

    return this.breakers.get(key)!;
  }

  getBreakerStats(): { [serviceName: string]: any } {
    const stats: { [serviceName: string]: any } = {};
    
    for (const [serviceName, breaker] of this.breakers) {
      stats[serviceName] = breaker.getStats();
    }

    return stats;
  }

  resetBreaker(serviceName: string): void {
    const key = `${serviceName}`;
    const breaker = this.breakers.get(key);
    
    if (breaker) {
      breaker.reset();
      logger.info('Circuit breaker reset', { service: serviceName });
    }
  }

  resetAllBreakers(): void {
    for (const [serviceName, breaker] of this.breakers) {
      breaker.reset();
    }
    
    logger.info('All circuit breakers reset');
  }
}