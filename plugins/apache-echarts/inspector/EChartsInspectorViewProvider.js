/**
 * Apache ECharts Inspector View Provider
 * 
 * Provides the inspector panel for configuring ECharts objects.
 * Allows users to change chart types, styling, and data settings.
 */

import { ECHARTS_KEY, ECHARTS_INSPECTOR, CHART_TYPES, CHART_TYPE_INFO, COLOR_PALETTES } from '../EChartsConstants.js';
import EChartsInspectorView from './EChartsInspectorView.vue';

export default function EChartsInspectorViewProvider(openmct, config = {}) {
  
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
      let _destroy = null;
      let component = null;

      return {
        show(element, isEditing) {
          console.log('ECharts inspector view mounting for:', selectedObject.name);

          // Mount the Vue component
          const { vNode, destroy } = openmct.app.mount(
            {
              components: {
                EChartsInspectorView
              },
              provide: {
                openmct,
                domainObject: selectedObject,
                config
              },
              data() {
                return {
                  chartTypes: CHART_TYPES,
                  chartTypeInfo: CHART_TYPE_INFO,
                  colorPalettes: COLOR_PALETTES,
                  isEditing
                };
              },
              template: '<echarts-inspector-view ref="inspectorComponent" :chart-types="chartTypes" :chart-type-info="chartTypeInfo" :color-palettes="colorPalettes" :is-editing="isEditing"></echarts-inspector-view>'
            },
            {
              app: openmct.app,
              element
            }
          );

          _destroy = destroy;
          component = vNode.componentInstance;

          console.log('ECharts inspector view mounted for:', selectedObject.name);
        },

        destroy() {
          if (_destroy) {
            console.log('Destroying ECharts inspector view for:', selectedObject.name);
            _destroy();
          }
        },

        // Update configuration when changes are made
        onConfigurationChanged(newConfig) {
          if (component && component.$refs.inspectorComponent) {
            component.$refs.inspectorComponent.updateConfiguration(newConfig);
          }
        }
      };
    },
    
    priority() {
      return 1; // High priority for ECharts objects
    }
  };
}