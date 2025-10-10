// Service Discovery Types
export interface ServiceInfo {
  id: string;
  name: string;
  address: string;
  port: number;
  tags: string[];
  meta: {
    version: string;
    health: string;
    weight: number;
    region?: string;
    zone?: string;
  };
  check?: {
    http: string;
    interval: string;
    timeout: string;
    deregisterCriticalServiceAfter?: string;
  };
}

export interface ServiceRegistry {
  register(service: ServiceInfo): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInfo[]>;
  watch(serviceName: string, callback: (services: ServiceInfo[]) => void): void;
  health(): Promise<boolean>;
}

// API Gateway Types
export interface RouteConfig {
  path: string;
  service: string;
  methods: string[];
  auth: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    threshold: number;
    timeout: number;
  };
}

export interface GatewayConfig {
  port: number;
  consul: {
    host: string;
    port: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    issuer: string;
  };
  routes: RouteConfig[];
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

// Load Balancing Types
export interface LoadBalancer {
  select(services: ServiceInfo[]): ServiceInfo;
  updateHealth(serviceId: string, isHealthy: boolean): void;
  getStats(): LoadBalancerStats;
}

export interface LoadBalancerStats {
  totalRequests: number;
  serviceStats: {
    [serviceId: string]: {
      requests: number;
      errors: number;
      avgResponseTime: number;
      isHealthy: boolean;
    };
  };
}

// Circuit Breaker Types
export interface CircuitBreaker {
  canExecute(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  reset(): void;
}

// Request Context Types
export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  service: string;
  method: string;
  path: string;
  startTime: number;
  ip: string;
  userAgent: string;
}

// Middleware Types
export interface GatewayMiddleware {
  authenticate(): (req: any, res: any, next: any) => void;
  rateLimit(): (req: any, res: any, next: any) => void;
  loadBalance(): (req: any, res: any, next: any) => void;
  circuitBreaker(): (req: any, res: any, next: any) => void;
  logging(): (req: any, res: any, next: any) => void;
  cors(): (req: any, res: any, next: any) => void;
  compression(): (req: any, res: any, next: any) => void;
}

// Proxy Types
export interface ProxyConfig {
  target: string;
  changeOrigin: boolean;
  pathRewrite?: {
    [key: string]: string;
  };
  onProxyReq?: (proxyReq: any, req: any, res: any) => void;
  onProxyRes?: (proxyRes: any, req: any, res: any) => void;
  onError?: (err: any, req: any, res: any) => void;
}

// Health Check Types
export interface HealthCheck {
  name: string;
  check(): Promise<boolean>;
  timeout?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    [name: string]: {
      status: 'pass' | 'fail';
      message?: string;
      duration?: number;
    };
  };
  timestamp: string;
  uptime: number;
}

// Metrics Types
export interface GatewayMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  activeConnections: number;
  serviceMetrics: {
    [serviceName: string]: {
      requests: number;
      errors: number;
      avgResponseTime: number;
      lastError?: string;
    };
  };
}

// Error Types
export interface GatewayError {
  code: string;
  message: string;
  statusCode: number;
  service?: string;
  requestId?: string;
  timestamp: string;
}

export enum GatewayErrorCode {
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT = 'SERVICE_TIMEOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}