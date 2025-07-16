/**
 * D3 Bar Chart Implementation
 * 
 * Core D3.js implementation for rendering interactive bar charts.
 * Handles data updates, animations, and user interactions.
 */

import * as d3 from 'd3';
import { DEFAULT_CONFIG, CHART_EVENTS, TELEMETRY_KEYS } from '../D3BarGraphConstants.js';

export default class D3BarChart {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.data = [];
    this.svg = null;
    this.g = null;
    this.xScale = null;
    this.yScale = null;
    this.colorScale = null;
    this.tooltip = null;
    this.eventListeners = {};
    this.isDestroyed = false;
    
    this.initialize();
  }

  initialize() {
    if (this.isDestroyed) return;

    // Clear any existing content
    this.element.innerHTML = '';

    // Get container dimensions
    const rect = this.element.getBoundingClientRect();
    const width = rect.width || this.options.barStyles.width;
    const height = rect.height || this.options.barStyles.height;

    // Set up margins
    const margin = this.options.barStyles.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    this.svg = d3.select(this.element)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'd3-bar-chart-svg');

    // Create main group with margins
    this.g = this.svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    this.xScale = d3.scaleBand()
      .range([0, innerWidth])
      .padding(this.options.barStyles.barPadding);

    this.yScale = d3.scaleLinear()
      .range([innerHeight, 0]);

    this.colorScale = d3.scaleOrdinal()
      .range(this.options.barStyles.colors);

    // Create axes groups
    this.g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`);

    this.g.append('g')
      .attr('class', 'y-axis');

    // Add grid if enabled
    if (this.options.axes.showGrid) {
      this.g.append('g')
        .attr('class', 'grid x-grid')
        .attr('transform', `translate(0,${innerHeight})`);

      this.g.append('g')
        .attr('class', 'grid y-grid');
    }

    // Add axis labels
    this.g.append('text')
      .attr('class', 'axis-label x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 5)
      .text(this.options.axes.xLabel);

    this.g.append('text')
      .attr('class', 'axis-label y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -margin.left + 15)
      .text(this.options.axes.yLabel);

    // Create tooltip
    this.tooltip = d3.select('body').append('div')
      .attr('class', 'd3-bar-chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '9999');

    // Set up resize observer
    this.setupResizeObserver();

    // Initial render
    this.render();
  }

  setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.isDestroyed) {
          this.resize();
        }
      });
      this.resizeObserver.observe(this.element);
    }
  }

  updateData(newData) {
    if (this.isDestroyed) return;

    this.data = newData || [];
    this.render();
    this.emit(CHART_EVENTS.DATA_UPDATED, this.data);
  }

  render() {
    if (this.isDestroyed || !this.svg) return;

    // Update scales
    this.xScale.domain(this.data.map(d => d.label || d.id));
    
    const yExtent = d3.extent(this.data, d => d.value);
    this.yScale.domain([0, yExtent[1] || 1]);

    this.colorScale.domain(this.data.map(d => d.id));

    // Update axes
    const xAxis = d3.axisBottom(this.xScale);
    const yAxis = d3.axisLeft(this.yScale)
      .tickFormat(d3.format(this.options.axes.tickFormat));

    this.g.select('.x-axis')
      .transition()
      .duration(this.options.animation.enabled ? this.options.animation.duration : 0)
      .call(xAxis);

    this.g.select('.y-axis')
      .transition()
      .duration(this.options.animation.enabled ? this.options.animation.duration : 0)
      .call(yAxis);

    // Update grid
    if (this.options.axes.showGrid) {
      this.g.select('.x-grid')
        .transition()
        .duration(this.options.animation.enabled ? this.options.animation.duration : 0)
        .call(d3.axisBottom(this.xScale)
          .tickSize(-this.yScale.range()[0])
          .tickFormat('')
        );

      this.g.select('.y-grid')
        .transition()
        .duration(this.options.animation.enabled ? this.options.animation.duration : 0)
        .call(d3.axisLeft(this.yScale)
          .tickSize(-this.xScale.range()[1])
          .tickFormat('')
        );
    }

    // Update bars
    this.renderBars();
  }

  renderBars() {
    const bars = this.g.selectAll('.bar')
      .data(this.data, d => d.id);

    // Remove old bars
    bars.exit()
      .transition()
      .duration(this.options.animation.enabled ? this.options.animation.duration : 0)
      .attr('height', 0)
      .attr('y', this.yScale(0))
      .remove();

    // Add new bars
    const newBars = bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => this.xScale(d.label || d.id))
      .attr('y', this.yScale(0))
      .attr('width', this.xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => this.colorScale(d.id))
      .attr('rx', this.options.barStyles.cornerRadius)
      .attr('ry', this.options.barStyles.cornerRadius);

    // Update all bars
    bars.merge(newBars)
      .on('mouseover', (event, d) => this.handleMouseOver(event, d))
      .on('mouseout', (event, d) => this.handleMouseOut(event, d))
      .on('click', (event, d) => this.handleClick(event, d))
      .transition()
      .duration(this.options.animation.enabled ? this.options.animation.duration : 0)
      .attr('x', d => this.xScale(d.label || d.id))
      .attr('y', d => this.yScale(d.value))
      .attr('width', this.xScale.bandwidth())
      .attr('height', d => this.yScale(0) - this.yScale(d.value))
      .attr('fill', d => this.colorScale(d.id));
  }

  handleMouseOver(event, d) {
    if (!this.options.interaction.tooltips) return;

    const [x, y] = d3.pointer(event, document.body);
    
    this.tooltip
      .style('opacity', 1)
      .html(`
        <strong>${d.label || d.id}</strong><br/>
        Value: ${d.value.toFixed(2)}<br/>
        Time: ${new Date(d.timestamp).toLocaleTimeString()}
      `)
      .style('left', (x + 10) + 'px')
      .style('top', (y - 10) + 'px');

    if (this.options.interaction.hover) {
      d3.select(event.target)
        .style('opacity', 0.8);
    }

    this.emit(CHART_EVENTS.BAR_HOVERED, d);
  }

  handleMouseOut(event, d) {
    if (!this.options.interaction.tooltips) return;

    this.tooltip.style('opacity', 0);

    if (this.options.interaction.hover) {
      d3.select(event.target)
        .style('opacity', 1);
    }
  }

  handleClick(event, d) {
    this.emit(CHART_EVENTS.BAR_CLICKED, d);
  }

  resize() {
    if (this.isDestroyed) return;

    const rect = this.element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    // Update SVG dimensions
    this.svg
      .attr('width', width)
      .attr('height', height);

    // Update scales
    const margin = this.options.barStyles.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    this.xScale.range([0, innerWidth]);
    this.yScale.range([innerHeight, 0]);

    // Update axes positions
    this.g.select('.x-axis')
      .attr('transform', `translate(0,${innerHeight})`);

    this.g.select('.x-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 5);

    this.g.select('.y-label')
      .attr('x', -innerHeight / 2);

    // Re-render
    this.render();
    this.emit(CHART_EVENTS.RESIZE);
  }

  clearData() {
    this.data = [];
    this.render();
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clean up tooltip
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Clear event listeners
    this.eventListeners = {};

    // Remove SVG
    if (this.svg) {
      this.svg.remove();
    }

    // Clear element
    this.element.innerHTML = '';
  }
}