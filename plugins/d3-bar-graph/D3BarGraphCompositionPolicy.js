/**
 * D3 Bar Graph Composition Policy
 * 
 * Validates that only telemetry objects with numeric values can be added
 * to a D3 bar graph. This ensures the chart can properly render the data.
 */

import { D3_BAR_GRAPH_KEY } from './D3BarGraphConstants.js';

export default function D3BarGraphCompositionPolicy(openmct) {
  return {
    allow: function (parent, child) {
      // Only apply policy to D3 bar graph objects
      if (parent.type !== D3_BAR_GRAPH_KEY) {
        return true;
      }

      // Check if child has telemetry capability
      if (!openmct.telemetry.isTelemetryObject(child)) {
        return false;
      }

      // Check if child has numeric telemetry
      if (!openmct.telemetry.hasNumericTelemetry(child)) {
        return false;
      }

      // Get telemetry metadata to validate structure
      const metadata = openmct.telemetry.getMetadata(child);
      if (!metadata) {
        return false;
      }

      // Ensure there's at least one numeric range value
      const rangeValues = metadata.valuesForHints(['range']);
      if (rangeValues.length === 0) {
        return false;
      }

      // Check if at least one range value is numeric
      const hasNumericRange = rangeValues.some(value => 
        value.format === 'float' || 
        value.format === 'integer' || 
        value.format === 'number'
      );

      if (!hasNumericRange) {
        return false;
      }

      // Limit the number of bars to prevent performance issues
      const currentComposition = parent.composition || [];
      const MAX_BARS = 50;
      
      if (currentComposition.length >= MAX_BARS) {
        console.warn(`D3 Bar Graph: Maximum of ${MAX_BARS} telemetry objects allowed`);
        return false;
      }

      return true;
    }
  };
}