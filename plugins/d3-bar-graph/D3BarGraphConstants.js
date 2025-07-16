/**
 * D3 Bar Graph Plugin Constants
 * 
 * Defines constants used throughout the D3 bar graph plugin
 */

export const D3_BAR_GRAPH_KEY = 'd3-bar-graph';
export const D3_BAR_GRAPH_VIEW = 'd3-bar-graph-view';
export const D3_BAR_GRAPH_INSPECTOR = 'd3-bar-graph-inspector';

export const DEFAULT_CONFIG = {
  barStyles: {
    colors: [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f'
    ],
    height: 400,
    width: 600,
    margin: { top: 20, right: 20, bottom: 40, left: 40 },
    barPadding: 0.1,
    cornerRadius: 4
  },
  axes: {
    xLabel: 'Telemetry Objects',
    yLabel: 'Value',
    showGrid: true,
    tickFormat: '.2f'
  },
  animation: {
    duration: 500,
    enabled: true,
    easing: 'easeInOutQuad'
  },
  interaction: {
    tooltips: true,
    hover: true,
    selection: false
  },
  legend: {
    show: true,
    position: 'bottom'
  }
};

export const CHART_EVENTS = {
  DATA_UPDATED: 'data-updated',
  BAR_CLICKED: 'bar-clicked',
  BAR_HOVERED: 'bar-hovered',
  RESIZE: 'resize'
};

export const TELEMETRY_KEYS = {
  TIMESTAMP: 'timestamp',
  VALUE: 'value',
  ID: 'id'
};