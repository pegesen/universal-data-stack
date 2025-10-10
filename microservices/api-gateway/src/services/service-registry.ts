import consul from 'consul';
import logger from './logger';
import { ServiceRegistry, ServiceInfo } from '../types';

export class ConsulServiceRegistry implements ServiceRegistry {
  private consul: consul.Consul;
  private services: Map<string, ServiceInfo[]> = new Map();
  private watchers: Map<string, consul.Watch> = new Map();

  constructor(consulHost: string, consulPort: number) {
    this.consul = consul({
      host: consulHost,
      port: consulPort,
      promisify: true
    });
  }

  async register(service: ServiceInfo): Promise<void> {
    try {
      const serviceDef = {
        id: service.id,
        name: service.name,
        address: service.address,
        port: service.port,
        tags: service.tags,
        meta: service.meta,
        check: service.check
      };

      await this.consul.agent.service.register(serviceDef);
      
      logger.info('Service registered', {
        serviceId: service.id,
        serviceName: service.name,
        address: service.address,
        port: service.port
      });
    } catch (error) {
      logger.error('Failed to register service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: service.id,
        serviceName: service.name
      });
      throw error;
    }
  }

  async deregister(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      
      logger.info('Service deregistered', {
        serviceId
      });
    } catch (error) {
      logger.error('Failed to deregister service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId
      });
      throw error;
    }
  }

  async discover(serviceName: string): Promise<ServiceInfo[]> {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true
      });

      const serviceInfos: ServiceInfo[] = services.map((service: any) => ({
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags || [],
        meta: service.Service.Meta || {},
        check: service.Checks?.[0] ? {
          http: service.Checks[0].HTTP,
          interval: service.Checks[0].Interval,
          timeout: service.Checks[0].Timeout,
          deregisterCriticalServiceAfter: service.Checks[0].DeregisterCriticalServiceAfter
        } : undefined
      }));

      this.services.set(serviceName, serviceInfos);
      return serviceInfos;
    } catch (error) {
      logger.error('Failed to discover services', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceName
      });
      return [];
    }
  }

  watch(serviceName: string, callback: (services: ServiceInfo[]) => void): void {
    try {
      const watch = this.consul.watch({
        method: this.consul.health.service,
        options: {
          service: serviceName,
          passing: true
        }
      });

      watch.on('change', (data: any) => {
        const serviceInfos: ServiceInfo[] = data.map((service: any) => ({
          id: service.Service.ID,
          name: service.Service.Service,
          address: service.Service.Address,
          port: service.Service.Port,
          tags: service.Service.Tags || [],
          meta: service.Service.Meta || {},
          check: service.Checks?.[0] ? {
            http: service.Checks[0].HTTP,
            interval: service.Checks[0].Interval,
            timeout: service.Checks[0].Timeout,
            deregisterCriticalServiceAfter: service.Checks[0].DeregisterCriticalServiceAfter
          } : undefined
        }));

        this.services.set(serviceName, serviceInfos);
        callback(serviceInfos);
      });

      watch.on('error', (error: any) => {
        logger.error('Service watch error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          serviceName
        });
      });

      this.watchers.set(serviceName, watch);
      
      logger.info('Service watch started', {
        serviceName
      });
    } catch (error) {
      logger.error('Failed to start service watch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceName
      });
    }
  }

  async health(): Promise<boolean> {
    try {
      const leader = await this.consul.status.leader();
      return !!leader;
    } catch (error) {
      logger.error('Consul health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  getServices(serviceName: string): ServiceInfo[] {
    return this.services.get(serviceName) || [];
  }

  stopWatching(serviceName: string): void {
    const watcher = this.watchers.get(serviceName);
    if (watcher) {
      watcher.end();
      this.watchers.delete(serviceName);
      logger.info('Service watch stopped', { serviceName });
    }
  }

  stopAllWatching(): void {
    for (const [serviceName, watcher] of this.watchers) {
      watcher.end();
      logger.info('Service watch stopped', { serviceName });
    }
    this.watchers.clear();
  }
}