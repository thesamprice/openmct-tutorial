/**
 * Apache ECharts View Provider
 * 
 * Provides the view implementation for ECharts objects.
 * Handles mounting the Vue component and managing the view lifecycle.
 */

import { ECHARTS_KEY, ECHARTS_VIEW } from './EChartsConstants.js';
import EChartsView from './components/EChartsView.vue';

export default function EChartsViewProvider(openmct, config = {}) {
  
  function isCompactView(objectPath) {
    // Check if this view is being displayed in a compact context
    let isChildOfTimeStrip = objectPath.find((object) => object.type === 'time-strip');
    return isChildOfTimeStrip && !openmct.router.isNavigatedObject(objectPath);
  }

  function isRealtimeContext(objectPath) {
    // Check if we're in a real-time viewing context
    const timeContext = openmct.time.getTimeContext();
    return timeContext && timeContext.isRealTime && timeContext.isRealTime();
  }

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
      let _destroy = null;
      let component = null;

      return {
        show(element, isEditing, { renderWhenVisible }) {
          const isCompact = isCompactView(objectPath);
          const isRealtime = isRealtimeContext(objectPath);

          // Create view options based on context
          const viewOptions = {
            compact: isCompact,
            editing: isEditing,
            realtime: isRealtime,
            config: config
          };

          console.log('ECharts view mounting with options:', viewOptions);

          // Mount the Vue component
          const { vNode, destroy } = openmct.app.mount(
            {
              components: {
                EChartsView
              },
              provide: {
                openmct,
                domainObject,
                path: objectPath,
                renderWhenVisible
              },
              data() {
                return {
                  options: viewOptions
                };
              },
              template: '<echarts-view ref="chartComponent" :options="options"></echarts-view>'
            },
            {
              app: openmct.app,
              element
            }
          );

          _destroy = destroy;
          component = vNode.componentInstance;

          // Log successful mount
          console.log('ECharts view mounted for:', domainObject.name);
        },

        destroy() {
          if (_destroy) {
            console.log('Destroying ECharts view for:', domainObject.name);
            _destroy();
          }
        },

        onClearData() {
          if (component && component.$refs.chartComponent) {
            console.log('Clearing data for ECharts view:', domainObject.name);
            component.$refs.chartComponent.clearData();
          }
        },

        onResize() {
          if (component && component.$refs.chartComponent) {
            component.$refs.chartComponent.resize();
          }
        },

        // Additional lifecycle methods for ECharts
        onRefresh() {
          if (component && component.$refs.chartComponent) {
            component.$refs.chartComponent.refresh();
          }
        },

        onTimeContextChanged() {
          if (component && component.$refs.chartComponent) {
            const newIsRealtime = isRealtimeContext(objectPath);
            component.$refs.chartComponent.updateRealtimeMode(newIsRealtime);
          }
        },

        // Get chart instance for external control
        getChartInstance() {
          if (component && component.$refs.chartComponent) {
            return component.$refs.chartComponent.getChart();
          }
          return null;
        },

        // Export chart data
        exportData(format = 'json') {
          if (component && component.$refs.chartComponent) {
            return component.$refs.chartComponent.exportData(format);
          }
          return null;
        },

        // Get chart configuration
        getConfiguration() {
          return domainObject.configuration || {};
        },

        // Update chart configuration
        updateConfiguration(newConfig) {
          if (component && component.$refs.chartComponent) {
            domainObject.configuration = { ...domainObject.configuration, ...newConfig };
            component.$refs.chartComponent.updateConfiguration(domainObject.configuration);
            
            // Persist configuration changes
            openmct.objects.mutate(domainObject, 'configuration', domainObject.configuration);
          }
        }
      };
    },

    priority() {
      return 1; // Higher priority to be default view
    }
  };
}