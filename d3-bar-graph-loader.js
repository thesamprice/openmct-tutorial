/**
 * D3 Bar Graph Plugin Loader
 * 
 * This script loads the D3 bar graph plugin and makes it available
 * for installation in OpenMCT.
 */

// Load D3 library
import * as d3 from './node_modules/d3/dist/d3.min.js';

// Make d3 available globally for the plugin
window.d3 = d3;

// Load plugin components
import D3BarGraphPlugin from './plugins/d3-bar-graph/plugin.js';

// Make plugin available globally
window.D3BarGraphPlugin = D3BarGraphPlugin;