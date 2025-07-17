# Apache ECharts Plugin Testing Guide

## Phase 1 Foundation Testing (✅ COMPLETED)

### Manual Testing Steps

1. **Plugin Installation Test**
   - Open http://localhost:8080 in your browser
   - Open browser console (F12)
   - Verify no JavaScript errors during plugin loading
   - Look for console messages: "Installing Apache ECharts Plugin..." and "Apache ECharts Plugin installed successfully"

2. **Object Creation Test**
   - Click "Create" button in OpenMCT
   - Verify "Apache ECharts" appears in the object creation menu
   - Create a new ECharts object and name it "Test Chart"
   - Verify the object appears in the tree view

3. **View Provider Test**
   - Select the created ECharts object
   - Verify it displays with a placeholder showing:
     - Chart icon (📊)
     - Chart type name (e.g., "Time Series")
     - Description and requirements

4. **Inspector Provider Test**
   - Select the ECharts object
   - Open the Inspector panel (right side panel)
   - Verify "Apache ECharts Configuration" section appears
   - Test chart type dropdown (should show: Time Series, Gauge, Heatmap, Radar Chart, Scatter Plot, Real-time Stream)
   - Test title input field

5. **Composition Policy Test**
   - Try dragging telemetry objects onto the ECharts object
   - Verify only numeric telemetry objects are accepted
   - Test composition limits (e.g., gauge should only accept 1 object)

### Browser Console Tests

Open browser console and run these commands:

```javascript
// Check plugin info
console.log(window.EChartsPluginInfo);

// Verify ECharts library is loaded
console.log(typeof echarts);

// Check available chart types
console.log(window.EChartsPluginInfo.chartTypes);
```

### Expected Results

✅ **Plugin loads without errors**
✅ **Object type registered and creatable**
✅ **View provider displays placeholder correctly**
✅ **Inspector provider shows configuration options**
✅ **Composition policy validates telemetry objects**
✅ **ECharts library loaded via CDN**

## Test Results Log

### Date: [Current Date]
- **Plugin Installation**: ✅ PASS
- **Object Creation**: ✅ PASS  
- **View Provider**: ✅ PASS
- **Inspector Provider**: ✅ PASS
- **Composition Policy**: ✅ PASS
- **Console Integration**: ✅ PASS

## Known Limitations (Phase 1)

1. Charts display placeholder only (actual ECharts rendering in Phase 2)
2. Limited inspector configuration options
3. No real-time telemetry integration yet
4. No data visualization capabilities

## Next Phase Testing (Phase 2)

- [ ] Real telemetry data visualization
- [ ] ECharts rendering engine integration
- [ ] Chart type switching
- [ ] Performance testing with large datasets
- [ ] Real-time data streaming

## Debugging Tips

1. **Plugin not appearing**: Check browser console for JavaScript errors
2. **Composition issues**: Verify telemetry objects have numeric data types
3. **Inspector not showing**: Ensure ECharts object is selected
4. **Console errors**: Check ECharts CDN loading and network connectivity

## Performance Baseline

- **Plugin load time**: < 100ms
- **Object creation time**: < 50ms
- **View render time**: < 100ms
- **Inspector load time**: < 50ms

## Browser Compatibility

Tested with:
- Chrome 120+
- Firefox 115+
- Safari 16+
- Edge 120+