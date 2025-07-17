/**
 * Apache ECharts Composition Policy
 * 
 * Determines which telemetry objects can be added to ECharts visualizations.
 * Validates data types, availability, and chart type compatibility.
 */

import { ECHARTS_KEY, CHART_TYPE_INFO } from './EChartsConstants.js';

export default function EChartsCompositionPolicy(openmct, config = {}) {
  
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
      
      // Check domain hints for time data
      if (hints.domain && (hints.domain === 'time' || hints.domain === 'timestamp')) {
        return false; // Time data, but we need separate numeric values
      }
      
      return false;
    });
  }

  function hasTimeTelemetry(domainObject) {
    if (!isTelemetryObject(domainObject)) {
      return false;
    }

    // Check if there's a time-domain telemetry value
    return domainObject.telemetry.values.some(value => {
      const hints = value.hints || {};
      return hints.domain && (hints.domain === 'time' || hints.domain === 'timestamp');
    });
  }

  function getSupportedDataTypes(domainObject) {
    if (!isTelemetryObject(domainObject)) {
      return [];
    }

    return domainObject.telemetry.values.map(value => ({
      key: value.key,
      name: value.name || value.key,
      format: value.format,
      hints: value.hints || {},
      units: value.units
    }));
  }

  function isCompatibleWithChartType(domainObject, chartType) {
    const chartInfo = CHART_TYPE_INFO[chartType];
    if (!chartInfo) {
      return false;
    }

    // Check data type compatibility
    const hasCompatibleData = getSupportedDataTypes(domainObject).some(dataType => {
      return chartInfo.supportedDataTypes.includes(dataType.format);
    });

    if (!hasCompatibleData) {
      return false;
    }

    // Check if time data is required
    if (chartInfo.requiresTimeData && !hasTimeTelemetry(domainObject)) {
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
    
    // Check minimum requirements
    if (currentCount < chartInfo.minTelemetryPoints - 1) {
      // Allow adding if we haven't reached minimum
      return true;
    }

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
    },

    // Utility methods for external use
    getTelemetryInfo(domainObject) {
      return {
        isTelemetry: isTelemetryObject(domainObject),
        hasNumeric: hasNumericTelemetry(domainObject),
        hasTime: hasTimeTelemetry(domainObject),
        dataTypes: getSupportedDataTypes(domainObject)
      };
    },

    getChartCompatibility(domainObject) {
      const compatibleCharts = [];
      
      Object.keys(CHART_TYPE_INFO).forEach(chartType => {
        if (isCompatibleWithChartType(domainObject, chartType)) {
          compatibleCharts.push({
            type: chartType,
            info: CHART_TYPE_INFO[chartType]
          });
        }
      });

      return compatibleCharts;
    },

    validateChartConfiguration(chartObject) {
      const errors = [];
      const warnings = [];
      
      if (!chartObject.composition || chartObject.composition.length === 0) {
        errors.push('No telemetry objects added to chart');
        return { valid: false, errors, warnings };
      }

      const chartType = chartObject.configuration?.chartType || 'timeseries';
      const chartInfo = CHART_TYPE_INFO[chartType];
      
      if (!chartInfo) {
        errors.push(`Unknown chart type: ${chartType}`);
        return { valid: false, errors, warnings };
      }

      const telemetryCount = chartObject.composition.length;
      
      if (telemetryCount < chartInfo.minTelemetryPoints) {
        errors.push(`${chartInfo.name} requires at least ${chartInfo.minTelemetryPoints} telemetry object(s)`);
      }

      if (telemetryCount > chartInfo.maxTelemetryPoints) {
        errors.push(`${chartInfo.name} supports maximum ${chartInfo.maxTelemetryPoints} telemetry object(s)`);
      }

      if (warnings.length > 0) {
        console.warn('ECharts configuration warnings:', warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    }
  };
}