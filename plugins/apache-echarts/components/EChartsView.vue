<template>
  <div class="c-echarts-chart" ref="chartContainer">
    <div v-if="loading" class="echarts-loading">
      <span>Loading chart...</span>
    </div>
    <div v-if="error" class="echarts-error">
      <div>
        <h4>Chart Error</h4>
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import { CHART_TYPES, DEFAULT_CONFIG, PERFORMANCE_SETTINGS } from '../EChartsConstants.js';

export default {
  name: 'EChartsView',
  
  inject: ['openmct', 'domainObject', 'path', 'renderWhenVisible'],
  
  props: {
    options: {
      type: Object,
      default: () => ({})
    }
  },

  data() {
    return {
      chart: null,
      loading: true,
      error: null,
      subscriptions: [],
      telemetryData: new Map(),
      lastUpdate: 0,
      isDestroyed: false
    };
  },

  computed: {
    chartType() {
      return this.domainObject.configuration?.chartType || CHART_TYPES.TIMESERIES;
    },

    chartConfig() {
      return {
        ...DEFAULT_CONFIG,
        ...this.domainObject.configuration
      };
    },

    isRealtime() {
      return this.options.realtime && this.openmct.time.getTimeContext().isRealTime();
    }
  },

  async mounted() {
    console.log('EChartsView mounted for:', this.domainObject.name);
    
    try {
      await this.initializeChart();
      await this.setupTelemetrySubscriptions();
      this.loading = false;
    } catch (err) {
      console.error('Error initializing ECharts view:', err);
      this.error = err.message;
      this.loading = false;
    }
  },

  beforeUnmount() {
    this.cleanup();
  },

  methods: {
    async initializeChart() {
      if (this.isDestroyed) return;

      // Initialize ECharts instance
      const theme = this.chartConfig.theme || 'dark';
      this.chart = echarts.init(this.$refs.chartContainer, theme, {
        renderer: this.chartConfig.useWebGL ? 'canvas' : 'svg'
      });

      // Set up chart options based on type
      const option = this.createChartOption();
      this.chart.setOption(option);

      // Set up resize observer
      this.setupResizeObserver();

      // Set up chart event handlers
      this.setupChartEvents();

      console.log('ECharts initialized:', {
        type: this.chartType,
        theme: theme,
        renderer: this.chart.getZr().painter.type
      });
    },

    createChartOption() {
      const baseOption = {
        backgroundColor: 'transparent',
        animation: this.chartConfig.animation,
        title: {
          text: this.chartConfig.title,
          left: 'center',
          textStyle: {
            color: 'var(--colorBodyFg)'
          }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'var(--colorBodyBg)',
          borderColor: 'var(--colorInteriorBorder)',
          textStyle: {
            color: 'var(--colorBodyFg)'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        }
      };

      // Add chart-type specific options
      switch (this.chartType) {
        case CHART_TYPES.TIMESERIES:
          return this.createTimeseriesOption(baseOption);
        case CHART_TYPES.GAUGE:
          return this.createGaugeOption(baseOption);
        case CHART_TYPES.HEATMAP:
          return this.createHeatmapOption(baseOption);
        case CHART_TYPES.RADAR:
          return this.createRadarOption(baseOption);
        case CHART_TYPES.SCATTER:
          return this.createScatterOption(baseOption);
        case CHART_TYPES.REALTIME:
          return this.createRealtimeOption(baseOption);
        default:
          return this.createTimeseriesOption(baseOption);
      }
    },

    createTimeseriesOption(baseOption) {
      return {
        ...baseOption,
        xAxis: {
          type: 'time',
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        series: [],
        legend: {
          show: this.chartConfig.timeseries?.showLegend !== false,
          textStyle: {
            color: 'var(--colorBodyFg)'
          }
        },
        dataZoom: this.chartConfig.timeseries?.enableZoom ? [
          {
            type: 'inside',
            xAxisIndex: 0
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            height: 20
          }
        ] : []
      };
    },

    createGaugeOption(baseOption) {
      return {
        ...baseOption,
        series: [{
          type: 'gauge',
          radius: this.chartConfig.gauge?.radius || '75%',
          min: this.chartConfig.gauge?.min || 0,
          max: this.chartConfig.gauge?.max || 100,
          detail: {
            show: this.chartConfig.gauge?.showDetail !== false,
            textStyle: {
              color: 'var(--colorBodyFg)'
            }
          },
          axisLine: {
            lineStyle: {
              color: [[1, 'var(--colorBodyFg)']]
            }
          },
          data: []
        }]
      };
    },

    createHeatmapOption(baseOption) {
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: []
        },
        yAxis: {
          type: 'category',
          data: []
        },
        visualMap: {
          show: this.chartConfig.heatmap?.showVisualMap !== false,
          min: 0,
          max: 100,
          textStyle: {
            color: 'var(--colorBodyFg)'
          }
        },
        series: [{
          type: 'heatmap',
          data: []
        }]
      };
    },

    createRadarOption(baseOption) {
      return {
        ...baseOption,
        radar: {
          indicator: [],
          shape: this.chartConfig.radar?.shape || 'polygon',
          splitNumber: this.chartConfig.radar?.splitNumber || 5,
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        series: [{
          type: 'radar',
          data: []
        }]
      };
    },

    createScatterOption(baseOption) {
      return {
        ...baseOption,
        xAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        series: []
      };
    },

    createRealtimeOption(baseOption) {
      const realtimeConfig = this.chartConfig.realtime || {};
      
      return {
        ...baseOption,
        xAxis: {
          type: 'time',
          realtime: true,
          max: 'dataMax',
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'var(--colorBodyFg)'
            }
          }
        },
        series: [],
        animation: false, // Disable animation for better performance
        dataZoom: [{
          type: 'inside',
          xAxisIndex: 0,
          start: realtimeConfig.showLatestFirst ? 80 : 0,
          end: 100
        }]
      };
    },

    async setupTelemetrySubscriptions() {
      if (!this.domainObject.composition) {
        console.log('No composition found for ECharts object');
        return;
      }

      const composition = this.openmct.composition.get(this.domainObject);
      if (!composition) {
        console.log('Could not get composition for ECharts object');
        return;
      }

      composition.on('add', this.onTelemetryObjectAdded);
      composition.on('remove', this.onTelemetryObjectRemoved);

      // Load existing composition
      const children = await composition.load();
      children.forEach(child => this.onTelemetryObjectAdded(child));
    },

    onTelemetryObjectAdded(telemetryObject) {
      console.log('Adding telemetry object to ECharts:', telemetryObject.name);

      const telemetry = this.openmct.telemetry.getMetadata(telemetryObject);
      if (!telemetry) {
        console.warn('No telemetry metadata for object:', telemetryObject.name);
        return;
      }

      // Subscribe to telemetry
      const unsubscribe = this.openmct.telemetry.subscribe(
        telemetryObject,
        (datum) => this.onTelemetryData(telemetryObject, datum)
      );

      this.subscriptions.push({
        object: telemetryObject,
        unsubscribe,
        metadata: telemetry
      });

      // Initialize data storage
      this.telemetryData.set(telemetryObject.identifier.key, []);

      // Add series to chart
      this.addSeriesToChart(telemetryObject, telemetry);

      // Request historical data if not in real-time mode
      if (!this.isRealtime) {
        this.requestHistoricalData(telemetryObject);
      }
    },

    onTelemetryObjectRemoved(telemetryObject) {
      console.log('Removing telemetry object from ECharts:', telemetryObject.name);

      // Find and remove subscription
      const subscriptionIndex = this.subscriptions.findIndex(
        sub => sub.object.identifier.key === telemetryObject.identifier.key
      );

      if (subscriptionIndex >= 0) {
        this.subscriptions[subscriptionIndex].unsubscribe();
        this.subscriptions.splice(subscriptionIndex, 1);
      }

      // Remove data
      this.telemetryData.delete(telemetryObject.identifier.key);

      // Remove series from chart
      this.removeSeriesFromChart(telemetryObject);
    },

    addSeriesToChart(telemetryObject, metadata) {
      if (!this.chart) return;

      const currentOption = this.chart.getOption();
      const series = [...(currentOption.series || [])];

      switch (this.chartType) {
        case CHART_TYPES.TIMESERIES:
        case CHART_TYPES.REALTIME:
          series.push({
            name: telemetryObject.name,
            type: 'line',
            data: [],
            smooth: this.chartConfig.timeseries?.smooth || false,
            symbol: this.chartConfig.timeseries?.symbolSize > 0 ? 'circle' : 'none',
            symbolSize: this.chartConfig.timeseries?.symbolSize || 0,
            lineStyle: {
              width: this.chartConfig.timeseries?.lineWidth || 2
            }
          });
          break;

        case CHART_TYPES.GAUGE:
          // Gauge typically shows one value
          series[0] = {
            ...series[0],
            data: [{
              name: telemetryObject.name,
              value: 0
            }]
          };
          break;

        // Add other chart types as needed
      }

      this.chart.setOption({ series });
    },

    removeSeriesFromChart(telemetryObject) {
      if (!this.chart) return;

      const currentOption = this.chart.getOption();
      const series = currentOption.series.filter(
        s => s.name !== telemetryObject.name
      );

      this.chart.setOption({ series });
    },

    onTelemetryData(telemetryObject, datum) {
      if (this.isDestroyed) return;

      // Throttle updates for performance
      const now = Date.now();
      const minInterval = this.isRealtime ? 
        PERFORMANCE_SETTINGS.throttling.realtime : 
        PERFORMANCE_SETTINGS.throttling.historical;

      if (now - this.lastUpdate < minInterval) {
        return;
      }

      this.lastUpdate = now;

      const objectKey = telemetryObject.identifier.key;
      let data = this.telemetryData.get(objectKey) || [];

      // Add new data point
      data.push(datum);

      // Limit data size for performance
      const maxPoints = this.chartConfig.maxDataPoints || DEFAULT_CONFIG.maxDataPoints;
      if (data.length > maxPoints) {
        data = data.slice(-maxPoints);
      }

      this.telemetryData.set(objectKey, data);

      // Update chart
      this.updateChartData();
    },

    updateChartData() {
      if (!this.chart || this.isDestroyed) return;

      const currentOption = this.chart.getOption();
      const updatedSeries = [...(currentOption.series || [])];

      this.subscriptions.forEach((subscription, index) => {
        const objectKey = subscription.object.identifier.key;
        const data = this.telemetryData.get(objectKey) || [];
        
        if (updatedSeries[index]) {
          updatedSeries[index] = {
            ...updatedSeries[index],
            data: this.formatDataForChart(data, subscription.metadata)
          };
        }
      });

      this.chart.setOption({ series: updatedSeries }, false, true);
    },

    formatDataForChart(rawData, metadata) {
      // Format data based on chart type
      switch (this.chartType) {
        case CHART_TYPES.TIMESERIES:
        case CHART_TYPES.REALTIME:
          return rawData.map(datum => [
            datum.timestamp || datum.time,
            this.extractNumericValue(datum, metadata)
          ]);

        case CHART_TYPES.GAUGE:
          const latest = rawData[rawData.length - 1];
          return latest ? this.extractNumericValue(latest, metadata) : 0;

        default:
          return rawData;
      }
    },

    extractNumericValue(datum, metadata) {
      // Find the first numeric value in the datum
      const numericValues = metadata.values.filter(value => 
        value.format === 'number' || value.format === 'integer' || value.format === 'float'
      );

      if (numericValues.length > 0) {
        return datum[numericValues[0].key] || 0;
      }

      return 0;
    },

    async requestHistoricalData(telemetryObject) {
      try {
        const timeContext = this.openmct.time.getTimeContext();
        const bounds = timeContext.getBounds();

        const data = await this.openmct.telemetry.request(telemetryObject, bounds);
        
        if (data && data.length > 0) {
          const objectKey = telemetryObject.identifier.key;
          this.telemetryData.set(objectKey, data);
          this.updateChartData();
        }
      } catch (error) {
        console.error('Error requesting historical data:', error);
      }
    },

    setupResizeObserver() {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          this.resize();
        });
        this.resizeObserver.observe(this.$refs.chartContainer);
      }
    },

    setupChartEvents() {
      if (!this.chart) return;

      // Handle chart interactions
      this.chart.on('click', (params) => {
        console.log('Chart clicked:', params);
      });

      this.chart.on('legendselectchanged', (params) => {
        console.log('Legend selection changed:', params);
      });
    },

    // Public methods for external control
    resize() {
      if (this.chart && !this.isDestroyed) {
        this.chart.resize();
      }
    },

    clearData() {
      this.telemetryData.clear();
      if (this.chart) {
        const option = this.createChartOption();
        this.chart.setOption(option, true);
      }
    },

    refresh() {
      if (this.chart) {
        this.updateChartData();
      }
    },

    getChart() {
      return this.chart;
    },

    updateRealtimeMode(isRealtime) {
      this.options.realtime = isRealtime;
      if (this.chart) {
        // Update chart options for real-time mode
        const option = this.createChartOption();
        this.chart.setOption(option);
      }
    },

    updateConfiguration(newConfig) {
      const option = this.createChartOption();
      if (this.chart) {
        this.chart.setOption(option, true);
      }
    },

    exportData(format = 'json') {
      const data = {};
      this.telemetryData.forEach((values, key) => {
        data[key] = values;
      });

      switch (format) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'csv':
          // Convert to CSV format
          return this.convertToCSV(data);
        default:
          return data;
      }
    },

    convertToCSV(data) {
      // Simple CSV conversion - can be enhanced
      const headers = ['timestamp', 'object', 'value'];
      const rows = [headers.join(',')];

      Object.entries(data).forEach(([objectKey, values]) => {
        values.forEach(datum => {
          rows.push([
            datum.timestamp || datum.time,
            objectKey,
            Object.values(datum).find(v => typeof v === 'number') || ''
          ].join(','));
        });
      });

      return rows.join('\n');
    },

    cleanup() {
      this.isDestroyed = true;

      // Unsubscribe from telemetry
      this.subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
      this.subscriptions = [];

      // Dispose chart
      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }

      // Clean up resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }

      console.log('EChartsView cleaned up for:', this.domainObject.name);
    }
  }
};
</script>

<style scoped>
.c-echarts-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: relative;
}

.echarts-loading,
.echarts-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--colorBodyBg);
  z-index: 10;
}

.echarts-loading {
  color: var(--colorBodyFg);
  font-size: 1.2em;
}

.echarts-error {
  color: var(--colorAlert);
  text-align: center;
  padding: 20px;
}

.echarts-error h4 {
  margin: 0 0 10px 0;
  font-size: 1.2em;
}

.echarts-error p {
  margin: 0;
  font-size: 0.9em;
}
</style>