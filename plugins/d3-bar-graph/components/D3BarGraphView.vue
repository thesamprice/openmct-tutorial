<template>
  <div class="d3-bar-graph-container" ref="container">
    <div class="d3-bar-graph-header" v-if="showHeader">
      <h3 class="d3-bar-graph-title">{{ title }}</h3>
      <div class="d3-bar-graph-controls">
        <button 
          v-if="!options.compact" 
          class="d3-bar-graph-refresh-btn"
          @click="refreshData"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>
    
    <div class="d3-bar-graph-chart-wrapper">
      <div 
        class="d3-bar-graph-chart" 
        ref="chart"
        :class="{ 'compact': options.compact }"
      ></div>
      
      <div class="d3-bar-graph-legend" v-if="showLegend && legend.length > 0">
        <div 
          v-for="item in legend" 
          :key="item.id"
          class="legend-item"
          :class="{ 'inactive': item.inactive }"
          @click="toggleLegendItem(item)"
        >
          <span 
            class="legend-color"
            :style="{ backgroundColor: item.color }"
          ></span>
          <span class="legend-label">{{ item.label }}</span>
          <span class="legend-value">{{ item.value }}</span>
        </div>
      </div>
    </div>
    
    <div class="d3-bar-graph-status" v-if="statusMessage">
      <span class="status-message">{{ statusMessage }}</span>
    </div>
  </div>
</template>

<script>
import D3BarChart from './D3BarChart.js';
import { CHART_EVENTS, TELEMETRY_KEYS } from '../D3BarGraphConstants.js';

export default {
  name: 'D3BarGraphView',
  props: {
    options: {
      type: Object,
      default: () => ({ compact: false, editing: false })
    }
  },
  inject: ['openmct', 'domainObject', 'path', 'renderWhenVisible'],
  
  data() {
    return {
      chart: null,
      telemetryObjects: [],
      subscriptions: new Map(),
      currentData: new Map(),
      isLoading: false,
      statusMessage: '',
      legend: [],
      isDestroyed: false,
      resizeObserver: null
    };
  },
  
  computed: {
    title() {
      return this.domainObject.name || 'D3 Bar Graph';
    },
    
    showHeader() {
      return !this.options.compact;
    },
    
    showLegend() {
      return this.domainObject.configuration?.legend?.show !== false;
    },
    
    chartConfig() {
      return this.domainObject.configuration || {};
    }
  },
  
  async mounted() {
    await this.initializeChart();
    this.setupCompositionListener();
    this.setupResizeObserver();
  },
  
  beforeUnmount() {
    this.cleanup();
  },
  
  methods: {
    async initializeChart() {
      if (this.isDestroyed) return;
      
      // Wait for container to be ready
      await this.$nextTick();
      
      if (!this.$refs.chart) {
        console.error('Chart container not found');
        return;
      }
      
      try {
        // Create D3 chart instance
        this.chart = new D3BarChart(this.$refs.chart, this.chartConfig);
        
        // Set up chart event listeners
        this.chart.on(CHART_EVENTS.BAR_CLICKED, this.handleBarClick);
        this.chart.on(CHART_EVENTS.BAR_HOVERED, this.handleBarHover);
        this.chart.on(CHART_EVENTS.DATA_UPDATED, this.updateLegend);
        
        // Load initial composition
        await this.loadComposition();
        
        this.statusMessage = 'Chart initialized successfully';
        setTimeout(() => { this.statusMessage = ''; }, 3000);
        
      } catch (error) {
        console.error('Error initializing D3 chart:', error);
        this.statusMessage = 'Error initializing chart';
      }
    },
    
    setupCompositionListener() {
      if (!this.openmct.composition) return;
      
      const composition = this.openmct.composition.get(this.domainObject);
      if (composition) {
        composition.on('add', this.addTelemetryObject);
        composition.on('remove', this.removeTelemetryObject);
        composition.on('reorder', this.reorderTelemetryObjects);
      }
    },
    
    setupResizeObserver() {
      if (typeof ResizeObserver !== 'undefined' && this.$refs.container) {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.chart && !this.isDestroyed) {
            this.chart.resize();
          }
        });
        this.resizeObserver.observe(this.$refs.container);
      }
    },
    
    async loadComposition() {
      if (!this.openmct.composition) return;
      
      const composition = this.openmct.composition.get(this.domainObject);
      if (!composition) return;
      
      try {
        this.isLoading = true;
        const objects = await composition.load();
        
        // Add all telemetry objects
        for (const obj of objects) {
          await this.addTelemetryObject(obj);
        }
        
      } catch (error) {
        console.error('Error loading composition:', error);
        this.statusMessage = 'Error loading telemetry objects';
      } finally {
        this.isLoading = false;
      }
    },
    
    async addTelemetryObject(telemetryObject) {
      if (this.isDestroyed) return;
      
      if (!this.openmct.telemetry.isTelemetryObject(telemetryObject)) {
        console.warn('Object is not a telemetry object:', telemetryObject);
        return;
      }
      
      try {
        // Add to telemetry objects list
        this.telemetryObjects.push(telemetryObject);
        
        // Initialize current data
        this.currentData.set(telemetryObject.identifier.key, {
          id: telemetryObject.identifier.key,
          label: telemetryObject.name,
          value: 0,
          timestamp: Date.now(),
          object: telemetryObject
        });
        
        // Request historical data
        await this.requestHistoricalData(telemetryObject);
        
        // Set up real-time subscription
        this.subscribeToTelemetry(telemetryObject);
        
        // Update chart
        this.updateChart();
        
      } catch (error) {
        console.error('Error adding telemetry object:', error);
      }
    },
    
    removeTelemetryObject(telemetryObject) {
      if (this.isDestroyed) return;
      
      const key = telemetryObject.identifier.key;
      
      // Remove from telemetry objects
      this.telemetryObjects = this.telemetryObjects.filter(
        obj => obj.identifier.key !== key
      );
      
      // Clean up subscription
      if (this.subscriptions.has(key)) {
        this.subscriptions.get(key)();
        this.subscriptions.delete(key);
      }
      
      // Remove from current data
      this.currentData.delete(key);
      
      // Update chart
      this.updateChart();
    },
    
    reorderTelemetryObjects(reorderedObjects) {
      this.telemetryObjects = reorderedObjects;
      this.updateChart();
    },
    
    async requestHistoricalData(telemetryObject) {
      if (this.isDestroyed) return;
      
      try {
        const bounds = this.openmct.time.getBounds();
        const data = await this.openmct.telemetry.request(telemetryObject, {
          start: bounds.start,
          end: bounds.end,
          size: 1,
          strategy: 'latest'
        });
        
        if (data && data.length > 0) {
          this.processTelemetryDatum(telemetryObject, data[data.length - 1]);
        }
        
      } catch (error) {
        console.error('Error requesting historical data:', error);
      }
    },
    
    subscribeToTelemetry(telemetryObject) {
      if (this.isDestroyed) return;
      
      const key = telemetryObject.identifier.key;
      
      try {
        const unsubscribe = this.openmct.telemetry.subscribe(
          telemetryObject,
          (datum) => this.processTelemetryDatum(telemetryObject, datum)
        );
        
        this.subscriptions.set(key, unsubscribe);
        
      } catch (error) {
        console.error('Error subscribing to telemetry:', error);
      }
    },
    
    processTelemetryDatum(telemetryObject, datum) {
      if (this.isDestroyed || !datum) return;
      
      const key = telemetryObject.identifier.key;
      const metadata = this.openmct.telemetry.getMetadata(telemetryObject);
      
      // Get the primary range value
      const rangeValues = metadata.valuesForHints(['range']);
      const primaryRange = rangeValues[0];
      
      if (!primaryRange) {
        console.warn('No range value found for telemetry object:', telemetryObject);
        return;
      }
      
      // Extract value
      const value = datum[primaryRange.key];
      const timestamp = datum[TELEMETRY_KEYS.TIMESTAMP] || datum.timestamp || Date.now();
      
      // Update current data
      this.currentData.set(key, {
        id: key,
        label: telemetryObject.name,
        value: parseFloat(value) || 0,
        timestamp: timestamp,
        object: telemetryObject
      });
      
      // Update chart
      this.updateChart();
    },
    
    updateChart() {
      if (this.isDestroyed || !this.chart) return;
      
      const data = Array.from(this.currentData.values());
      this.chart.updateData(data);
    },
    
    updateLegend(data) {
      if (this.isDestroyed) return;
      
      this.legend = data.map(d => ({
        id: d.id,
        label: d.label,
        color: this.chart.colorScale(d.id),
        value: d.value.toFixed(2),
        inactive: false
      }));
    },
    
    toggleLegendItem(item) {
      item.inactive = !item.inactive;
      // TODO: Implement hiding/showing bars based on legend state
    },
    
    handleBarClick(data) {
      this.$emit('bar-clicked', data);
    },
    
    handleBarHover(data) {
      this.$emit('bar-hovered', data);
    },
    
    async refreshData() {
      if (this.isLoading || this.isDestroyed) return;
      
      this.isLoading = true;
      this.statusMessage = 'Refreshing data...';
      
      try {
        for (const telemetryObject of this.telemetryObjects) {
          await this.requestHistoricalData(telemetryObject);
        }
        
        this.statusMessage = 'Data refreshed successfully';
        setTimeout(() => { this.statusMessage = ''; }, 2000);
        
      } catch (error) {
        console.error('Error refreshing data:', error);
        this.statusMessage = 'Error refreshing data';
      } finally {
        this.isLoading = false;
      }
    },
    
    clearData() {
      if (this.chart) {
        this.chart.clearData();
      }
      this.currentData.clear();
      this.legend = [];
    },
    
    resize() {
      if (this.chart) {
        this.chart.resize();
      }
    },
    
    cleanup() {
      this.isDestroyed = true;
      
      // Clean up subscriptions
      for (const unsubscribe of this.subscriptions.values()) {
        unsubscribe();
      }
      this.subscriptions.clear();
      
      // Clean up chart
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      
      // Clean up resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
    }
  }
};
</script>

<style scoped>
.d3-bar-graph-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.d3-bar-graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #ccc;
  background: #f8f9fa;
}

.d3-bar-graph-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.d3-bar-graph-controls {
  display: flex;
  gap: 8px;
}

.d3-bar-graph-refresh-btn {
  padding: 4px 8px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.d3-bar-graph-refresh-btn:hover {
  background: #f0f0f0;
}

.d3-bar-graph-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.d3-bar-graph-chart-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.d3-bar-graph-chart {
  flex: 1;
  width: 100%;
  min-height: 300px;
}

.d3-bar-graph-chart.compact {
  min-height: 200px;
}

.d3-bar-graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid #eee;
  background: #fafafa;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.legend-item:hover {
  background: rgba(0,0,0,0.1);
}

.legend-item.inactive {
  opacity: 0.5;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  font-size: 12px;
  font-weight: 500;
}

.legend-value {
  font-size: 11px;
  color: #666;
  margin-left: 4px;
}

.d3-bar-graph-status {
  padding: 8px 12px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  font-size: 12px;
  color: #666;
}

/* D3 chart styles */
:deep(.d3-bar-chart-svg) {
  background: white;
}

:deep(.bar) {
  cursor: pointer;
  transition: opacity 0.2s;
}

:deep(.bar:hover) {
  opacity: 0.8;
}

:deep(.axis-label) {
  font-size: 12px;
  fill: #333;
}

:deep(.grid line) {
  stroke: #e0e0e0;
  stroke-width: 1px;
}

:deep(.grid path) {
  stroke: none;
}

:deep(.axis) {
  font-size: 11px;
}

:deep(.axis path),
:deep(.axis line) {
  fill: none;
  stroke: #333;
  shape-rendering: crispEdges;
}
</style>