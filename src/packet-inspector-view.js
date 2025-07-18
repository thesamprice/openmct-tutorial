/**
 * Packet Inspector View
 * 
 * Provides detailed inspection of packet structure and metadata
 */

class PacketInspectorView {
    constructor(domainObject, openmct) {
        this.domainObject = domainObject;
        this.openmct = openmct;
        this.element = document.createElement('div');
        this.element.classList.add('c-packet-inspector');
        
        this.unsubscribe = null;
        this.latestPacket = null;
        
        this.setupStyles();
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .c-packet-inspector {
                height: 100%;
                overflow: auto;
                padding: 10px;
                font-family: monospace;
                background-color: #1a1a1a;
                color: #ccc;
            }
            
            .c-packet-inspector__header {
                background-color: #333;
                color: white;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 3px;
            }
            
            .c-packet-inspector__header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .c-packet-inspector__section {
                margin-bottom: 20px;
                border: 1px solid #333;
                border-radius: 3px;
                overflow: hidden;
            }
            
            .c-packet-inspector__section-header {
                background-color: #2a2a2a;
                padding: 10px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .c-packet-inspector__section-header:hover {
                background-color: #3a3a3a;
            }
            
            .c-packet-inspector__section-content {
                padding: 10px;
                background-color: #1a1a1a;
            }
            
            .c-packet-inspector__section-content.collapsed {
                display: none;
            }
            
            .c-packet-inspector__metadata {
                display: grid;
                grid-template-columns: 150px 1fr;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .c-packet-inspector__metadata-label {
                font-weight: bold;
                color: #4a9eff;
            }
            
            .c-packet-inspector__metadata-value {
                font-family: monospace;
                color: #00ff00;
            }
            
            .c-packet-inspector__hex-dump {
                background-color: #111;
                padding: 10px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                overflow: auto;
                max-height: 300px;
            }
            
            .c-packet-inspector__hex-row {
                display: flex;
                margin-bottom: 2px;
            }
            
            .c-packet-inspector__hex-offset {
                color: #888;
                width: 80px;
                flex-shrink: 0;
            }
            
            .c-packet-inspector__hex-bytes {
                flex: 1;
                margin-right: 20px;
            }
            
            .c-packet-inspector__hex-ascii {
                color: #4a9eff;
                width: 160px;
                flex-shrink: 0;
            }
            
            .c-packet-inspector__field-tree {
                font-family: monospace;
                font-size: 12px;
            }
            
            .c-packet-inspector__field-item {
                display: flex;
                align-items: center;
                padding: 2px 0;
                margin-left: 20px;
            }
            
            .c-packet-inspector__field-item--root {
                margin-left: 0;
                font-weight: bold;
                color: #4a9eff;
            }
            
            .c-packet-inspector__field-name {
                min-width: 150px;
                color: #4a9eff;
            }
            
            .c-packet-inspector__field-value {
                color: #00ff00;
                margin-left: 20px;
            }
            
            .c-packet-inspector__field-type {
                color: #888;
                margin-left: 10px;
                font-size: 10px;
            }
            
            .c-packet-inspector__toggle {
                color: #888;
                cursor: pointer;
                user-select: none;
                margin-right: 5px;
            }
            
            .c-packet-inspector__stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
            }
            
            .c-packet-inspector__stat-item {
                background-color: #2a2a2a;
                padding: 10px;
                border-radius: 3px;
                text-align: center;
            }
            
            .c-packet-inspector__stat-value {
                font-size: 18px;
                font-weight: bold;
                color: #00ff00;
            }
            
            .c-packet-inspector__stat-label {
                font-size: 12px;
                color: #888;
                margin-top: 5px;
            }
        `;
        document.head.appendChild(style);
    }
    
    show(element) {
        element.appendChild(this.element);
        this.render();
        this.subscribe();
    }
    
    render() {
        this.element.innerHTML = `
            <div class="c-packet-inspector__header">
                <h3>Packet Inspector: ${this.domainObject.name}</h3>
            </div>
            
            <div class="c-packet-inspector__section">
                <div class="c-packet-inspector__section-header" onclick="this.parentElement.querySelector('.c-packet-inspector__section-content').classList.toggle('collapsed')">
                    <span>Packet Metadata</span>
                    <span class="c-packet-inspector__toggle">▼</span>
                </div>
                <div class="c-packet-inspector__section-content">
                    <div class="c-packet-inspector__metadata" id="metadata-content">
                        <div class="c-packet-inspector__metadata-label">Status:</div>
                        <div class="c-packet-inspector__metadata-value">Waiting for data...</div>
                    </div>
                </div>
            </div>
            
            <div class="c-packet-inspector__section">
                <div class="c-packet-inspector__section-header" onclick="this.parentElement.querySelector('.c-packet-inspector__section-content').classList.toggle('collapsed')">
                    <span>Statistics</span>
                    <span class="c-packet-inspector__toggle">▼</span>
                </div>
                <div class="c-packet-inspector__section-content">
                    <div class="c-packet-inspector__stats" id="stats-content">
                        <div class="c-packet-inspector__stat-item">
                            <div class="c-packet-inspector__stat-value" id="field-count">--</div>
                            <div class="c-packet-inspector__stat-label">Fields</div>
                        </div>
                        <div class="c-packet-inspector__stat-item">
                            <div class="c-packet-inspector__stat-value" id="packet-size">--</div>
                            <div class="c-packet-inspector__stat-label">Size (bytes)</div>
                        </div>
                        <div class="c-packet-inspector__stat-item">
                            <div class="c-packet-inspector__stat-value" id="last-update">--</div>
                            <div class="c-packet-inspector__stat-label">Last Update</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="c-packet-inspector__section">
                <div class="c-packet-inspector__section-header" onclick="this.parentElement.querySelector('.c-packet-inspector__section-content').classList.toggle('collapsed')">
                    <span>Field Structure</span>
                    <span class="c-packet-inspector__toggle">▼</span>
                </div>
                <div class="c-packet-inspector__section-content">
                    <div class="c-packet-inspector__field-tree" id="field-tree">
                        <div style="text-align: center; color: #888; padding: 20px;">
                            No packet data available
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="c-packet-inspector__section">
                <div class="c-packet-inspector__section-header" onclick="this.parentElement.querySelector('.c-packet-inspector__section-content').classList.toggle('collapsed')">
                    <span>Hex Dump</span>
                    <span class="c-packet-inspector__toggle">▼</span>
                </div>
                <div class="c-packet-inspector__section-content collapsed">
                    <div class="c-packet-inspector__hex-dump" id="hex-dump">
                        <div style="text-align: center; color: #888; padding: 20px;">
                            No binary data available
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.metadataContent = this.element.querySelector('#metadata-content');
        this.statsContent = this.element.querySelector('#stats-content');
        this.fieldTree = this.element.querySelector('#field-tree');
        this.hexDump = this.element.querySelector('#hex-dump');
        
        this.fieldCountElement = this.element.querySelector('#field-count');
        this.packetSizeElement = this.element.querySelector('#packet-size');
        this.lastUpdateElement = this.element.querySelector('#last-update');
    }
    
    subscribe() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        this.unsubscribe = this.openmct.telemetry.subscribe(
            this.domainObject,
            this.updatePacketData.bind(this)
        );
        
        // Request latest data
        this.openmct.telemetry.request(this.domainObject)
            .then(data => {
                if (data && data.length > 0) {
                    this.updatePacketData(data[0]);
                }
            })
            .catch(error => {
                console.error('Error requesting packet data:', error);
            });
    }
    
    updatePacketData(telemetryData) {
        if (!telemetryData || !telemetryData.packet_data) {
            return;
        }
        
        const packet = telemetryData.packet_data;
        this.latestPacket = packet;
        
        this.updateMetadata(packet, telemetryData);
        this.updateStats(packet, telemetryData);
        this.updateFieldTree(packet);
        this.updateHexDump(packet);
    }
    
    updateMetadata(packet, telemetryData) {
        const metadata = [
            ['Status', 'Active'],
            ['Packet Name', packet.packet || 'Unknown'],
            ['Timestamp', new Date(telemetryData.utc).toLocaleString()],
            ['APID', this.domainObject.apid || 'N/A'],
            ['Size', (this.domainObject.size || 'N/A') + ' bytes'],
            ['Fields', Object.keys(packet.fields || {}).length],
            ['Data Quality', 'Good']
        ];
        
        this.metadataContent.innerHTML = metadata.map(([label, value]) => `
            <div class="c-packet-inspector__metadata-label">${label}:</div>
            <div class="c-packet-inspector__metadata-value">${value}</div>
        `).join('');
    }
    
    updateStats(packet, telemetryData) {
        const fields = packet.fields || {};
        const fieldCount = Object.keys(fields).length;
        const packetSize = this.domainObject.size || 0;
        const lastUpdate = new Date(telemetryData.utc).toLocaleTimeString();
        
        this.fieldCountElement.textContent = fieldCount;
        this.packetSizeElement.textContent = packetSize;
        this.lastUpdateElement.textContent = lastUpdate;
    }
    
    updateFieldTree(packet) {
        const fields = packet.fields || {};
        
        if (Object.keys(fields).length === 0) {
            this.fieldTree.innerHTML = `
                <div style="text-align: center; color: #888; padding: 20px;">
                    No fields available
                </div>
            `;
            return;
        }
        
        this.fieldTree.innerHTML = `
            <div class="c-packet-inspector__field-item c-packet-inspector__field-item--root">
                <span class="c-packet-inspector__field-name">${packet.packet || 'Packet'}</span>
                <span class="c-packet-inspector__field-type">[${Object.keys(fields).length} fields]</span>
            </div>
            ${Object.entries(fields).map(([name, value]) => 
                this.renderFieldItem(name, value)
            ).join('')}
        `;
    }
    
    renderFieldItem(name, value) {
        const type = this.getFieldType(value);
        const formattedValue = this.formatFieldValue(value);
        
        return `
            <div class="c-packet-inspector__field-item">
                <span class="c-packet-inspector__field-name">${name}</span>
                <span class="c-packet-inspector__field-value">${formattedValue}</span>
                <span class="c-packet-inspector__field-type">(${type})</span>
            </div>
        `;
    }
    
    getFieldType(value) {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'int' : 'float';
        }
        
        if (typeof value === 'string') {
            return 'string';
        }
        
        if (typeof value === 'boolean') {
            return 'bool';
        }
        
        if (Array.isArray(value)) {
            return `array[${value.length}]`;
        }
        
        if (typeof value === 'object') {
            return 'object';
        }
        
        return typeof value;
    }
    
    formatFieldValue(value) {
        if (value === null || value === undefined) {
            return 'NULL';
        }
        
        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                return value.toString();
            } else {
                return value.toFixed(6);
            }
        }
        
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }
        
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        
        if (typeof value === 'object') {
            return '{...}';
        }
        
        return String(value);
    }
    
    updateHexDump(packet) {
        // For now, show a simulated hex dump since we don't have actual binary data
        // In a real implementation, you would get the raw packet bytes
        const fields = packet.fields || {};
        const fieldData = JSON.stringify(fields, null, 2);
        
        this.hexDump.innerHTML = `
            <div style="color: #888; margin-bottom: 10px;">
                Simulated hex dump (JSON representation):
            </div>
            <pre style="color: #00ff00; font-size: 11px; line-height: 1.3;">
${fieldData}
            </pre>
        `;
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for use in packet-plugin.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PacketInspectorView;
} else {
    window.PacketInspectorView = PacketInspectorView;
}