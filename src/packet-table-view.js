/**
 * Packet Table View
 * 
 * Displays telemetry packet data in a table format with all fields and values
 */

class PacketTableView {
    constructor(domainObject, openmct) {
        this.domainObject = domainObject;
        this.openmct = openmct;
        this.element = document.createElement('div');
        this.element.classList.add('c-packet-table');
        
        this.unsubscribe = null;
        this.latestPacket = null;
        this.fieldRows = new Map();
        
        this.setupStyles();
    }
    
    setupStyles() {
        // Add CSS styles for packet table
        const style = document.createElement('style');
        style.textContent = `
            .c-packet-table {
                height: 100%;
                overflow: auto;
                padding: 10px;
                font-family: monospace;
            }
            
            .c-packet-table__header {
                background-color: #333;
                color: white;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 3px;
            }
            
            .c-packet-table__header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .c-packet-table__info {
                display: flex;
                gap: 20px;
                margin-top: 5px;
                font-size: 12px;
                opacity: 0.8;
            }
            
            .c-packet-table__table {
                width: 100%;
                border-collapse: collapse;
                background-color: #1a1a1a;
                color: #ccc;
            }
            
            .c-packet-table__table th,
            .c-packet-table__table td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid #333;
            }
            
            .c-packet-table__table th {
                background-color: #2a2a2a;
                font-weight: bold;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            
            .c-packet-table__table tr:hover {
                background-color: #2a2a2a;
            }
            
            .c-packet-table__field-name {
                font-weight: bold;
                color: #4a9eff;
            }
            
            .c-packet-table__field-value {
                font-family: monospace;
                color: #00ff00;
            }
            
            .c-packet-table__field-updated {
                background-color: #2a4a2a !important;
                transition: background-color 0.5s ease;
            }
            
            .c-packet-table__timestamp {
                font-size: 11px;
                color: #888;
            }
            
            .c-packet-table__status {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 2px;
            }
            
            .c-packet-table__status--good {
                background-color: #2a4a2a;
                color: #00ff00;
            }
            
            .c-packet-table__status--stale {
                background-color: #4a4a2a;
                color: #ffaa00;
            }
            
            .c-packet-table__status--error {
                background-color: #4a2a2a;
                color: #ff0000;
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
        const packetName = this.domainObject.packet_name || 'Unknown';
        const apid = this.domainObject.apid || 'N/A';
        const size = this.domainObject.size || 'N/A';
        
        this.element.innerHTML = `
            <div class="c-packet-table__header">
                <h3>${this.domainObject.name}</h3>
                <div class="c-packet-table__info">
                    <span>APID: ${apid}</span>
                    <span>Size: ${size} bytes</span>
                    <span>Status: <span id="packet-status">Waiting...</span></span>
                    <span>Last Update: <span id="last-update">--</span></span>
                </div>
            </div>
            <table class="c-packet-table__table">
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Value</th>
                        <th>Type</th>
                        <th>Units</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody class="c-packet-table__body">
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 20px; color: #888;">
                            Loading packet data...
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
        
        this.tbody = this.element.querySelector('.c-packet-table__body');
        this.statusElement = this.element.querySelector('#packet-status');
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
                this.showError('Failed to load packet data');
            });
    }
    
    updatePacketData(telemetryData) {
        if (!telemetryData || !telemetryData.packet_data) {
            return;
        }
        
        const packet = telemetryData.packet_data;
        const fields = packet.fields || {};
        
        // Update header info
        this.statusElement.textContent = 'Active';
        this.statusElement.style.color = '#00ff00';
        this.lastUpdateElement.textContent = new Date(telemetryData.utc).toLocaleString();
        
        // Clear loading message if present
        if (this.tbody.querySelector('td[colspan="5"]')) {
            this.tbody.innerHTML = '';
        }
        
        // Update or create field rows
        Object.entries(fields).forEach(([fieldName, value]) => {
            this.updateFieldRow(fieldName, value, telemetryData.utc);
        });
        
        // Mark packet as updated
        this.latestPacket = packet;
    }
    
    updateFieldRow(fieldName, value, timestamp) {
        let row = this.fieldRows.get(fieldName);
        
        if (!row) {
            // Create new row
            row = document.createElement('tr');
            row.innerHTML = `
                <td class="c-packet-table__field-name">${fieldName}</td>
                <td class="c-packet-table__field-value">--</td>
                <td class="c-packet-table__field-type">--</td>
                <td class="c-packet-table__field-units">--</td>
                <td class="c-packet-table__field-status">--</td>
            `;
            this.tbody.appendChild(row);
            this.fieldRows.set(fieldName, row);
        }
        
        // Update values
        const valueCell = row.querySelector('.c-packet-table__field-value');
        const typeCell = row.querySelector('.c-packet-table__field-type');
        const statusCell = row.querySelector('.c-packet-table__field-status');
        
        // Format value based on type
        let formattedValue = value;
        let fieldType = typeof value;
        
        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                formattedValue = value.toString();
                fieldType = 'integer';
            } else {
                formattedValue = value.toFixed(6);
                fieldType = 'float';
            }
        } else if (typeof value === 'string') {
            formattedValue = `"${value}"`;
            fieldType = 'string';
        } else if (typeof value === 'boolean') {
            formattedValue = value ? 'TRUE' : 'FALSE';
            fieldType = 'boolean';
        }
        
        valueCell.textContent = formattedValue;
        typeCell.textContent = fieldType;
        
        // Update status
        const status = this.getFieldStatus(value);
        statusCell.innerHTML = `<span class="c-packet-table__status c-packet-table__status--${status.class}">${status.text}</span>`;
        
        // Highlight updated row
        row.classList.add('c-packet-table__field-updated');
        setTimeout(() => {
            row.classList.remove('c-packet-table__field-updated');
        }, 500);
    }
    
    getFieldStatus(value) {
        // Basic status determination - could be enhanced with limits checking
        if (value === null || value === undefined) {
            return { class: 'error', text: 'NULL' };
        }
        
        if (typeof value === 'number' && !isFinite(value)) {
            return { class: 'error', text: 'INF' };
        }
        
        return { class: 'good', text: 'GOOD' };
    }
    
    showError(message) {
        this.tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #ff0000;">
                    Error: ${message}
                </td>
            </tr>
        `;
        
        this.statusElement.textContent = 'Error';
        this.statusElement.style.color = '#ff0000';
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
    module.exports = PacketTableView;
} else {
    window.PacketTableView = PacketTableView;
}