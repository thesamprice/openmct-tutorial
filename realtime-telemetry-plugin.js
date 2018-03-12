function GetAttr( dict, fnames)
{
    if(fnames.length == 1)
        return dict[fnames[0]]
    return GetAttr(dict[fnames[0]], fnames.slice(1))
}
var TLM_HISTORY = {}
/**
 * Basic Realtime telemetry plugin using websockets.
 */
function RealtimeTelemetryPlugin() {
    return function (openmct) {
        //var socket = new WebSocket( 'ws://localhost:5000' + '/TLM');
        var socket = io.connect('localhost:5000');
        var listener = {};
        socket.listener = listener;

        socket.on('TLM', function (data) {
            console.log(data)
            var listener = this.listener;
            if(listener.hasOwnProperty(data.name) == false)
                return
            var fields = listener[data.name];
            Object.keys(fields).forEach(function(fname) {
                var id = data.name + '.' + fname;
                var state = { timestamp: data.time * 1000, 
                    value: GetAttr(data.obj, fname.split('.')), 
                    id: id,
                };

                if(TLM_HISTORY.hasOwnProperty(state.id) == false)
                    TLM_HISTORY[state.id] = []
                TLM_HISTORY[state.id].push(state)

                listener[data.name][fname](state)
            });
        });

        // socket.onmessage = function (event) {
        //     point = JSON.parse(event.data);
        //     if (listener[point.id]) {
        //         listener[point.id](point);
        //     }
        // };

        var provider = {
            supportsSubscribe: function (domainObject) {
                return domainObject.type === 'example.telemetry';
            },
            subscribe: function (domainObject, callback) {
                var pkt_name = domainObject.identifier.key.split('.')[0]

                var field = domainObject.identifier.key.split('.')
                                                   .slice(1)
                                                   .join('.');
                if(listener.hasOwnProperty(pkt_name) == false)
                    listener[pkt_name] = {};

                listener[pkt_name][field] = callback;
                socket.send('subscribe ' + pkt_name);

                return function unsubscribe() {
                    delete listener[pkt_name][field];
                    if(Object.keys(listener[pkt_name]).length == 0)
                        socket.send('unsubscribe ' + domainObject.identifier.key);
                };
            }
        };

        openmct.telemetry.addProvider(provider);
    }
}
