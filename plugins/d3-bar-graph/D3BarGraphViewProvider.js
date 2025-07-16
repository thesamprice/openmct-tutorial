/**
 * D3 Bar Graph View Provider
 * 
 * Provides the view implementation for D3 bar graph objects.
 * Handles mounting the Vue component and managing the view lifecycle.
 */

import { D3_BAR_GRAPH_KEY, D3_BAR_GRAPH_VIEW } from './D3BarGraphConstants.js';
import D3BarGraphView from './components/D3BarGraphView.vue';

export default function D3BarGraphViewProvider(openmct) {
  function isCompactView(objectPath) {
    // Check if this view is being displayed in a compact context
    let isChildOfTimeStrip = objectPath.find((object) => object.type === 'time-strip');
    return isChildOfTimeStrip && !openmct.router.isNavigatedObject(objectPath);
  }

  return {
    key: D3_BAR_GRAPH_VIEW,
    name: 'D3 Bar Graph',
    cssClass: 'icon-bar-chart',
    
    canView(domainObject, objectPath) {
      return domainObject && domainObject.type === D3_BAR_GRAPH_KEY;
    },

    canEdit(domainObject, objectPath) {
      return domainObject && domainObject.type === D3_BAR_GRAPH_KEY;
    },

    view(domainObject, objectPath) {
      let _destroy = null;
      let component = null;

      return {
        show(element, isEditing, { renderWhenVisible }) {
          let isCompact = isCompactView(objectPath);

          // Mount the Vue component
          const { vNode, destroy } = openmct.app.mount(
            {
              components: {
                D3BarGraphView
              },
              provide: {
                openmct,
                domainObject,
                path: objectPath,
                renderWhenVisible
              },
              data() {
                return {
                  options: {
                    compact: isCompact,
                    editing: isEditing
                  }
                };
              },
              template: '<d3-bar-graph-view ref="chartComponent" :options="options"></d3-bar-graph-view>'
            },
            {
              app: openmct.app,
              element
            }
          );

          _destroy = destroy;
          component = vNode.componentInstance;
        },

        destroy() {
          if (_destroy) {
            _destroy();
          }
        },

        onClearData() {
          if (component && component.$refs.chartComponent) {
            component.$refs.chartComponent.clearData();
          }
        },

        onResize() {
          if (component && component.$refs.chartComponent) {
            component.$refs.chartComponent.resize();
          }
        }
      };
    },

    priority() {
      return 1; // Higher priority to be default view
    }
  };
}