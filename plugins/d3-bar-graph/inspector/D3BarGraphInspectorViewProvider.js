/**
 * D3 Bar Graph Inspector View Provider
 * 
 * Provides configuration interface for D3 bar graph objects.
 * Allows users to customize chart appearance and behavior.
 */

import { D3_BAR_GRAPH_KEY, D3_BAR_GRAPH_INSPECTOR } from '../D3BarGraphConstants.js';

export default function D3BarGraphInspectorViewProvider(openmct) {
  return {
    key: D3_BAR_GRAPH_INSPECTOR,
    name: 'D3 Bar Graph Configuration',
    
    canView(selection) {
      if (selection.length !== 1) {
        return false;
      }
      
      const object = selection[0].context.item;
      return object && object.type === D3_BAR_GRAPH_KEY;
    },
    
    view(selection) {
      const domainObject = selection[0].context.item;
      let element;
      
      return {
        show(container) {
          element = document.createElement('div');
          element.className = 'd3-bar-graph-inspector';
          
          // Create configuration form
          element.innerHTML = `
            <div class="inspector-section">
              <h3>Chart Settings</h3>
              
              <div class="form-row">
                <label for="chart-height">Height (px):</label>
                <input type="number" id="chart-height" min="200" max="1000" step="50" />
              </div>
              
              <div class="form-row">
                <label for="bar-padding">Bar Padding:</label>
                <input type="range" id="bar-padding" min="0" max="0.5" step="0.05" />
                <span id="bar-padding-value">0.1</span>
              </div>
              
              <div class="form-row">
                <label for="corner-radius">Corner Radius:</label>
                <input type="number" id="corner-radius" min="0" max="20" step="1" />
              </div>
              
              <div class="form-row">
                <label for="animation-enabled">Enable Animations:</label>
                <input type="checkbox" id="animation-enabled" />
              </div>
              
              <div class="form-row">
                <label for="animation-duration">Animation Duration (ms):</label>
                <input type="number" id="animation-duration" min="0" max="2000" step="100" />
              </div>
            </div>
            
            <div class="inspector-section">
              <h3>Axes</h3>
              
              <div class="form-row">
                <label for="x-label">X-Axis Label:</label>
                <input type="text" id="x-label" placeholder="X-Axis Label" />
              </div>
              
              <div class="form-row">
                <label for="y-label">Y-Axis Label:</label>
                <input type="text" id="y-label" placeholder="Y-Axis Label" />
              </div>
              
              <div class="form-row">
                <label for="show-grid">Show Grid:</label>
                <input type="checkbox" id="show-grid" />
              </div>
              
              <div class="form-row">
                <label for="tick-format">Tick Format:</label>
                <select id="tick-format">
                  <option value=".2f">2 Decimal Places</option>
                  <option value=".1f">1 Decimal Place</option>
                  <option value=".0f">No Decimal Places</option>
                  <option value=".2e">Scientific Notation</option>
                </select>
              </div>
            </div>
            
            <div class="inspector-section">
              <h3>Interaction</h3>
              
              <div class="form-row">
                <label for="tooltips-enabled">Enable Tooltips:</label>
                <input type="checkbox" id="tooltips-enabled" />
              </div>
              
              <div class="form-row">
                <label for="hover-enabled">Enable Hover Effects:</label>
                <input type="checkbox" id="hover-enabled" />
              </div>
            </div>
            
            <div class="inspector-section">
              <h3>Legend</h3>
              
              <div class="form-row">
                <label for="legend-show">Show Legend:</label>
                <input type="checkbox" id="legend-show" />
              </div>
              
              <div class="form-row">
                <label for="legend-position">Legend Position:</label>
                <select id="legend-position">
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
          `;
          
          container.appendChild(element);
          
          // Load current configuration
          this.loadConfiguration();
          
          // Set up event listeners
          this.setupEventListeners();
        },
        
        destroy() {
          if (element) {
            element.remove();
          }
        },
        
        loadConfiguration() {
          const config = domainObject.configuration || {};
          
          // Chart settings
          this.setValue('chart-height', config.barStyles?.height || 400);
          this.setValue('bar-padding', config.barStyles?.barPadding || 0.1);
          this.setValue('corner-radius', config.barStyles?.cornerRadius || 4);
          this.setValue('animation-enabled', config.animation?.enabled !== false);
          this.setValue('animation-duration', config.animation?.duration || 500);
          
          // Axes
          this.setValue('x-label', config.axes?.xLabel || 'Telemetry Objects');
          this.setValue('y-label', config.axes?.yLabel || 'Value');
          this.setValue('show-grid', config.axes?.showGrid !== false);
          this.setValue('tick-format', config.axes?.tickFormat || '.2f');
          
          // Interaction
          this.setValue('tooltips-enabled', config.interaction?.tooltips !== false);
          this.setValue('hover-enabled', config.interaction?.hover !== false);
          
          // Legend
          this.setValue('legend-show', config.legend?.show !== false);
          this.setValue('legend-position', config.legend?.position || 'bottom');
          
          // Update padding display
          const paddingValue = element.querySelector('#bar-padding-value');
          if (paddingValue) {
            paddingValue.textContent = (config.barStyles?.barPadding || 0.1).toFixed(2);
          }
        },
        
        setupEventListeners() {
          // Chart settings
          this.addListener('chart-height', 'input', (value) => {
            this.updateConfiguration('barStyles.height', parseInt(value));
          });
          
          this.addListener('bar-padding', 'input', (value) => {
            const numValue = parseFloat(value);
            this.updateConfiguration('barStyles.barPadding', numValue);
            element.querySelector('#bar-padding-value').textContent = numValue.toFixed(2);
          });
          
          this.addListener('corner-radius', 'input', (value) => {
            this.updateConfiguration('barStyles.cornerRadius', parseInt(value));
          });
          
          this.addListener('animation-enabled', 'change', (value) => {
            this.updateConfiguration('animation.enabled', value);
          });
          
          this.addListener('animation-duration', 'input', (value) => {
            this.updateConfiguration('animation.duration', parseInt(value));
          });
          
          // Axes
          this.addListener('x-label', 'input', (value) => {
            this.updateConfiguration('axes.xLabel', value);
          });
          
          this.addListener('y-label', 'input', (value) => {
            this.updateConfiguration('axes.yLabel', value);
          });
          
          this.addListener('show-grid', 'change', (value) => {
            this.updateConfiguration('axes.showGrid', value);
          });
          
          this.addListener('tick-format', 'change', (value) => {
            this.updateConfiguration('axes.tickFormat', value);
          });
          
          // Interaction
          this.addListener('tooltips-enabled', 'change', (value) => {
            this.updateConfiguration('interaction.tooltips', value);
          });
          
          this.addListener('hover-enabled', 'change', (value) => {
            this.updateConfiguration('interaction.hover', value);
          });
          
          // Legend
          this.addListener('legend-show', 'change', (value) => {
            this.updateConfiguration('legend.show', value);
          });
          
          this.addListener('legend-position', 'change', (value) => {
            this.updateConfiguration('legend.position', value);
          });
        },
        
        setValue(id, value) {
          const input = element.querySelector(`#${id}`);
          if (input) {
            if (input.type === 'checkbox') {
              input.checked = value;
            } else {
              input.value = value;
            }
          }
        },
        
        addListener(id, event, handler) {
          const input = element.querySelector(`#${id}`);
          if (input) {
            input.addEventListener(event, (e) => {
              const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
              handler(value);
            });
          }
        },
        
        updateConfiguration(path, value) {
          const pathParts = path.split('.');
          let config = domainObject.configuration || {};
          
          // Ensure the path exists
          let current = config;
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
          
          // Set the value
          current[pathParts[pathParts.length - 1]] = value;
          
          // Save the configuration
          openmct.objects.mutate(domainObject, 'configuration', config);
        }
      };
    }
  };
}