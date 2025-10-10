// Dashboard Types
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: Widget[];
  filters: DashboardFilter[];
  refreshInterval: number; // milliseconds
  autoRefresh: boolean;
  permissions: DashboardPermissions;
  metadata: DashboardMetadata;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastViewed?: Date;
  viewCount: number;
}

export interface DashboardLayout {
  type: 'grid' | 'freeform' | 'responsive';
  columns: number;
  rows: number;
  cellSize: {
    width: number;
    height: number;
  };
  breakpoints: {
    [key: string]: {
      columns: number;
      cellSize: {
        width: number;
        height: number;
      };
    };
  };
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: DataSource;
  refreshInterval?: number;
  autoRefresh: boolean;
  permissions: WidgetPermissions;
  style: WidgetStyle;
  interactions: WidgetInteraction[];
}

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type WidgetType = 
  | 'chart' 
  | 'table' 
  | 'metric' 
  | 'gauge' 
  | 'progress' 
  | 'text' 
  | 'image' 
  | 'map' 
  | 'heatmap' 
  | 'treemap' 
  | 'sankey' 
  | 'funnel' 
  | 'scatter' 
  | 'bubble' 
  | 'radar' 
  | 'polar' 
  | 'candlestick' 
  | 'boxplot' 
  | 'histogram' 
  | 'pie' 
  | 'doughnut' 
  | 'bar' 
  | 'line' 
  | 'area' 
  | 'spline' 
  | 'waterfall' 
  | 'sunburst' 
  | 'sankey' 
  | 'timeline' 
  | 'calendar' 
  | 'kpi' 
  | 'alert' 
  | 'log' 
  | 'iframe' 
  | 'custom';

export interface WidgetConfig {
  chart?: ChartConfig;
  table?: TableConfig;
  metric?: MetricConfig;
  gauge?: GaugeConfig;
  progress?: ProgressConfig;
  text?: TextConfig;
  image?: ImageConfig;
  map?: MapConfig;
  heatmap?: HeatmapConfig;
  custom?: CustomConfig;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar' | 'polar' | 'area' | 'spline';
  data: ChartData;
  options: ChartOptions;
  plugins?: ChartPlugin[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  yAxisID?: string;
  xAxisID?: string;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  aspectRatio?: number;
  scales?: {
    x?: ScaleConfig;
    y?: ScaleConfig;
  };
  plugins?: {
    legend?: LegendConfig;
    title?: TitleConfig;
    tooltip?: TooltipConfig;
  };
  animation?: AnimationConfig;
  interaction?: InteractionConfig;
}

export interface ScaleConfig {
  type: 'linear' | 'logarithmic' | 'category' | 'time';
  position: 'left' | 'right' | 'top' | 'bottom';
  min?: number;
  max?: number;
  ticks?: TicksConfig;
  grid?: GridConfig;
  title?: {
    display: boolean;
    text: string;
  };
}

export interface TicksConfig {
  display: boolean;
  color?: string;
  font?: {
    size: number;
    family: string;
  };
  callback?: (value: any, index: number, values: any[]) => string;
}

export interface GridConfig {
  display: boolean;
  color?: string;
  lineWidth?: number;
  drawBorder?: boolean;
  drawOnChartArea?: boolean;
  drawTicks?: boolean;
}

export interface LegendConfig {
  display: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
  labels?: {
    usePointStyle: boolean;
    padding: number;
    font?: {
      size: number;
      family: string;
    };
  };
}

export interface TitleConfig {
  display: boolean;
  text: string;
  position: 'top' | 'bottom';
  align: 'start' | 'center' | 'end';
  font?: {
    size: number;
    family: string;
    weight: string;
  };
}

export interface TooltipConfig {
  enabled: boolean;
  mode: 'point' | 'nearest' | 'index' | 'dataset';
  intersect: boolean;
  backgroundColor?: string;
  titleColor?: string;
  bodyColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  displayColors?: boolean;
  callbacks?: {
    title?: (context: any) => string;
    label?: (context: any) => string;
    afterLabel?: (context: any) => string;
  };
}

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  delay?: number;
  loop?: boolean;
}

export interface InteractionConfig {
  intersect: boolean;
  mode: 'point' | 'nearest' | 'index' | 'dataset';
}

export interface ChartPlugin {
  id: string;
  beforeInit?: (chart: any) => void;
  afterInit?: (chart: any) => void;
  beforeUpdate?: (chart: any) => void;
  afterUpdate?: (chart: any) => void;
  beforeDraw?: (chart: any) => void;
  afterDraw?: (chart: any) => void;
  beforeDatasetsDraw?: (chart: any) => void;
  afterDatasetsDraw?: (chart: any) => void;
  beforeDatasetDraw?: (chart: any, args: any) => void;
  afterDatasetDraw?: (chart: any, args: any) => void;
  beforeEvent?: (chart: any, event: any) => void;
  afterEvent?: (chart: any, event: any) => void;
  resize?: (chart: any, size: any) => void;
  destroy?: (chart: any) => void;
}

export interface TableConfig {
  columns: TableColumn[];
  data: any[];
  pagination: {
    enabled: boolean;
    pageSize: number;
    pageSizeOptions: number[];
  };
  sorting: {
    enabled: boolean;
    multiSort: boolean;
  };
  filtering: {
    enabled: boolean;
    global: boolean;
  };
  selection: {
    enabled: boolean;
    multiple: boolean;
  };
  export: {
    enabled: boolean;
    formats: ('csv' | 'excel' | 'pdf')[];
  };
}

export interface TableColumn {
  key: string;
  title: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'object';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  formatter?: (value: any, row: any) => string;
  renderer?: (value: any, row: any) => React.ReactNode;
}

export interface MetricConfig {
  value: number;
  unit?: string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  precision?: number;
  trend?: {
    value: number;
    period: string;
    direction: 'up' | 'down' | 'neutral';
  };
  threshold?: {
    warning: number;
    critical: number;
  };
  color?: string;
  icon?: string;
}

export interface GaugeConfig {
  value: number;
  min: number;
  max: number;
  unit?: string;
  format: 'number' | 'percentage';
  precision?: number;
  segments: GaugeSegment[];
  needle?: {
    enabled: boolean;
    color: string;
    width: number;
  };
  arc?: {
    width: number;
    padding: number;
  };
}

export interface GaugeSegment {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface ProgressConfig {
  value: number;
  max: number;
  format: 'number' | 'percentage';
  precision?: number;
  color?: string;
  backgroundColor?: string;
  striped?: boolean;
  animated?: boolean;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface TextConfig {
  content: string;
  format: 'markdown' | 'html' | 'plain';
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  alignment?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface ImageConfig {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface MapConfig {
  type: 'world' | 'country' | 'state' | 'city' | 'custom';
  data: MapData[];
  center: [number, number];
  zoom: number;
  projection: 'mercator' | 'albers' | 'naturalEarth' | 'orthographic';
  style: MapStyle;
  layers: MapLayer[];
}

export interface MapData {
  id: string;
  name: string;
  coordinates: [number, number];
  value: number;
  color?: string;
  size?: number;
  label?: string;
}

export interface MapStyle {
  backgroundColor: string;
  landColor: string;
  waterColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface MapLayer {
  id: string;
  type: 'markers' | 'heatmap' | 'choropleth' | 'bubbles';
  data: MapData[];
  config: any;
}

export interface HeatmapConfig {
  data: HeatmapData[];
  xAxis: string;
  yAxis: string;
  value: string;
  colorScale: ColorScale;
  cellSize?: number;
  blur?: number;
  radius?: number;
}

export interface HeatmapData {
  x: number | string;
  y: number | string;
  value: number;
}

export interface ColorScale {
  type: 'linear' | 'logarithmic' | 'quantile' | 'ordinal';
  domain: number[];
  range: string[];
}

export interface CustomConfig {
  component: string;
  props: { [key: string]: any };
  script?: string;
  style?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'mongodb' | 'elasticsearch' | 'kafka' | 'redis' | 'api' | 'file';
  config: any;
  query?: string;
  refreshInterval?: number;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'text';
  field: string;
  options?: any[];
  defaultValue?: any;
  required: boolean;
  dependencies?: string[];
}

export interface DashboardPermissions {
  view: string[];
  edit: string[];
  delete: string[];
  share: string[];
}

export interface WidgetPermissions {
  view: string[];
  edit: string[];
  delete: string[];
}

export interface WidgetStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offset: { x: number; y: number };
  };
}

export interface WidgetInteraction {
  type: 'click' | 'hover' | 'select' | 'filter' | 'drilldown';
  action: 'navigate' | 'filter' | 'highlight' | 'custom';
  target?: string;
  parameters?: { [key: string]: any };
}

export interface DashboardMetadata {
  version: string;
  tags: string[];
  category: string;
  description?: string;
  thumbnail?: string;
  author: string;
  lastModified: Date;
  size: number;
  complexity: 'low' | 'medium' | 'high';
}

// Real-time Data Types
export interface RealTimeData {
  widgetId: string;
  data: any;
  timestamp: Date;
  metadata?: {
    source: string;
    version: string;
    quality: number;
  };
}

export interface DataStream {
  id: string;
  name: string;
  source: DataSource;
  filters: DataFilter[];
  transformations: DataTransformation[];
  subscribers: string[]; // Widget IDs
  isActive: boolean;
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
}

export interface DataTransformation {
  type: 'map' | 'filter' | 'aggregate' | 'sort' | 'limit';
  config: any;
}

// Dashboard API Types
export interface DashboardAPI {
  getDashboard(id: string): Promise<Dashboard>;
  createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard>;
  updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;
  listDashboards(filters?: DashboardFilters): Promise<Dashboard[]>;
  cloneDashboard(id: string, name: string): Promise<Dashboard>;
  exportDashboard(id: string, format: 'json' | 'pdf' | 'image'): Promise<Buffer>;
  importDashboard(data: Buffer, format: 'json'): Promise<Dashboard>;
}

export interface DashboardFilters {
  search?: string;
  tags?: string[];
  category?: string;
  author?: string;
  isPublic?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Widget API Types
export interface WidgetAPI {
  getWidget(id: string): Promise<Widget>;
  createWidget(widget: Omit<Widget, 'id'>): Promise<Widget>;
  updateWidget(id: string, updates: Partial<Widget>): Promise<Widget>;
  deleteWidget(id: string): Promise<void>;
  getWidgetData(widgetId: string, filters?: any): Promise<any>;
  refreshWidget(widgetId: string): Promise<void>;
}

// Real-time API Types
export interface RealTimeAPI {
  subscribe(widgetId: string, callback: (data: RealTimeData) => void): void;
  unsubscribe(widgetId: string): void;
  publish(widgetId: string, data: any): void;
  getActiveSubscriptions(): string[];
}