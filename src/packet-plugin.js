/**
 * Packet Telemetry Plugin for OpenMCT
 * 
 * Provides packet-level telemetry views that display complete telemetry packets
 * with all their fields and values in a structured format.
 */

function PacketPlugin() {
    return function install(openmct) {
        
        // Register packet telemetry object type
        openmct.types.addType('packet.telemetry', {
            name: 'Telemetry Packet',
            description: 'Complete telemetry packet with all fields',
            cssClass: 'icon-packet',
            creatable: false,
            initialize: function (domainObject) {
                domainObject.telemetry = {
                    values: domainObject.values || []
                };
            }
        });

        // Register packet composition provider
        openmct.composition.addProvider(packetCompositionProvider);

        // Register packet view providers
        openmct.objectViews.addProvider(packetTableViewProvider);
        openmct.objectViews.addProvider(packetTimelineViewProvider);
        openmct.objectViews.addProvider(packetInspectorViewProvider);

        // Register packet telemetry provider
        openmct.telemetry.addProvider(packetTelemetryProvider);

        console.log('✅ Packet Telemetry Plugin installed successfully');
    };
}

/**
 * Packet Composition Provider
 * Provides the list of telemetry fields that comprise a packet
 */
const packetCompositionProvider = {
    appliesTo: function (domainObject) {
        return domainObject.type === 'packet.telemetry';
    },
    
    load: function (domainObject) {
        // Return the telemetry fields that make up this packet
        const composition = domainObject.composition || [];
        return Promise.resolve(composition.map(fieldKey => {
            // Create child object identifiers for each field
            const parts = fieldKey.split('.');
            return {
                namespace: domainObject.identifier.namespace,
                key: fieldKey
            };
        }));
    }
};

/**
 * Packet Telemetry Provider
 * Provides telemetry data for packet objects
 */
const packetTelemetryProvider = {
    supportsSubscribe: function (domainObject) {
        return domainObject.type === 'packet.telemetry';
    },
    
    supportsRequest: function (domainObject) {
        return domainObject.type === 'packet.telemetry';
    },
    
    subscribe: function (domainObject, callback) {
        console.log('Subscribing to packet telemetry:', domainObject.name);
        
        const packetName = domainObject.packet_name;
        
        // Subscribe to real-time packet updates via Socket.IO
        const socket = io();
        
        socket.on('TLM', function(data) {
            // Check if this telemetry update is for our packet
            if (data.key && data.key.startsWith(packetName + '.')) {
                // Fetch the complete packet data
                fetch(`/packet/${packetName}`)
                    .then(response => response.json())
                    .then(packetData => {
                        // Format for OpenMCT
                        const telemetryData = {
                            timestamp: packetData.timestamp,
                            packet_data: packetData,
                            id: domainObject.identifier.key,
                            utc: packetData.timestamp * 1000 // Convert to milliseconds
                        };
                        
                        callback(telemetryData);
                    })
                    .catch(error => {
                        console.error('Error fetching packet data:', error);
                    });
            }
        });
        
        // Return unsubscribe function
        return function unsubscribe() {
            socket.disconnect();
        };
    },
    
    request: function (domainObject, options) {
        console.log('Requesting packet telemetry:', domainObject.name, options);
        
        const packetName = domainObject.packet_name;
        
        if (options.start !== undefined && options.end !== undefined) {
            // Historical data request
            const start = options.start / 1000; // Convert to seconds
            const end = options.end / 1000;
            
            return fetch(`/packet/${packetName}/history?start=${start}&end=${end}`)
                .then(response => response.json())
                .then(packets => {
                    return packets.map(packet => ({
                        timestamp: packet.timestamp,
                        packet_data: packet,
                        id: domainObject.identifier.key,
                        utc: packet.timestamp * 1000
                    }));
                });
        } else {
            // Latest data request
            return fetch(`/packet/${packetName}`)
                .then(response => response.json())
                .then(packet => {
                    return [{
                        timestamp: packet.timestamp,
                        packet_data: packet,
                        id: domainObject.identifier.key,
                        utc: packet.timestamp * 1000
                    }];
                });
        }
    }
};

/**
 * Packet Table View Provider
 * Provides a tabular view of packet fields and values
 */
const packetTableViewProvider = {
    key: 'packet-table',
    name: 'Packet Table',
    cssClass: 'icon-tabular-realtime',
    
    canView: function (domainObject) {
        return domainObject.type === 'packet.telemetry';
    },
    
    view: function (domainObject) {
        return new PacketTableView(domainObject, openmct);
    },
    
    priority: function () {
        return 1;
    }
};

/**
 * Packet Timeline View Provider
 * Provides a timeline view of packet arrivals
 */
const packetTimelineViewProvider = {
    key: 'packet-timeline',
    name: 'Packet Timeline',
    cssClass: 'icon-timeline',
    
    canView: function (domainObject) {
        return domainObject.type === 'packet.telemetry';
    },
    
    view: function (domainObject) {
        return new PacketTimelineView(domainObject, openmct);
    },
    
    priority: function () {
        return 2;
    }
};

/**
 * Packet Inspector View Provider
 * Provides a detailed inspection view of packet structure
 */
const packetInspectorViewProvider = {
    key: 'packet-inspector',
    name: 'Packet Inspector',
    cssClass: 'icon-info',
    
    canView: function (domainObject) {
        return domainObject.type === 'packet.telemetry';
    },
    
    view: function (domainObject) {
        return new PacketInspectorView(domainObject, openmct);
    },
    
    priority: function () {
        return 3;
    }
};

// Export the plugin
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PacketPlugin;
} else {
    window.PacketPlugin = PacketPlugin;
}