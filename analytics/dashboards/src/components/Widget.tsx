import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Widget as WidgetType, ChartType, WidgetStyle } from '../types/dashboard';
import { ChartWidget } from './widgets/ChartWidget';
import { TableWidget } from './widgets/TableWidget';
import { MetricWidget } from './widgets/MetricWidget';
import { GaugeWidget } from './widgets/GaugeWidget';
import { ProgressWidget } from './widgets/ProgressWidget';
import { TextWidget } from './widgets/TextWidget';
import { ImageWidget } from './widgets/ImageWidget';
import { MapWidget } from './widgets/MapWidget';
import { HeatmapWidget } from './widgets/HeatmapWidget';
import { TreemapWidget } from './widgets/TreemapWidget';
import { SankeyWidget } from './widgets/SankeyWidget';
import { SunburstWidget } from './widgets/SunburstWidget';
import { CustomWidget } from './widgets/CustomWidget';
import { WidgetToolbar } from './WidgetToolbar';
import { WidgetError } from './WidgetError';
import { LoadingSpinner } from './LoadingSpinner';
import styled from 'styled-components';

interface WidgetProps {
  widget: WidgetType;
  data?: any;
  onUpdate?: (data: any) => void;
  editable?: boolean;
  realTime?: boolean;
  lastUpdate?: Date;
  className?: string;
}

const WidgetContainer = styled(motion.div)<{ style: WidgetStyle }>`
  background: ${props => props.style.backgroundColor || '#ffffff'};
  border: ${props => props.style.borderWidth || 1}px solid ${props => props.style.borderColor || '#e0e0e0'};
  border-radius: ${props => props.style.borderRadius || 8}px;
  padding: ${props => props.style.padding || 16}px;
  margin: ${props => props.style.margin || 0}px;
  font-size: ${props => props.style.fontSize || 14}px;
  font-family: ${props => props.style.fontFamily || 'inherit'};
  color: ${props => props.style.color || '#333333'};
  opacity: ${props => props.style.opacity || 1};
  box-shadow: ${props => props.style.shadow?.enabled ? 
    `${props.style.shadow.offsetX}px ${props.style.shadow.offsetY}px ${props.style.shadow.blur}px ${props.style.shadow.color}` : 
    '0 2px 4px rgba(0,0,0,0.1)'
  };
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
`;

const WidgetTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
`;

const WidgetContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const WidgetFooter = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666666;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LastUpdate = styled.span`
  font-size: 11px;
  color: #999999;
`;

const RealTimeIndicator = styled.div<{ connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.connected ? '#4caf50' : '#f44336'};
  margin-left: 8px;
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
  z-index: 10;
`;

export const WidgetComponent: React.FC<WidgetProps> = ({
  widget,
  data,
  onUpdate,
  editable = false,
  realTime = false,
  lastUpdate,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Handle widget updates
  const handleUpdate = useCallback((widgetData: any) => {
    onUpdate?.(widgetData);
  }, [onUpdate]);

  // Handle widget refresh
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Handle widget edit
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Handle widget delete
  const handleDelete = useCallback(() => {
    // Handle widget deletion
  }, []);

  // Handle widget configuration
  const handleConfig = useCallback(() => {
    // Handle widget configuration
  }, []);

  // Render widget content based on type
  const renderWidgetContent = useMemo(() => {
    if (error) {
      return <WidgetError error={error} onRetry={() => setError(null)} />;
    }

    if (isLoading) {
      return <LoadingSpinner size="small" />;
    }

    switch (widget.type) {
      case 'chart':
        return (
          <ChartWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'table':
        return (
          <TableWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'metric':
        return (
          <MetricWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'gauge':
        return (
          <GaugeWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'progress':
        return (
          <ProgressWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'text':
        return (
          <TextWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'image':
        return (
          <ImageWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'map':
        return (
          <MapWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'heatmap':
        return (
          <HeatmapWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'treemap':
        return (
          <TreemapWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'sankey':
        return (
          <SankeyWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'sunburst':
        return (
          <SunburstWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      case 'custom':
        return (
          <CustomWidget
            widget={widget}
            data={data}
            onUpdate={handleUpdate}
            editable={editable}
          />
        );
      default:
        return <div>Unknown widget type: {widget.type}</div>;
    }
  }, [widget, data, handleUpdate, editable, error, isLoading]);

  // Animation variants
  const animationVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: widget.style.animation?.duration || 0.3,
        ease: widget.style.animation?.easing || 'easeOut'
      }
    },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <WidgetContainer
      className={className}
      style={widget.style}
      variants={animationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={editable ? { scale: 1.02 } : {}}
      whileTap={editable ? { scale: 0.98 } : {}}
    >
      <WidgetHeader>
        <WidgetTitle>{widget.title}</WidgetTitle>
        {editable && (
          <WidgetToolbar
            onEdit={handleEdit}
            onDelete={handleDelete}
            onConfig={handleConfig}
            onRefresh={handleRefresh}
          />
        )}
      </WidgetHeader>

      <WidgetContent>
        {renderWidgetContent}
      </WidgetContent>

      <WidgetFooter>
        <LastUpdate>
          {lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'No data'}
        </LastUpdate>
        {realTime && (
          <RealTimeIndicator connected={true} />
        )}
      </WidgetFooter>

      {isLoading && (
        <LoadingOverlay>
          <LoadingSpinner size="small" />
        </LoadingOverlay>
      )}
    </WidgetContainer>
  );
};

export default WidgetComponent;