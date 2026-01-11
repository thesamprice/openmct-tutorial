/**
 * Packet Timeline View
 * 
 * Displays a timeline of packet arrivals with rate and gap analysis
 */

class PacketTimelineView {
    constructor(domainObject, openmct) {
        this.domainObject = domainObject;
        this.openmct = openmct;
        this.element = document.createElement('div');
        this.element.classList.add('c-packet-timeline');
        
        this.unsubscribe = null;
        this.packets = [];
        this.maxPackets = 1000; // Limit stored packets
        this.lastPacketTime = null;
        this.packetRate = 0;
        this.rateUpdateInterval = null;
        
        this.setupStyles();
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .c-packet-timeline {
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 10px;
                font-family: monospace;
                background-color: #1a1a1a;
                color: #ccc;
            }
            
            .c-packet-timeline__header {
                background-color: #333;
                color: white;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 3px;
            }
            
            .c-packet-timeline__header h3 {
                margin: 0 0 10px 0;
                font-size: 16px;
            }
            
            .c-packet-timeline__controls {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .c-packet-timeline__controls button {
                padding: 5px 10px;
                background-color: #444;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            
            .c-packet-timeline__controls button:hover {
                background-color: #555;
            }
            
            .c-packet-timeline__stats {
                display: flex;
                gap: 20px;
                margin-bottom: 10px;
                font-size: 12px;
            }
            
            .c-packet-timeline__stats span {
                padding: 5px 10px;
                background-color: #2a2a2a;
                border-radius: 3px;
            }
            
            .c-packet-timeline__chart {
                flex: 1;
                border: 1px solid #333;
                border-radius: 3px;
                position: relative;
                overflow: auto;
                background-color: #111;
            }
            
            .c-packet-timeline__timeline {
                position: relative;
                height: 100%;
                min-height: 200px;
            }
            
            .c-packet-timeline__axis {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 30px;
                border-top: 1px solid #333;
                background-color: #1a1a1a;
            }
            
            .c-packet-timeline__axis-label {
                position: absolute;
                bottom: 5px;
                font-size: 10px;
                color: #888;
                transform: translateX(-50%);
            }
            
            .c-packet-timeline__packet {
                position: absolute;
                width: 2px;
                background-color: #00ff00;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .c-packet-timeline__packet:hover {
                background-color: #00ffff;
                width: 4px;
                z-index: 10;
            }
            
            .c-packet-timeline__packet--recent {
                background-color: #ffff00;
                width: 3px;
                box-shadow: 0 0 5px #ffff00;
            }
            
            .c-packet-timeline__gap {
                position: absolute;
                background-color: rgba(255, 0, 0, 0.2);
                border: 1px solid #ff0000;
                border-radius: 2px;
                pointer-events: none;
            }
            
            .c-packet-timeline__tooltip {
                position: absolute;
                background-color: #333;
                color: white;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 11px;
                z-index: 100;
                pointer-events: none;
                box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            }
        `;
        document.head.appendChild(style);
    }
    
    show(element) {
        element.appendChild(this.element);
        this.render();
        this.subscribe();
        this.startRateUpdates();
    }
    
    render() {
        const packetName = this.domainObject.packet_name || 'Unknown';
        
        this.element.innerHTML = `
            <div class="c-packet-timeline__header">
                <h3>Packet Timeline: ${this.domainObject.name}</h3>
                <div class="c-packet-timeline__controls">
                    <button id="zoom-in">Zoom In</button>
                    <button id="zoom-out">Zoom Out</button>
                    <button id="reset-view">Reset View</button>
                    <button id="clear-history">Clear History</button>
                </div>
            </div>
            <div class="c-packet-timeline__stats">
                <span>Packets: <span id="packet-count">0</span></span>
                <span>Rate: <span id="packet-rate">0.0</span> pkt/s</span>
                <span>Last Gap: <span id="last-gap">--</span></span>
                <span>Avg Interval: <span id="avg-interval">--</span></span>
            </div>
            <div class="c-packet-timeline__chart">
                <div class="c-packet-timeline__timeline" id="timeline"></div>
                <div class="c-packet-timeline__axis" id="axis"></div>
            </div>
        `;
        
        this.timeline = this.element.querySelector('#timeline');
        this.axis = this.element.querySelector('#axis');
        this.packetCountElement = this.element.querySelector('#packet-count');
        this.packetRateElement = this.element.querySelector('#packet-rate');
        this.lastGapElement = this.element.querySelector('#last-gap');
        this.avgIntervalElement = this.element.querySelector('#avg-interval');
        
        // Setup controls
        this.setupControls();
        
        // Initialize view
        this.viewStartTime = Date.now() - 60000; // Last minute
        this.viewEndTime = Date.now();
        this.viewDuration = 60000; // 1 minute
        
        this.updateAxis();
    }
    
    setupControls() {
        this.element.querySelector('#zoom-in').addEventListener('click', () => {
            this.viewDuration *= 0.5;
            this.updateView();
        });
        
        this.element.querySelector('#zoom-out').addEventListener('click', () => {
            this.viewDuration *= 2;
            this.updateView();
        });
        
        this.element.querySelector('#reset-view').addEventListener('click', () => {
            this.viewDuration = 60000;
            this.viewEndTime = Date.now();
            this.viewStartTime = this.viewEndTime - this.viewDuration;
            this.updateView();
        });
        
        this.element.querySelector('#clear-history').addEventListener('click', () => {
            this.packets = [];
            this.updateView();
            this.updateStats();
        });
    }
    
    subscribe() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        this.unsubscribe = this.openmct.telemetry.subscribe(
            this.domainObject,
            this.addPacket.bind(this)
        );
        
        // Request some historical data
        const end = Date.now();
        const start = end - 300000; // Last 5 minutes
        
        this.openmct.telemetry.request(this.domainObject, {
            start: start,
            end: end
        }).then(data => {
            data.forEach(packet => {
                this.addPacket(packet, false); // Don't update view for each packet
            });
            this.updateView();
            this.updateStats();
        }).catch(error => {
            console.error('Error requesting packet timeline data:', error);
        });
    }
    
    addPacket(telemetryData, updateView = true) {
        if (!telemetryData || !telemetryData.packet_data) {
            return;
        }
        
        const packet = {
            timestamp: telemetryData.utc,
            packet_data: telemetryData.packet_data,
            isRecent: Date.now() - telemetryData.utc < 5000 // Mark as recent if within 5 seconds
        };
        
        this.packets.push(packet);
        
        // Remove old packets to limit memory usage
        if (this.packets.length > this.maxPackets) {
            this.packets.shift();
        }
        
        // Update view window to follow real-time data
        if (updateView) {
            this.viewEndTime = Math.max(this.viewEndTime, packet.timestamp);
            this.viewStartTime = this.viewEndTime - this.viewDuration;
            this.updateView();
            this.updateStats();
        }
        
        this.lastPacketTime = packet.timestamp;
    }
    
    updateView() {
        // Clear existing packet markers
        this.timeline.querySelectorAll('.c-packet-timeline__packet').forEach(el => el.remove());
        this.timeline.querySelectorAll('.c-packet-timeline__gap').forEach(el => el.remove());
        
        const timelineWidth = this.timeline.clientWidth;
        const timelineHeight = this.timeline.clientHeight - 30; // Leave space for axis
        
        if (timelineWidth === 0) {
            // Timeline not yet visible, try again later
            setTimeout(() => this.updateView(), 100);
            return;
        }
        
        // Draw packet markers
        this.packets.forEach((packet, index) => {
            if (packet.timestamp >= this.viewStartTime && packet.timestamp <= this.viewEndTime) {
                const x = ((packet.timestamp - this.viewStartTime) / this.viewDuration) * timelineWidth;
                const height = Math.min(20 + (index % 10) * 2, timelineHeight - 40);
                
                const packetElement = document.createElement('div');
                packetElement.className = 'c-packet-timeline__packet';
                if (packet.isRecent) {
                    packetElement.classList.add('c-packet-timeline__packet--recent');
                }
                
                packetElement.style.left = x + 'px';
                packetElement.style.bottom = '30px';
                packetElement.style.height = height + 'px';
                
                // Add tooltip
                packetElement.title = `Packet at ${new Date(packet.timestamp).toLocaleString()}`;
                
                this.timeline.appendChild(packetElement);
            }
        });
        
        // Draw gaps (periods without packets)
        this.drawGaps(timelineWidth, timelineHeight);
        
        // Update axis
        this.updateAxis();
    }
    
    drawGaps(timelineWidth, timelineHeight) {
        const gapThreshold = 5000; // 5 seconds
        
        for (let i = 1; i < this.packets.length; i++) {
            const prevPacket = this.packets[i - 1];
            const currPacket = this.packets[i];
            const gap = currPacket.timestamp - prevPacket.timestamp;
            
            if (gap > gapThreshold) {
                const startX = ((prevPacket.timestamp - this.viewStartTime) / this.viewDuration) * timelineWidth;
                const endX = ((currPacket.timestamp - this.viewStartTime) / this.viewDuration) * timelineWidth;
                
                if (endX > 0 && startX < timelineWidth) {
                    const gapElement = document.createElement('div');
                    gapElement.className = 'c-packet-timeline__gap';
                    gapElement.style.left = Math.max(0, startX) + 'px';
                    gapElement.style.width = Math.min(timelineWidth, endX) - Math.max(0, startX) + 'px';
                    gapElement.style.bottom = '30px';
                    gapElement.style.height = '20px';
                    gapElement.title = `Gap: ${(gap / 1000).toFixed(1)}s`;
                    
                    this.timeline.appendChild(gapElement);
                }
            }
        }
    }
    
    updateAxis() {
        // Clear existing axis labels
        this.axis.querySelectorAll('.c-packet-timeline__axis-label').forEach(el => el.remove());
        
        const timelineWidth = this.axis.clientWidth;
        const numLabels = 6;
        
        for (let i = 0; i <= numLabels; i++) {
            const x = (i / numLabels) * timelineWidth;
            const time = this.viewStartTime + (i / numLabels) * this.viewDuration;
            
            const label = document.createElement('div');
            label.className = 'c-packet-timeline__axis-label';
            label.style.left = x + 'px';
            label.textContent = new Date(time).toLocaleTimeString();
            
            this.axis.appendChild(label);
        }
    }
    
    updateStats() {
        this.packetCountElement.textContent = this.packets.length;
        this.packetRateElement.textContent = this.packetRate.toFixed(1);
        
        // Calculate average interval
        if (this.packets.length > 1) {
            const totalTime = this.packets[this.packets.length - 1].timestamp - this.packets[0].timestamp;
            const avgInterval = totalTime / (this.packets.length - 1);
            this.avgIntervalElement.textContent = (avgInterval / 1000).toFixed(2) + 's';
        } else {
            this.avgIntervalElement.textContent = '--';
        }
        
        // Find largest gap
        let maxGap = 0;
        for (let i = 1; i < this.packets.length; i++) {
            const gap = this.packets[i].timestamp - this.packets[i - 1].timestamp;
            maxGap = Math.max(maxGap, gap);
        }
        
        if (maxGap > 0) {
            this.lastGapElement.textContent = (maxGap / 1000).toFixed(1) + 's';
        } else {
            this.lastGapElement.textContent = '--';
        }
    }
    
    startRateUpdates() {
        this.rateUpdateInterval = setInterval(() => {
            this.calculatePacketRate();
        }, 1000);
    }
    
    calculatePacketRate() {
        const now = Date.now();
        const windowSize = 10000; // 10 seconds
        const recentPackets = this.packets.filter(p => now - p.timestamp < windowSize);
        
        this.packetRate = recentPackets.length / (windowSize / 1000);
        
        if (this.packetRateElement) {
            this.packetRateElement.textContent = this.packetRate.toFixed(1);
        }
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        
        if (this.rateUpdateInterval) {
            clearInterval(this.rateUpdateInterval);
            this.rateUpdateInterval = null;
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for use in packet-plugin.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PacketTimelineView;
} else {
    window.PacketTimelineView = PacketTimelineView;
}