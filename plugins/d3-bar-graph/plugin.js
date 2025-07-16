/**
 * D3 Bar Graph Plugin
 * 
 * A plugin that provides D3.js-based bar chart visualization for OpenMCT
 * telemetry data. Supports multiple telemetry objects as bars with real-time
 * updates and interactive features.
 */

import { D3_BAR_GRAPH_KEY, DEFAULT_CONFIG } from './D3BarGraphConstants.js';
import D3BarGraphViewProvider from './D3BarGraphViewProvider.js';
import D3BarGraphCompositionPolicy from './D3BarGraphCompositionPolicy.js';
import D3BarGraphInspectorViewProvider from './inspector/D3BarGraphInspectorViewProvider.js';

export default function D3BarGraphPlugin() {
  return function install(openmct) {
    // Register the D3 Bar Graph object type
    openmct.types.addType(D3_BAR_GRAPH_KEY, {
      key: D3_BAR_GRAPH_KEY,
      name: 'D3 Bar Graph',
      cssClass: 'icon-bar-chart',
      description: 'Interactive D3.js bar chart visualization for telemetry data',
      creatable: true,
      initialize: function (domainObject) {
        domainObject.composition = [];
        domainObject.configuration = {
          ...DEFAULT_CONFIG,
          // Add unique identifier for this instance
          id: `d3-bar-graph-${Date.now()}`,
          title: domainObject.name || 'D3 Bar Graph'
        };
      },
      priority: 892 // Higher than default bar graph (891) to appear first
    });

    // Register the view provider for rendering the chart
    openmct.objectViews.addProvider(new D3BarGraphViewProvider(openmct));

    // Register the inspector view provider for configuration
    openmct.inspectorViews.addProvider(new D3BarGraphInspectorViewProvider(openmct));

    // Register composition policy to validate telemetry objects
    openmct.composition.addPolicy(new D3BarGraphCompositionPolicy(openmct).allow);

    // Log successful plugin installation
    console.log('D3 Bar Graph Plugin installed successfully');
  };
}