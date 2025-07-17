/**
 * Apache ECharts Plugin Bundle
 * 
 * This bundle includes the Apache ECharts plugin components compiled
 * for use in OpenMCT without ES modules.
 */

// Plugin Constants
const ECHARTS_KEY = 'apache.echarts.chart';
const ECHARTS_VIEW = 'apache.echarts.view';
const ECHARTS_INSPECTOR = 'apache.echarts.inspector';

// Chart type definitions
const CHART_TYPES = {
  TIMESERIES: 'timeseries',
  GAUGE: 'gauge', 
  HEATMAP: 'heatmap',
  RADAR: 'radar',
  SCATTER: 'scatter',
  REALTIME: 'realtime'
};

// Default configuration for new ECharts objects
const DEFAULT_CONFIG = {
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

// Chart type metadata
const CHART_TYPE_INFO = {
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

// Performance settings
const PERFORMANCE_SETTINGS = {
  throttling: {
    realtime: 50, // Max updates per second for real-time
    historical: 10 // Max updates per second for historical
  }
};

// ECharts Composition Policy
function EChartsCompositionPolicy(openmct, config = {}) {
  
  function isTelemetryObject(domainObject) {
    return domainObject && 
           domainObject.telemetry && 
           domainObject.telemetry.values && 
           domainObject.telemetry.values.length > 0;
  }

  function hasNumericTelemetry(domainObject) {
    if (!isTelemetryObject(domainObject)) {
      return false;
    }

    // Check if at least one telemetry value is numeric
    return domainObject.telemetry.values.some(value => {
      const format = value.format;
      const hints = value.hints || {};
      
      // Check explicit numeric formats
      if (format === 'number' || format === 'integer' || format === 'float') {
        return true;
      }
      
      // Check range hints (indicates numeric data)
      if (hints.range || (value.min !== undefined && value.max !== undefined)) {
        return true;
      }
      
      return false;
    });
  }

  function isCompatibleWithChartType(domainObject, chartType) {
    const chartInfo = CHART_TYPE_INFO[chartType];
    if (!chartInfo) {
      return false;
    }

    // Check if we have numeric data
    if (!hasNumericTelemetry(domainObject)) {
      return false;
    }

    return true;
  }

  function validateCompositionLimits(parent, candidateObject) {
    if (parent.type !== ECHARTS_KEY) {
      return true; // Not our concern
    }

    const chartType = parent.configuration?.chartType || 'timeseries';
    const chartInfo = CHART_TYPE_INFO[chartType];
    
    if (!chartInfo) {
      return false;
    }

    // Check current composition count
    const currentCount = parent.composition ? parent.composition.length : 0;
    
    // Check maximum limits
    if (currentCount >= chartInfo.maxTelemetryPoints) {
      console.warn(`ECharts: Cannot add more telemetry objects. Maximum ${chartInfo.maxTelemetryPoints} allowed for ${chartType} charts.`);
      return false;
    }

    return true;
  }

  return {
    allow(parent, candidateObject) {
      // Only apply policy to ECharts objects
      if (parent.type !== ECHARTS_KEY) {
        return true;
      }

      console.log('ECharts composition policy evaluating:', {
        parent: parent.name,
        candidate: candidateObject.name,
        candidateType: candidateObject.type
      });

      // Must be a telemetry object
      if (!isTelemetryObject(candidateObject)) {
        console.log('ECharts: Rejecting non-telemetry object:', candidateObject.name);
        return false;
      }

      // Must have numeric data
      if (!hasNumericTelemetry(candidateObject)) {
        console.log('ECharts: Rejecting object without numeric telemetry:', candidateObject.name);
        return false;
      }

      // Check chart type compatibility
      const chartType = parent.configuration?.chartType || 'timeseries';
      if (!isCompatibleWithChartType(candidateObject, chartType)) {
        console.log(`ECharts: Object ${candidateObject.name} not compatible with ${chartType} chart`);
        return false;
      }

      // Check composition limits
      if (!validateCompositionLimits(parent, candidateObject)) {
        return false;
      }

      console.log('ECharts: Accepting telemetry object:', candidateObject.name);
      return true;
    }
  };
}

// Simple ECharts View Provider (Basic implementation for testing)
function EChartsViewProvider(openmct, config = {}) {
  
  return {
    key: ECHARTS_VIEW,
    name: 'Apache ECharts',
    cssClass: 'icon-line-chart',
    
    canView(domainObject, objectPath) {
      return domainObject && domainObject.type === ECHARTS_KEY;
    },

    canEdit(domainObject, objectPath) {
      return domainObject && domainObject.type === ECHARTS_KEY;
    },

    view(domainObject, objectPath) {
      let element = null;
      let chart = null;

      return {
        show(container, isEditing, { renderWhenVisible }) {
          console.log('ECharts view mounting for:', domainObject.name);

          element = document.createElement('div');
          element.className = 'c-echarts-chart';
          element.style.width = '100%';
          element.style.height = '100%';
          element.style.minHeight = '200px';
          element.style.position = 'relative';

          // Create placeholder content
          const placeholder = document.createElement('div');
          placeholder.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: var(--colorBodyFg);
            font-size: 1.2em;
          `;
          
          const chartType = domainObject.configuration?.chartType || 'timeseries';
          const chartInfo = CHART_TYPE_INFO[chartType] || CHART_TYPE_INFO.timeseries;
          
          placeholder.innerHTML = `
            <div>
              <div style="font-size: 2em; margin-bottom: 10px;">📊</div>
              <div><strong>${chartInfo.name}</strong></div>
              <div style="font-size: 0.9em; opacity: 0.7; margin-top: 5px;">${chartInfo.description}</div>
              <div style="font-size: 0.8em; opacity: 0.5; margin-top: 10px;">
                Add ${chartInfo.minTelemetryPoints === chartInfo.maxTelemetryPoints ? 
                  chartInfo.minTelemetryPoints : 
                  chartInfo.minTelemetryPoints + '-' + chartInfo.maxTelemetryPoints
                } telemetry object${chartInfo.maxTelemetryPoints > 1 ? 's' : ''} to display data
              </div>
            </div>
          `;
          
          element.appendChild(placeholder);
          container.appendChild(element);

          console.log('ECharts view mounted for:', domainObject.name);
        },

        destroy() {
          if (element && element.parentNode) {
            element.parentNode.removeChild(element);
          }
          if (chart) {
            chart.dispose();
          }
          console.log('ECharts view destroyed for:', domainObject.name);
        },

        onClearData() {
          console.log('Clearing data for ECharts view:', domainObject.name);
        },

        onResize() {
          if (chart) {
            chart.resize();
          }
        }
      };
    },

    priority() {
      return 1; // Higher priority to be default view
    }
  };
}

// Simple ECharts Inspector View Provider (Basic implementation for testing)
function EChartsInspectorViewProvider(openmct, config = {}) {
  
  return {
    key: ECHARTS_INSPECTOR,
    name: 'Apache ECharts Configuration',
    
    canView(selection) {
      if (selection.length !== 1) {
        return false;
      }
      
      const selectedObject = selection[0][0].context.item;
      return selectedObject && selectedObject.type === ECHARTS_KEY;
    },
    
    view(selection) {
      const selectedObject = selection[0][0].context.item;
      let element = null;

      return {
        show(container, isEditing) {
          console.log('ECharts inspector view mounting for:', selectedObject.name);

          element = document.createElement('div');
          element.className = 'c-echarts-inspector';
          element.style.padding = '10px';

          const chartType = selectedObject.configuration?.chartType || 'timeseries';
          const chartInfo = CHART_TYPE_INFO[chartType] || CHART_TYPE_INFO.timeseries;

          element.innerHTML = `
            <div style="color: var(--colorBodyFg);">
              <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid var(--colorInteriorBorder); padding-bottom: 5px;">
                Chart Configuration
              </h3>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 0.9em;">Chart Type:</label>
                <select id="chartTypeSelect" style="width: 100%; padding: 5px; background: var(--colorInputBg); color: var(--colorInputFg); border: 1px solid var(--colorInteriorBorder);" ${!isEditing ? 'disabled' : ''}>
                  ${Object.entries(CHART_TYPE_INFO).map(([type, info]) => 
                    `<option value="${type}" ${type === chartType ? 'selected' : ''}>${info.name}</option>`
                  ).join('')}
                </select>
              </div>

              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 0.9em;">Title:</label>
                <input type="text" id="titleInput" value="${selectedObject.configuration?.title || ''}" 
                       style="width: 100%; padding: 5px; background: var(--colorInputBg); color: var(--colorInputFg); border: 1px solid var(--colorInteriorBorder);"
                       ${!isEditing ? 'disabled' : ''} />
              </div>

              <div style="border-top: 1px solid var(--colorInteriorBorder); padding-top: 15px; margin-top: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 1em;">Current Chart Type: ${chartInfo.name}</h4>
                <div style="font-size: 0.9em; color: var(--colorBodyFgEm);">
                  <div style="margin-bottom: 5px;"><strong>Description:</strong> ${chartInfo.description}</div>
                  <div style="margin-bottom: 5px;"><strong>Required Objects:</strong> ${chartInfo.minTelemetryPoints}${chartInfo.minTelemetryPoints !== chartInfo.maxTelemetryPoints ? `-${chartInfo.maxTelemetryPoints}` : ''}</div>
                  <div style="margin-bottom: 5px;"><strong>Data Types:</strong> ${chartInfo.supportedDataTypes.join(', ')}</div>
                  <div><strong>Time Data Required:</strong> ${chartInfo.requiresTimeData ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          `;

          container.appendChild(element);

          // Add event listeners if editing
          if (isEditing) {
            const chartTypeSelect = element.querySelector('#chartTypeSelect');
            const titleInput = element.querySelector('#titleInput');

            chartTypeSelect.addEventListener('change', function() {
              selectedObject.configuration = selectedObject.configuration || {};
              selectedObject.configuration.chartType = this.value;
              openmct.objects.mutate(selectedObject, 'configuration', selectedObject.configuration);
              console.log('Chart type changed to:', this.value);
            });

            titleInput.addEventListener('input', function() {
              selectedObject.configuration = selectedObject.configuration || {};
              selectedObject.configuration.title = this.value;
              openmct.objects.mutate(selectedObject, 'configuration', selectedObject.configuration);
              console.log('Title changed to:', this.value);
            });
          }

          console.log('ECharts inspector view mounted for:', selectedObject.name);
        },

        destroy() {
          if (element && element.parentNode) {
            element.parentNode.removeChild(element);
          }
          console.log('ECharts inspector view destroyed for:', selectedObject.name);
        }
      };
    },
    
    priority() {
      return 1;
    }
  };
}

// Main Plugin Function
function ApacheEChartsPlugin(options = {}) {
  // Merge user options with defaults
  const config = {
    enabledChartTypes: ['timeseries', 'gauge', 'heatmap', 'radar', 'scatter', 'realtime'],
    defaultOptions: {
      animation: true,
      theme: 'openmct-dark',
      maxDataPoints: 10000
    },
    ...options
  };

  return function install(openmct) {
    console.log('Installing Apache ECharts Plugin...');

    // Register the ECharts object type
    openmct.types.addType(ECHARTS_KEY, {
      key: ECHARTS_KEY,
      name: 'Apache ECharts',
      cssClass: 'icon-line-chart',
      description: 'Advanced charting visualization using Apache ECharts library',
      creatable: true,
      
      initialize: function (domainObject) {
        // Initialize composition for telemetry objects
        domainObject.composition = [];
        
        // Set default configuration
        domainObject.configuration = {
          ...DEFAULT_CONFIG,
          ...config.defaultOptions,
          // Add unique identifier for this instance
          id: `echarts-${Date.now()}`,
          title: domainObject.name || 'ECharts Visualization',
          enabledChartTypes: config.enabledChartTypes
        };

        console.log('ECharts object initialized:', domainObject.configuration);
      },
      
      priority: 894 // Higher than D3 bar graph (892)
    });

    // Register the view provider for rendering charts
    const viewProvider = EChartsViewProvider(openmct, config);
    openmct.objectViews.addProvider(viewProvider);

    // Register the inspector view provider for configuration
    const inspectorProvider = EChartsInspectorViewProvider(openmct, config);
    openmct.inspectorViews.addProvider(inspectorProvider);

    // Register composition policy to validate telemetry objects
    const compositionPolicy = EChartsCompositionPolicy(openmct, config);
    openmct.composition.addPolicy(compositionPolicy.allow.bind(compositionPolicy));

    // Add plugin-specific CSS
    const pluginStyles = document.createElement('style');
    pluginStyles.textContent = `
      .c-echarts-chart {
        width: 100%;
        height: 100%;
        min-height: 200px;
        background: var(--colorBodyBg);
        border: 1px solid var(--colorInteriorBorder);
      }
      
      .c-echarts-inspector {
        padding: 0;
      }
      
      .c-echarts-inspector h3 {
        color: var(--colorBodyFgEm);
      }
      
      .c-echarts-inspector h4 {
        color: var(--colorBodyFg);
      }
      
      .c-echarts-inspector input,
      .c-echarts-inspector select {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(pluginStyles);

    // Log successful installation
    console.log('Apache ECharts Plugin installed successfully');
    console.log('Enabled chart types:', config.enabledChartTypes);
    console.log('Default options:', config.defaultOptions);

    // Provide plugin info for debugging
    window.EChartsPluginInfo = {
      version: '1.0.0',
      config: config,
      chartTypes: CHART_TYPES,
      chartTypeInfo: CHART_TYPE_INFO
    };
  };
}

// Export plugin for global use
window.ApacheEChartsPlugin = ApacheEChartsPlugin;