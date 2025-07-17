/**
 * Apache ECharts Plugin for OpenMCT
 * 
 * A comprehensive charting plugin that provides multiple chart types
 * using Apache ECharts for high-performance telemetry visualization.
 */

import { ECHARTS_KEY, DEFAULT_CONFIG, OPENMCT_SETTINGS } from './EChartsConstants.js';
import EChartsViewProvider from './EChartsViewProvider.js';
import EChartsCompositionPolicy from './EChartsCompositionPolicy.js';
import EChartsInspectorViewProvider from './inspector/EChartsInspectorViewProvider.js';

export default function ApacheEChartsPlugin(options = {}) {
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
      cssClass: OPENMCT_SETTINGS.cssClass,
      description: 'Advanced charting visualization using Apache ECharts library',
      creatable: OPENMCT_SETTINGS.creatable,
      
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
      
      priority: OPENMCT_SETTINGS.priority
    });

    // Register the view provider for rendering charts
    const viewProvider = new EChartsViewProvider(openmct, config);
    openmct.objectViews.addProvider(viewProvider);

    // Register the inspector view provider for configuration
    const inspectorProvider = new EChartsInspectorViewProvider(openmct, config);
    openmct.inspectorViews.addProvider(inspectorProvider);

    // Register composition policy to validate telemetry objects
    const compositionPolicy = new EChartsCompositionPolicy(openmct, config);
    openmct.composition.addPolicy(compositionPolicy.allow.bind(compositionPolicy));

    // Register chart type icons in OpenMCT's icon registry (if available)
    if (openmct.types && openmct.types.addIcon) {
      openmct.types.addIcon('icon-echarts-timeseries', 'M2,8 L12,2 L22,8 L22,12 L12,18 L2,12 Z');
      openmct.types.addIcon('icon-echarts-gauge', 'M12,2 A10,10 0 0,1 22,12 L20,12 A8,8 0 0,0 12,4 Z');
    }

    // Add plugin-specific CSS if needed
    const pluginStyles = document.createElement('style');
    pluginStyles.textContent = `
      .c-echarts-chart {
        width: 100%;
        height: 100%;
        min-height: 200px;
      }
      
      .c-echarts-chart .echarts-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--colorBodyFg);
        font-size: 1.2em;
      }
      
      .c-echarts-chart .echarts-error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--colorAlert);
        text-align: center;
        padding: 20px;
      }
      
      .c-echarts-inspector .form-row {
        margin-bottom: 0.5em;
      }
      
      .c-echarts-inspector select,
      .c-echarts-inspector input {
        width: 100%;
      }
    `;
    document.head.appendChild(pluginStyles);

    // Register a status listener to track plugin performance
    let chartCount = 0;
    const originalMount = openmct.app.mount;
    
    // Log successful installation
    console.log('Apache ECharts Plugin installed successfully');
    console.log('Enabled chart types:', config.enabledChartTypes);
    console.log('Default options:', config.defaultOptions);

    // Provide plugin info for debugging
    window.EChartsPluginInfo = {
      version: '1.0.0',
      chartCount: () => chartCount,
      config: config,
      echarts: null // Will be set when first chart loads
    };
  };
}

/**
 * Plugin factory with preset configurations
 */
export const EChartsPluginPresets = {
  // Basic configuration for simple deployments
  basic() {
    return ApacheEChartsPlugin({
      enabledChartTypes: ['timeseries', 'gauge'],
      defaultOptions: {
        animation: false,
        maxDataPoints: 1000
      }
    });
  },

  // Full configuration for advanced use cases
  advanced() {
    return ApacheEChartsPlugin({
      enabledChartTypes: ['timeseries', 'gauge', 'heatmap', 'radar', 'scatter', 'realtime'],
      defaultOptions: {
        animation: true,
        maxDataPoints: 50000,
        useWebGL: true
      }
    });
  },

  // Performance-optimized for large datasets
  performance() {
    return ApacheEChartsPlugin({
      enabledChartTypes: ['timeseries', 'realtime'],
      defaultOptions: {
        animation: false,
        maxDataPoints: 100000,
        useWebGL: true,
        refreshRate: 100
      }
    });
  }
};