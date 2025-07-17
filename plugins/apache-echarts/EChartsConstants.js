/**
 * Apache ECharts Plugin Constants
 * 
 * Configuration constants and default settings for the ECharts plugin.
 */

export const ECHARTS_KEY = 'apache.echarts.chart';
export const ECHARTS_VIEW = 'apache.echarts.view';
export const ECHARTS_INSPECTOR = 'apache.echarts.inspector';

// Chart type definitions
export const CHART_TYPES = {
  TIMESERIES: 'timeseries',
  GAUGE: 'gauge', 
  HEATMAP: 'heatmap',
  RADAR: 'radar',
  SCATTER: 'scatter',
  REALTIME: 'realtime'
};

// Default configuration for new ECharts objects
export const DEFAULT_CONFIG = {
  chartType: CHART_TYPES.TIMESERIES,
  title: 'ECharts Visualization',
  
  // Chart appearance
  theme: 'openmct-dark',
  animation: true,
  backgroundColor: 'transparent',
  
  // Data handling
  maxDataPoints: 10000,
  refreshRate: 1000, // milliseconds
  useWebGL: false, // Enable for very large datasets
  
  // Chart-specific options
  timeseries: {
    showXAxis: true,
    showYAxis: true,
    showLegend: true,
    showTooltip: true,
    enableZoom: true,
    enableBrush: false,
    connectNulls: false,
    smooth: false,
    symbolSize: 0, // 0 = no symbols on line
    lineWidth: 2
  },
  
  gauge: {
    min: 0,
    max: 100,
    showTitle: true,
    showDetail: true,
    radius: '75%',
    gaugeStyle: 'arc' // 'arc' or 'circle'
  },
  
  heatmap: {
    showVisualMap: true,
    blurSize: 0,
    minOpacity: 0.2,
    maxOpacity: 0.8
  },
  
  radar: {
    showLegend: true,
    shape: 'polygon', // 'polygon' or 'circle'
    splitNumber: 5
  },
  
  scatter: {
    showXAxis: true,
    showYAxis: true,
    symbolSize: 8,
    enableBrush: true
  },
  
  realtime: {
    bufferSize: 1000,
    scrollSpeed: 'auto', // 'auto', 'slow', 'medium', 'fast'
    showLatestFirst: true
  }
};

// Color palettes for telemetry data
export const COLOR_PALETTES = {
  default: [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', 
    '#73c0de', '#3ba272', '#fc8452', '#9a60b4', 
    '#ea7ccc', '#8dd1e1', '#d4a76a', '#95f0a2'
  ],
  
  thermal: [
    '#0000ff', '#00ffff', '#00ff00', '#ffff00', 
    '#ff8000', '#ff0000', '#8b0000'
  ],
  
  status: [
    '#00ff00', // Normal - Green
    '#ffff00', // Warning - Yellow  
    '#ff8000', // Caution - Orange
    '#ff0000', // Critical - Red
    '#808080'  // Unknown - Gray
  ],
  
  grayscale: [
    '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff'
  ]
};

// Chart type metadata
export const CHART_TYPE_INFO = {
  [CHART_TYPES.TIMESERIES]: {
    name: 'Time Series',
    description: 'Line chart showing telemetry data over time',
    icon: 'icon-line-chart',
    supportedDataTypes: ['number', 'integer'],
    minTelemetryPoints: 1,
    maxTelemetryPoints: 20,
    requiresTimeData: true
  },
  
  [CHART_TYPES.GAUGE]: {
    name: 'Gauge',
    description: 'Circular gauge for single value display',
    icon: 'icon-gauge',
    supportedDataTypes: ['number', 'integer'],
    minTelemetryPoints: 1,
    maxTelemetryPoints: 1,
    requiresTimeData: false
  },
  
  [CHART_TYPES.HEATMAP]: {
    name: 'Heatmap',
    description: 'Heat map visualization for matrix data',
    icon: 'icon-image',
    supportedDataTypes: ['number', 'integer'],
    minTelemetryPoints: 4,
    maxTelemetryPoints: 100,
    requiresTimeData: false
  },
  
  [CHART_TYPES.RADAR]: {
    name: 'Radar Chart',
    description: 'Multi-dimensional data visualization',
    icon: 'icon-plot-resource',
    supportedDataTypes: ['number', 'integer'],
    minTelemetryPoints: 3,
    maxTelemetryPoints: 10,
    requiresTimeData: false
  },
  
  [CHART_TYPES.SCATTER]: {
    name: 'Scatter Plot',
    description: 'X-Y scatter plot for correlation analysis',
    icon: 'icon-plot-scatter',
    supportedDataTypes: ['number', 'integer'],
    minTelemetryPoints: 2,
    maxTelemetryPoints: 2,
    requiresTimeData: false
  },
  
  [CHART_TYPES.REALTIME]: {
    name: 'Real-time Stream',
    description: 'Optimized for high-frequency streaming data',
    icon: 'icon-activity',
    supportedDataTypes: ['number', 'integer'],
    minTelemetryPoints: 1,
    maxTelemetryPoints: 10,
    requiresTimeData: true
  }
};

// OpenMCT integration settings
export const OPENMCT_SETTINGS = {
  priority: 893, // Higher than D3 bar graph (892)
  cssClass: 'icon-line-chart',
  creatable: true
};

// Performance settings
export const PERFORMANCE_SETTINGS = {
  // Data decimation thresholds
  decimation: {
    threshold: 5000, // Start decimating above this many points
    algorithm: 'lttb', // Largest-Triangle-Three-Buckets
    samples: 1000 // Target number of points after decimation
  },
  
  // Update throttling
  throttling: {
    realtime: 50, // Max updates per second for real-time
    historical: 10 // Max updates per second for historical
  },
  
  // Memory management
  memory: {
    maxHistorySize: 50000, // Max data points to keep in memory
    cleanupInterval: 30000 // Cleanup old data every 30 seconds
  }
};