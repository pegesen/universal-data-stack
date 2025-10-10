import { Dashboard, Widget, RealTimeData, DataSource, DashboardFilters } from '../types/dashboard';
import logger from './logger';
import { DataSourceConnector } from './data-source-connector';
import { RealTimeEngine } from './real-time-engine';
import { WidgetRenderer } from './widget-renderer';
import { DashboardCache } from './dashboard-cache';

export class DashboardEngine {
  private dataSourceConnector: DataSourceConnector;
  private realTimeEngine: RealTimeEngine;
  private widgetRenderer: WidgetRenderer;
  private dashboardCache: DashboardCache;
  private dashboards: Map<string, Dashboard> = new Map();
  private activeWidgets: Map<string, Widget> = new Map();

  constructor() {
    this.dataSourceConnector = new DataSourceConnector();
    this.realTimeEngine = new RealTimeEngine();
    this.widgetRenderer = new WidgetRenderer();
    this.dashboardCache = new DashboardCache();
  }

  async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    try {
      const newDashboard: Dashboard = {
        ...dashboard,
        id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0
      };

      // Validate dashboard
      await this.validateDashboard(newDashboard);

      // Initialize widgets
      for (const widget of newDashboard.widgets) {
        await this.initializeWidget(widget);
      }

      // Store dashboard
      this.dashboards.set(newDashboard.id, newDashboard);

      // Cache dashboard
      await this.dashboardCache.set(newDashboard.id, newDashboard);

      logger.info('Dashboard created', {
        dashboardId: newDashboard.id,
        name: newDashboard.name,
        widgetCount: newDashboard.widgets.length
      });

      return newDashboard;
    } catch (error) {
      logger.error('Failed to create dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardName: dashboard.name
      });
      throw error;
    }
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    try {
      // Check cache first
      let dashboard = await this.dashboardCache.get(id);
      
      if (!dashboard) {
        // Load from storage
        dashboard = this.dashboards.get(id) || null;
        
        if (dashboard) {
          await this.dashboardCache.set(id, dashboard);
        }
      }

      if (dashboard) {
        // Update view count
        dashboard.viewCount++;
        dashboard.lastViewed = new Date();
        await this.dashboardCache.set(id, dashboard);
      }

      return dashboard;
    } catch (error) {
      logger.error('Failed to get dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId: id
      });
      return null;
    }
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard | null> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        throw new Error(`Dashboard ${id} not found`);
      }

      const updatedDashboard: Dashboard = {
        ...dashboard,
        ...updates,
        updatedAt: new Date()
      };

      // Validate updated dashboard
      await this.validateDashboard(updatedDashboard);

      // Update widgets if changed
      if (updates.widgets) {
        // Remove old widgets
        for (const widget of dashboard.widgets) {
          await this.destroyWidget(widget.id);
        }

        // Initialize new widgets
        for (const widget of updatedDashboard.widgets) {
          await this.initializeWidget(widget);
        }
      }

      // Store updated dashboard
      this.dashboards.set(id, updatedDashboard);
      await this.dashboardCache.set(id, updatedDashboard);

      logger.info('Dashboard updated', {
        dashboardId: id,
        name: updatedDashboard.name,
        widgetCount: updatedDashboard.widgets.length
      });

      return updatedDashboard;
    } catch (error) {
      logger.error('Failed to update dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId: id
      });
      throw error;
    }
  }

  async deleteDashboard(id: string): Promise<void> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        throw new Error(`Dashboard ${id} not found`);
      }

      // Destroy all widgets
      for (const widget of dashboard.widgets) {
        await this.destroyWidget(widget.id);
      }

      // Remove from storage
      this.dashboards.delete(id);
      await this.dashboardCache.delete(id);

      logger.info('Dashboard deleted', {
        dashboardId: id,
        name: dashboard.name
      });
    } catch (error) {
      logger.error('Failed to delete dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId: id
      });
      throw error;
    }
  }

  async listDashboards(filters?: DashboardFilters): Promise<Dashboard[]> {
    try {
      let dashboards = Array.from(this.dashboards.values());

      // Apply filters
      if (filters) {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          dashboards = dashboards.filter(d => 
            d.name.toLowerCase().includes(searchLower) ||
            d.description?.toLowerCase().includes(searchLower)
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          dashboards = dashboards.filter(d => 
            filters.tags!.some(tag => d.tags.includes(tag))
          );
        }

        if (filters.category) {
          dashboards = dashboards.filter(d => d.metadata.category === filters.category);
        }

        if (filters.author) {
          dashboards = dashboards.filter(d => d.createdBy === filters.author);
        }

        if (filters.isPublic !== undefined) {
          dashboards = dashboards.filter(d => d.isPublic === filters.isPublic);
        }

        if (filters.createdAfter) {
          dashboards = dashboards.filter(d => d.createdAt >= filters.createdAfter!);
        }

        if (filters.createdBefore) {
          dashboards = dashboards.filter(d => d.createdAt <= filters.createdBefore!);
        }

        // Sort
        if (filters.sortBy) {
          dashboards.sort((a, b) => {
            const aValue = (a as any)[filters.sortBy!];
            const bValue = (b as any)[filters.sortBy!];
            
            if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1;
            if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1;
            return 0;
          });
        }

        // Pagination
        if (filters.offset) {
          dashboards = dashboards.slice(filters.offset);
        }
        if (filters.limit) {
          dashboards = dashboards.slice(0, filters.limit);
        }
      }

      return dashboards;
    } catch (error) {
      logger.error('Failed to list dashboards', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters
      });
      return [];
    }
  }

  async getWidgetData(widgetId: string, filters?: any): Promise<any> {
    try {
      const widget = this.activeWidgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found`);
      }

      // Connect to data source
      const connection = await this.dataSourceConnector.connect(widget.dataSource);

      try {
        // Fetch data
        const data = await this.dataSourceConnector.fetchData(connection, widget.dataSource, filters);

        // Apply widget-specific transformations
        const transformedData = await this.transformWidgetData(data, widget);

        return transformedData;
      } finally {
        await this.dataSourceConnector.disconnect(connection);
      }
    } catch (error) {
      logger.error('Failed to get widget data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        widgetId
      });
      throw error;
    }
  }

  async refreshWidget(widgetId: string): Promise<void> {
    try {
      const widget = this.activeWidgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found`);
      }

      // Get fresh data
      const data = await this.getWidgetData(widgetId);

      // Publish real-time update
      await this.realTimeEngine.publish(widgetId, {
        widgetId,
        data,
        timestamp: new Date()
      });

      logger.debug('Widget refreshed', { widgetId });
    } catch (error) {
      logger.error('Failed to refresh widget', {
        error: error instanceof Error ? error.message : 'Unknown error',
        widgetId
      });
      throw error;
    }
  }

  async renderDashboard(dashboardId: string): Promise<string> {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      // Render dashboard HTML
      const html = await this.widgetRenderer.renderDashboard(dashboard);

      return html;
    } catch (error) {
      logger.error('Failed to render dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId
      });
      throw error;
    }
  }

  async exportDashboard(dashboardId: string, format: 'json' | 'pdf' | 'image'): Promise<Buffer> {
    try {
      const dashboard = await this.getDashboard(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      switch (format) {
        case 'json':
          return Buffer.from(JSON.stringify(dashboard, null, 2));
        
        case 'pdf':
          return await this.widgetRenderer.exportToPDF(dashboard);
        
        case 'image':
          return await this.widgetRenderer.exportToImage(dashboard);
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dashboardId,
        format
      });
      throw error;
    }
  }

  private async validateDashboard(dashboard: Dashboard): Promise<void> {
    // Validate required fields
    if (!dashboard.name) {
      throw new Error('Dashboard name is required');
    }

    if (!dashboard.layout) {
      throw new Error('Dashboard layout is required');
    }

    if (!dashboard.widgets || dashboard.widgets.length === 0) {
      throw new Error('Dashboard must have at least one widget');
    }

    // Validate widgets
    for (const widget of dashboard.widgets) {
      await this.validateWidget(widget);
    }

    // Validate data sources
    const dataSourceIds = new Set(dashboard.widgets.map(w => w.dataSource.id));
    for (const dataSourceId of dataSourceIds) {
      const dataSource = dashboard.widgets.find(w => w.dataSource.id === dataSourceId)?.dataSource;
      if (dataSource) {
        await this.validateDataSource(dataSource);
      }
    }
  }

  private async validateWidget(widget: Widget): Promise<void> {
    if (!widget.id) {
      throw new Error('Widget ID is required');
    }

    if (!widget.type) {
      throw new Error('Widget type is required');
    }

    if (!widget.title) {
      throw new Error('Widget title is required');
    }

    if (!widget.dataSource) {
      throw new Error('Widget data source is required');
    }

    if (!widget.position) {
      throw new Error('Widget position is required');
    }

    if (!widget.size) {
      throw new Error('Widget size is required');
    }
  }

  private async validateDataSource(dataSource: DataSource): Promise<void> {
    if (!dataSource.id) {
      throw new Error('Data source ID is required');
    }

    if (!dataSource.name) {
      throw new Error('Data source name is required');
    }

    if (!dataSource.type) {
      throw new Error('Data source type is required');
    }

    if (!dataSource.config) {
      throw new Error('Data source config is required');
    }
  }

  private async initializeWidget(widget: Widget): Promise<void> {
    try {
      // Store widget
      this.activeWidgets.set(widget.id, widget);

      // Set up real-time subscription if enabled
      if (widget.autoRefresh && widget.refreshInterval) {
        await this.realTimeEngine.subscribe(widget.id, async (data: RealTimeData) => {
          // Handle real-time data update
          logger.debug('Widget received real-time data', {
            widgetId: widget.id,
            dataTimestamp: data.timestamp
          });
        });
      }

      logger.debug('Widget initialized', { widgetId: widget.id });
    } catch (error) {
      logger.error('Failed to initialize widget', {
        error: error instanceof Error ? error.message : 'Unknown error',
        widgetId: widget.id
      });
      throw error;
    }
  }

  private async destroyWidget(widgetId: string): Promise<void> {
    try {
      // Unsubscribe from real-time updates
      await this.realTimeEngine.unsubscribe(widgetId);

      // Remove widget
      this.activeWidgets.delete(widgetId);

      logger.debug('Widget destroyed', { widgetId });
    } catch (error) {
      logger.error('Failed to destroy widget', {
        error: error instanceof Error ? error.message : 'Unknown error',
        widgetId
      });
    }
  }

  private async transformWidgetData(data: any, widget: Widget): Promise<any> {
    // Apply widget-specific data transformations
    // This would depend on the widget type and configuration
    return data;
  }

  async getDashboardStats(): Promise<{
    totalDashboards: number;
    activeWidgets: number;
    totalViews: number;
    averageWidgetsPerDashboard: number;
  }> {
    const totalDashboards = this.dashboards.size;
    const activeWidgets = this.activeWidgets.size;
    const totalViews = Array.from(this.dashboards.values())
      .reduce((sum, dashboard) => sum + dashboard.viewCount, 0);
    const averageWidgetsPerDashboard = totalDashboards > 0 
      ? Array.from(this.dashboards.values())
          .reduce((sum, dashboard) => sum + dashboard.widgets.length, 0) / totalDashboards
      : 0;

    return {
      totalDashboards,
      activeWidgets,
      totalViews,
      averageWidgetsPerDashboard
    };
  }
}