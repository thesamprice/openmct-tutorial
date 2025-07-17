<template>
  <div class="c-echarts-inspector">
    <div class="c-inspector__properties">
      
      <!-- Chart Type Selection -->
      <div class="c-inspector__section">
        <h3>Chart Type</h3>
        <div class="form-row">
          <select v-model="selectedChartType" @change="onChartTypeChanged" :disabled="!isEditing">
            <option v-for="(info, type) in availableChartTypes" :key="type" :value="type">
              {{ info.name }}
            </option>
          </select>
          <div class="chart-type-description">
            {{ currentChartTypeInfo.description }}
          </div>
        </div>
      </div>

      <!-- Chart Title -->
      <div class="c-inspector__section">
        <h3>Chart Settings</h3>
        <div class="form-row">
          <label>Title:</label>
          <input v-model="configuration.title" @input="onConfigurationChanged" :disabled="!isEditing" type="text" />
        </div>
        
        <div class="form-row">
          <label>Theme:</label>
          <select v-model="configuration.theme" @change="onConfigurationChanged" :disabled="!isEditing">
            <option value="openmct-dark">OpenMCT Dark</option>
            <option value="openmct-light">OpenMCT Light</option>
            <option value="dark">ECharts Dark</option>
            <option value="light">ECharts Light</option>
          </select>
        </div>

        <div class="form-row">
          <label>
            <input v-model="configuration.animation" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
            Enable Animation
          </label>
        </div>
      </div>

      <!-- Performance Settings -->
      <div class="c-inspector__section">
        <h3>Performance</h3>
        <div class="form-row">
          <label>Max Data Points:</label>
          <input v-model.number="configuration.maxDataPoints" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="100" max="100000" />
        </div>
        
        <div class="form-row">
          <label>Refresh Rate (ms):</label>
          <input v-model.number="configuration.refreshRate" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="50" max="10000" />
        </div>

        <div class="form-row">
          <label>
            <input v-model="configuration.useWebGL" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
            Use WebGL (for large datasets)
          </label>
        </div>
      </div>

      <!-- Chart-Specific Settings -->
      <div class="c-inspector__section" v-if="showChartSpecificSettings">
        <h3>{{ currentChartTypeInfo.name }} Settings</h3>
        
        <!-- Timeseries Settings -->
        <div v-if="selectedChartType === 'timeseries' || selectedChartType === 'realtime'">
          <div class="form-row">
            <label>
              <input v-model="configuration.timeseries.showLegend" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Show Legend
            </label>
          </div>
          
          <div class="form-row">
            <label>
              <input v-model="configuration.timeseries.enableZoom" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Enable Zoom
            </label>
          </div>
          
          <div class="form-row">
            <label>
              <input v-model="configuration.timeseries.smooth" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Smooth Lines
            </label>
          </div>
          
          <div class="form-row">
            <label>Line Width:</label>
            <input v-model.number="configuration.timeseries.lineWidth" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="1" max="10" />
          </div>
          
          <div class="form-row">
            <label>Symbol Size:</label>
            <input v-model.number="configuration.timeseries.symbolSize" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="0" max="20" />
          </div>
        </div>

        <!-- Gauge Settings -->
        <div v-if="selectedChartType === 'gauge'">
          <div class="form-row">
            <label>Minimum Value:</label>
            <input v-model.number="configuration.gauge.min" @input="onConfigurationChanged" :disabled="!isEditing" type="number" />
          </div>
          
          <div class="form-row">
            <label>Maximum Value:</label>
            <input v-model.number="configuration.gauge.max" @input="onConfigurationChanged" :disabled="!isEditing" type="number" />
          </div>
          
          <div class="form-row">
            <label>Radius:</label>
            <input v-model="configuration.gauge.radius" @input="onConfigurationChanged" :disabled="!isEditing" type="text" placeholder="75%" />
          </div>
          
          <div class="form-row">
            <label>
              <input v-model="configuration.gauge.showDetail" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Show Value Detail
            </label>
          </div>
        </div>

        <!-- Heatmap Settings -->
        <div v-if="selectedChartType === 'heatmap'">
          <div class="form-row">
            <label>
              <input v-model="configuration.heatmap.showVisualMap" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Show Color Scale
            </label>
          </div>
        </div>

        <!-- Radar Settings -->
        <div v-if="selectedChartType === 'radar'">
          <div class="form-row">
            <label>Shape:</label>
            <select v-model="configuration.radar.shape" @change="onConfigurationChanged" :disabled="!isEditing">
              <option value="polygon">Polygon</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          
          <div class="form-row">
            <label>Split Number:</label>
            <input v-model.number="configuration.radar.splitNumber" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="3" max="10" />
          </div>
        </div>

        <!-- Scatter Settings -->
        <div v-if="selectedChartType === 'scatter'">
          <div class="form-row">
            <label>Symbol Size:</label>
            <input v-model.number="configuration.scatter.symbolSize" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="1" max="50" />
          </div>
          
          <div class="form-row">
            <label>
              <input v-model="configuration.scatter.enableBrush" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Enable Brush Selection
            </label>
          </div>
        </div>

        <!-- Realtime Settings -->
        <div v-if="selectedChartType === 'realtime'">
          <div class="form-row">
            <label>Buffer Size:</label>
            <input v-model.number="configuration.realtime.bufferSize" @input="onConfigurationChanged" :disabled="!isEditing" type="number" min="100" max="10000" />
          </div>
          
          <div class="form-row">
            <label>
              <input v-model="configuration.realtime.showLatestFirst" @change="onConfigurationChanged" :disabled="!isEditing" type="checkbox" />
              Show Latest Data First
            </label>
          </div>
        </div>
      </div>

      <!-- Color Palette Selection -->
      <div class="c-inspector__section">
        <h3>Color Palette</h3>
        <div class="form-row">
          <select v-model="selectedColorPalette" @change="onColorPaletteChanged" :disabled="!isEditing">
            <option v-for="(colors, name) in colorPalettes" :key="name" :value="name">
              {{ formatPaletteName(name) }}
            </option>
          </select>
          
          <div class="color-preview">
            <span v-for="(color, index) in currentColorPalette" :key="index" 
                  class="color-swatch" 
                  :style="{ backgroundColor: color }"
                  :title="color">
            </span>
          </div>
        </div>
      </div>

      <!-- Data Information -->
      <div class="c-inspector__section">
        <h3>Data Requirements</h3>
        <div class="data-info">
          <div class="info-row">
            <strong>Required Objects:</strong> 
            {{ currentChartTypeInfo.minTelemetryPoints }}
            <span v-if="currentChartTypeInfo.minTelemetryPoints !== currentChartTypeInfo.maxTelemetryPoints">
              - {{ currentChartTypeInfo.maxTelemetryPoints }}
            </span>
          </div>
          
          <div class="info-row">
            <strong>Data Types:</strong> 
            {{ currentChartTypeInfo.supportedDataTypes.join(', ') }}
          </div>
          
          <div class="info-row">
            <strong>Time Data Required:</strong> 
            {{ currentChartTypeInfo.requiresTimeData ? 'Yes' : 'No' }}
          </div>
          
          <div class="info-row" v-if="currentCompositionCount !== undefined">
            <strong>Current Objects:</strong> 
            {{ currentCompositionCount }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { CHART_TYPES, DEFAULT_CONFIG } from '../EChartsConstants.js';

export default {
  name: 'EChartsInspectorView',
  
  inject: ['openmct', 'domainObject', 'config'],
  
  props: {
    chartTypes: {
      type: Object,
      required: true
    },
    chartTypeInfo: {
      type: Object,
      required: true
    },
    colorPalettes: {
      type: Object,
      required: true
    },
    isEditing: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      configuration: {},
      selectedChartType: CHART_TYPES.TIMESERIES,
      selectedColorPalette: 'default',
      currentCompositionCount: 0
    };
  },

  computed: {
    availableChartTypes() {
      const enabledTypes = this.config.enabledChartTypes || Object.values(CHART_TYPES);
      const available = {};
      
      enabledTypes.forEach(type => {
        if (this.chartTypeInfo[type]) {
          available[type] = this.chartTypeInfo[type];
        }
      });
      
      return available;
    },

    currentChartTypeInfo() {
      return this.chartTypeInfo[this.selectedChartType] || this.chartTypeInfo[CHART_TYPES.TIMESERIES];
    },

    currentColorPalette() {
      return this.colorPalettes[this.selectedColorPalette] || this.colorPalettes.default;
    },

    showChartSpecificSettings() {
      return this.selectedChartType && this.chartTypeInfo[this.selectedChartType];
    }
  },

  mounted() {
    console.log('EChartsInspectorView mounted for:', this.domainObject.name);
    
    // Initialize configuration from domain object
    this.configuration = {
      ...DEFAULT_CONFIG,
      ...this.domainObject.configuration
    };
    
    this.selectedChartType = this.configuration.chartType || CHART_TYPES.TIMESERIES;
    this.selectedColorPalette = this.configuration.colorPalette || 'default';
    
    // Watch for composition changes
    this.updateCompositionCount();
    if (this.domainObject.composition) {
      // TODO: Set up composition listener when available
      this.currentCompositionCount = this.domainObject.composition.length;
    }
  },

  methods: {
    onChartTypeChanged() {
      console.log('Chart type changed to:', this.selectedChartType);
      
      this.configuration.chartType = this.selectedChartType;
      this.onConfigurationChanged();
    },

    onColorPaletteChanged() {
      console.log('Color palette changed to:', this.selectedColorPalette);
      
      this.configuration.colorPalette = this.selectedColorPalette;
      this.configuration.colors = this.currentColorPalette;
      this.onConfigurationChanged();
    },

    onConfigurationChanged() {
      if (!this.isEditing) {
        return;
      }

      console.log('Configuration changed:', this.configuration);
      
      // Update the domain object
      this.domainObject.configuration = { ...this.configuration };
      
      // Persist the changes
      this.openmct.objects.mutate(this.domainObject, 'configuration', this.domainObject.configuration);
      
      // Emit configuration change event for the view provider
      this.$emit('configuration-changed', this.domainObject.configuration);
    },

    updateConfiguration(newConfig) {
      this.configuration = { ...this.configuration, ...newConfig };
      this.selectedChartType = this.configuration.chartType || CHART_TYPES.TIMESERIES;
      this.selectedColorPalette = this.configuration.colorPalette || 'default';
    },

    updateCompositionCount() {
      if (this.domainObject.composition) {
        this.currentCompositionCount = this.domainObject.composition.length;
      }
    },

    formatPaletteName(name) {
      return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
    },

    // Validation helpers
    validateConfiguration() {
      const errors = [];
      
      if (!this.selectedChartType) {
        errors.push('Chart type is required');
      }
      
      if (this.configuration.maxDataPoints < 100) {
        errors.push('Max data points must be at least 100');
      }
      
      if (this.configuration.refreshRate < 50) {
        errors.push('Refresh rate must be at least 50ms');
      }
      
      return errors;
    },

    resetToDefaults() {
      this.configuration = { ...DEFAULT_CONFIG };
      this.selectedChartType = CHART_TYPES.TIMESERIES;
      this.selectedColorPalette = 'default';
      this.onConfigurationChanged();
    }
  }
};
</script>

<style scoped>
.c-echarts-inspector {
  padding: 0;
}

.c-inspector__section {
  margin-bottom: 1.5em;
  border-bottom: 1px solid var(--colorInteriorBorder);
  padding-bottom: 1em;
}

.c-inspector__section:last-child {
  border-bottom: none;
}

.c-inspector__section h3 {
  margin: 0 0 0.5em 0;
  font-size: 1.1em;
  color: var(--colorBodyFg);
  border-bottom: 1px solid var(--colorInteriorBorder);
  padding-bottom: 0.25em;
}

.form-row {
  margin-bottom: 0.75em;
  display: flex;
  flex-direction: column;
}

.form-row label {
  font-size: 0.9em;
  color: var(--colorBodyFg);
  margin-bottom: 0.25em;
}

.form-row input,
.form-row select {
  padding: 0.25em;
  border: 1px solid var(--colorInteriorBorder);
  background: var(--colorInputBg);
  color: var(--colorInputFg);
  border-radius: 2px;
}

.form-row input:disabled,
.form-row select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-row input[type="checkbox"] {
  width: auto;
  margin-right: 0.5em;
}

.chart-type-description {
  font-size: 0.8em;
  color: var(--colorBodyFgEm);
  margin-top: 0.25em;
  font-style: italic;
}

.color-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 0.5em;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  border: 1px solid var(--colorInteriorBorder);
  cursor: pointer;
}

.data-info {
  font-size: 0.9em;
}

.info-row {
  margin-bottom: 0.5em;
  display: flex;
  flex-direction: column;
}

.info-row strong {
  color: var(--colorBodyFgEm);
  margin-bottom: 0.25em;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .form-row {
    margin-bottom: 1em;
  }
  
  .color-preview {
    justify-content: center;
  }
}
</style>