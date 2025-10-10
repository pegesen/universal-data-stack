import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GridLayout, Responsive, WidthProvider } from 'react-grid-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Dashboard, Widget, DashboardFilter, RealTimeConfig } from '../types/dashboard';
import { WidgetComponent } from './Widget';
import { FilterPanel } from './FilterPanel';
import { DashboardToolbar } from './DashboardToolbar';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';
import { useDashboardData } from '../hooks/useDashboardData';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { useDashboardPermissions } from '../hooks/useDashboardPermissions';
import styled from 'styled-components';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardProps {
  dashboard: Dashboard;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onLayoutChange?: (layout: any) => void;
  onFilterChange?: (filters: any) => void;
  onRefresh?: () => void;
  realTimeConfig?: RealTimeConfig;
  editable?: boolean;
  className?: string;
}

const DashboardContainer = styled.div`
  width: 100%;
  height: 100vh;
  background: ${props => props.theme.colors.background};
  overflow: hidden;
  position: relative;
`;

const DashboardContent = styled.div`
  width: 100%;
  height: calc(100vh - 60px);
  padding: 16px;
  overflow: auto;
`;

const GridContainer = styled.div`
  .react-grid-layout {
    position: relative;
  }
  
  .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top, width, height;
  }
  
  .react-grid-item.css-transforms {
    transition-property: transform, width, height;
  }
  
  .react-grid-item > .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0;
    right: 0;
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNNiA2TDAgNloiIGZpbGw9IiM0NDQiLz4KPC9zdmc+');
    background-position: bottom right;
    padding: 0 3px 3px 0;
    background-repeat: no-repeat;
    background-origin: content-box;
    box-sizing: border-box;
    cursor: se-resize;
  }
  
  .react-grid-item.react-grid-placeholder {
    background: ${props => props.theme.colors.primary}20;
    border: 2px dashed ${props => props.theme.colors.primary};
    opacity: 0.2;
    transition-duration: 100ms;
    z-index: 2;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
  }
  
  .react-grid-item > .react-resizable-handle::after {
    content: '';
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 5px;
    height: 5px;
    border-right: 2px solid rgba(0, 0, 0, 0.4);
    border-bottom: 2px solid rgba(0, 0, 0, 0.4);
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: ${props => props.theme.colors.error}20;
  border: 1px solid ${props => props.theme.colors.error};
  border-radius: 4px;
  color: ${props => props.theme.colors.error};
  margin: 16px;
`;

export const DashboardComponent: React.FC<DashboardProps> = ({
  dashboard,
  onWidgetUpdate,
  onLayoutChange,
  onFilterChange,
  onRefresh,
  realTimeConfig,
  editable = false,
  className
}) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState(dashboard.layout);

  const { data, loading, error: dataError, refetch } = useDashboardData(dashboard.id, filters);
  const { hasPermission } = useDashboardPermissions(dashboard.id);
  const { isConnected, lastUpdate } = useRealTimeUpdates(dashboard.id, realTimeConfig);

  const canEdit = editable && hasPermission('edit');
  const canDelete = editable && hasPermission('delete');
  const canShare = hasPermission('share');

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: any) => {
    setLayout(prev => ({
      ...prev,
      breakpoints: {
        ...prev.breakpoints,
        lg: {
          ...prev.breakpoints.lg,
          // Update layout based on newLayout
        }
      }
    }));
    onLayoutChange?.(newLayout);
  }, [onLayoutChange]);

  // Handle widget updates
  const handleWidgetUpdate = useCallback((widgetId: string, widgetData: any) => {
    onWidgetUpdate?.(widgetId, widgetData);
  }, [onWidgetUpdate]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
    onRefresh?.();
  }, [refetch, onRefresh]);

  // Auto-refresh effect
  useEffect(() => {
    if (dashboard.autoRefresh && dashboard.refreshInterval > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, dashboard.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [dashboard.autoRefresh, dashboard.refreshInterval, handleRefresh]);

  // Error handling
  useEffect(() => {
    if (dataError) {
      setError(dataError.message);
    } else {
      setError(null);
    }
  }, [dataError]);

  // Memoized layout configuration
  const layoutConfig = useMemo(() => ({
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 60,
    margin: [16, 16],
    containerPadding: [16, 16],
    isDraggable: canEdit,
    isResizable: canEdit,
    isDroppable: canEdit,
    compactType: 'vertical' as const,
    preventCollision: false,
    useCSSTransforms: true,
    transformScale: 1,
  }), [canEdit]);

  // Memoized widgets
  const widgets = useMemo(() => {
    return dashboard.widgets.map(widget => (
      <div key={widget.id} data-grid={widget.position}>
        <ErrorBoundary>
          <WidgetComponent
            widget={widget}
            data={data?.[widget.id]}
            onUpdate={(widgetData) => handleWidgetUpdate(widget.id, widgetData)}
            editable={canEdit}
            realTime={realTimeConfig?.enabled}
            lastUpdate={lastUpdate}
          />
        </ErrorBoundary>
      </div>
    ));
  }, [dashboard.widgets, data, handleWidgetUpdate, canEdit, realTimeConfig?.enabled, lastUpdate]);

  if (loading && !data) {
    return (
      <DashboardContainer className={className}>
        <LoadingOverlay>
          <LoadingSpinner size="large" />
        </LoadingOverlay>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer className={className}>
      <DashboardToolbar
        dashboard={dashboard}
        onRefresh={handleRefresh}
        onEdit={canEdit ? () => {} : undefined}
        onDelete={canDelete ? () => {} : undefined}
        onShare={canShare ? () => {} : undefined}
        realTimeConnected={isConnected}
        lastUpdate={lastUpdate}
      />

      {dashboard.filters.length > 0 && (
        <FilterPanel
          filters={dashboard.filters}
          values={filters}
          onChange={handleFilterChange}
        />
      )}

      <DashboardContent>
        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <GridContainer>
          <ResponsiveGridLayout
            {...layoutConfig}
            layouts={layout.breakpoints}
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={(breakpoint) => {
              // Handle breakpoint changes
            }}
          >
            {widgets}
          </ResponsiveGridLayout>
        </GridContainer>

        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
              }}
            >
              <LoadingSpinner size="medium" />
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardContent>
    </DashboardContainer>
  );
};

export default DashboardComponent;