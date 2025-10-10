import logger from './logger';
import { LoadBalancer, LoadBalancerStats, ServiceInfo } from '../types';

export class RoundRobinLoadBalancer implements LoadBalancer {
  private currentIndex: Map<string, number> = new Map();
  private serviceStats: Map<string, {
    requests: number;
    errors: number;
    totalResponseTime: number;
    isHealthy: boolean;
  }> = new Map();

  select(services: ServiceInfo[]): ServiceInfo {
    if (services.length === 0) {
      throw new Error('No services available');
    }

    // Filter healthy services
    const healthyServices = services.filter(service => {
      const stats = this.serviceStats.get(service.id);
      return !stats || stats.isHealthy;
    });

    if (healthyServices.length === 0) {
      // If no healthy services, fall back to all services
      const service = services[0];
      logger.warn('No healthy services available, using first available service', {
        serviceId: service.id,
        serviceName: service.name
      });
      return service;
    }

    const serviceName = healthyServices[0].name;
    const currentIndex = this.currentIndex.get(serviceName) || 0;
    const selectedService = healthyServices[currentIndex % healthyServices.length];
    
    // Update index for next request
    this.currentIndex.set(serviceName, (currentIndex + 1) % healthyServices.length);

    // Update stats
    this.updateStats(selectedService.id, true, 0);

    logger.debug('Service selected', {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      address: selectedService.address,
      port: selectedService.port,
      index: currentIndex
    });

    return selectedService;
  }

  updateHealth(serviceId: string, isHealthy: boolean): void {
    const stats = this.serviceStats.get(serviceId);
    if (stats) {
      stats.isHealthy = isHealthy;
      this.serviceStats.set(serviceId, stats);
    } else {
      this.serviceStats.set(serviceId, {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        isHealthy
      });
    }

    logger.debug('Service health updated', {
      serviceId,
      isHealthy
    });
  }

  recordRequest(serviceId: string, responseTime: number, isError: boolean = false): void {
    const stats = this.serviceStats.get(serviceId) || {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      isHealthy: true
    };

    stats.requests++;
    stats.totalResponseTime += responseTime;
    
    if (isError) {
      stats.errors++;
    }

    this.serviceStats.set(serviceId, stats);
  }

  private updateStats(serviceId: string, isError: boolean, responseTime: number): void {
    this.recordRequest(serviceId, responseTime, isError);
  }

  getStats(): LoadBalancerStats {
    const totalRequests = Array.from(this.serviceStats.values())
      .reduce((sum, stats) => sum + stats.requests, 0);

    const serviceStats: { [serviceId: string]: any } = {};
    
    for (const [serviceId, stats] of this.serviceStats) {
      serviceStats[serviceId] = {
        requests: stats.requests,
        errors: stats.errors,
        avgResponseTime: stats.requests > 0 ? stats.totalResponseTime / stats.requests : 0,
        isHealthy: stats.isHealthy
      };
    }

    return {
      totalRequests,
      serviceStats
    };
  }
}

export class WeightedRoundRobinLoadBalancer implements LoadBalancer {
  private currentWeight: Map<string, number> = new Map();
  private serviceStats: Map<string, {
    requests: number;
    errors: number;
    totalResponseTime: number;
    isHealthy: boolean;
    weight: number;
  }> = new Map();

  select(services: ServiceInfo[]): ServiceInfo {
    if (services.length === 0) {
      throw new Error('No services available');
    }

    // Filter healthy services
    const healthyServices = services.filter(service => {
      const stats = this.serviceStats.get(service.id);
      return !stats || stats.isHealthy;
    });

    if (healthyServices.length === 0) {
      const service = services[0];
      logger.warn('No healthy services available, using first available service', {
        serviceId: service.id,
        serviceName: service.name
      });
      return service;
    }

    const serviceName = healthyServices[0].name;
    let totalWeight = 0;
    let selectedService: ServiceInfo | null = null;

    // Calculate total weight
    for (const service of healthyServices) {
      const stats = this.serviceStats.get(service.id);
      const weight = stats?.weight || service.meta.weight || 1;
      totalWeight += weight;
    }

    // Find service with highest current weight
    let maxWeight = 0;
    for (const service of healthyServices) {
      const stats = this.serviceStats.get(service.id);
      const weight = stats?.weight || service.meta.weight || 1;
      const currentWeight = this.currentWeight.get(service.id) || 0;
      const newWeight = currentWeight + weight;

      if (newWeight > maxWeight) {
        maxWeight = newWeight;
        selectedService = service;
      }
    }

    if (!selectedService) {
      selectedService = healthyServices[0];
    }

    // Update weights
    for (const service of healthyServices) {
      const stats = this.serviceStats.get(service.id);
      const weight = stats?.weight || service.meta.weight || 1;
      const currentWeight = this.currentWeight.get(service.id) || 0;
      
      if (service.id === selectedService.id) {
        this.currentWeight.set(service.id, currentWeight - totalWeight);
      } else {
        this.currentWeight.set(service.id, currentWeight + weight);
      }
    }

    // Update stats
    this.updateStats(selectedService.id, true, 0);

    logger.debug('Weighted service selected', {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      address: selectedService.address,
      port: selectedService.port,
      weight: selectedService.meta.weight || 1
    });

    return selectedService;
  }

  updateHealth(serviceId: string, isHealthy: boolean): void {
    const stats = this.serviceStats.get(serviceId);
    if (stats) {
      stats.isHealthy = isHealthy;
      this.serviceStats.set(serviceId, stats);
    } else {
      this.serviceStats.set(serviceId, {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        isHealthy,
        weight: 1
      });
    }

    logger.debug('Service health updated', {
      serviceId,
      isHealthy
    });
  }

  recordRequest(serviceId: string, responseTime: number, isError: boolean = false): void {
    const stats = this.serviceStats.get(serviceId) || {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      isHealthy: true,
      weight: 1
    };

    stats.requests++;
    stats.totalResponseTime += responseTime;
    
    if (isError) {
      stats.errors++;
    }

    this.serviceStats.set(serviceId, stats);
  }

  private updateStats(serviceId: string, isError: boolean, responseTime: number): void {
    this.recordRequest(serviceId, responseTime, isError);
  }

  getStats(): LoadBalancerStats {
    const totalRequests = Array.from(this.serviceStats.values())
      .reduce((sum, stats) => sum + stats.requests, 0);

    const serviceStats: { [serviceId: string]: any } = {};
    
    for (const [serviceId, stats] of this.serviceStats) {
      serviceStats[serviceId] = {
        requests: stats.requests,
        errors: stats.errors,
        avgResponseTime: stats.requests > 0 ? stats.totalResponseTime / stats.requests : 0,
        isHealthy: stats.isHealthy,
        weight: stats.weight
      };
    }

    return {
      totalRequests,
      serviceStats
    };
  }
}

export class LeastConnectionsLoadBalancer implements LoadBalancer {
  private serviceStats: Map<string, {
    requests: number;
    errors: number;
    totalResponseTime: number;
    isHealthy: boolean;
    activeConnections: number;
  }> = new Map();

  select(services: ServiceInfo[]): ServiceInfo {
    if (services.length === 0) {
      throw new Error('No services available');
    }

    // Filter healthy services
    const healthyServices = services.filter(service => {
      const stats = this.serviceStats.get(service.id);
      return !stats || stats.isHealthy;
    });

    if (healthyServices.length === 0) {
      const service = services[0];
      logger.warn('No healthy services available, using first available service', {
        serviceId: service.id,
        serviceName: service.name
      });
      return service;
    }

    // Find service with least connections
    let selectedService = healthyServices[0];
    let minConnections = this.serviceStats.get(selectedService.id)?.activeConnections || 0;

    for (const service of healthyServices) {
      const stats = this.serviceStats.get(service.id);
      const connections = stats?.activeConnections || 0;
      
      if (connections < minConnections) {
        minConnections = connections;
        selectedService = service;
      }
    }

    // Increment connection count
    this.incrementConnections(selectedService.id);

    logger.debug('Service selected (least connections)', {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      address: selectedService.address,
      port: selectedService.port,
      connections: minConnections + 1
    });

    return selectedService;
  }

  updateHealth(serviceId: string, isHealthy: boolean): void {
    const stats = this.serviceStats.get(serviceId);
    if (stats) {
      stats.isHealthy = isHealthy;
      this.serviceStats.set(serviceId, stats);
    } else {
      this.serviceStats.set(serviceId, {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        isHealthy,
        activeConnections: 0
      });
    }

    logger.debug('Service health updated', {
      serviceId,
      isHealthy
    });
  }

  recordRequest(serviceId: string, responseTime: number, isError: boolean = false): void {
    const stats = this.serviceStats.get(serviceId) || {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      isHealthy: true,
      activeConnections: 0
    };

    stats.requests++;
    stats.totalResponseTime += responseTime;
    
    if (isError) {
      stats.errors++;
    }

    this.serviceStats.set(serviceId, stats);
  }

  incrementConnections(serviceId: string): void {
    const stats = this.serviceStats.get(serviceId) || {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      isHealthy: true,
      activeConnections: 0
    };

    stats.activeConnections++;
    this.serviceStats.set(serviceId, stats);
  }

  decrementConnections(serviceId: string): void {
    const stats = this.serviceStats.get(serviceId);
    if (stats && stats.activeConnections > 0) {
      stats.activeConnections--;
      this.serviceStats.set(serviceId, stats);
    }
  }

  getStats(): LoadBalancerStats {
    const totalRequests = Array.from(this.serviceStats.values())
      .reduce((sum, stats) => sum + stats.requests, 0);

    const serviceStats: { [serviceId: string]: any } = {};
    
    for (const [serviceId, stats] of this.serviceStats) {
      serviceStats[serviceId] = {
        requests: stats.requests,
        errors: stats.errors,
        avgResponseTime: stats.requests > 0 ? stats.totalResponseTime / stats.requests : 0,
        isHealthy: stats.isHealthy,
        activeConnections: stats.activeConnections
      };
    }

    return {
      totalRequests,
      serviceStats
    };
  }
}