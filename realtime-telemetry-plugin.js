 
function GetAttr( obj, key)
{
    var keys = key.split('.')
    while(keys.length >= 1)
    {
        var key_0 = keys[0];
        keys = keys.slice(1);

        key_0 = key_0.split('[')

        if(key_0.length > 1) /* Handle arrays */
        {
            obj = obj[key_0[0]]
            key_0 = key_0.slice(1)
            while(key_0.length > 0)
            {
                var index = parseInt(key_0[0].replace(']',''))
                obj = obj[index]
                key_0 = key_0.slice(1)
            }
        }
        else{
            obj = obj[key_0]
        }
    }
    return obj
}

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

            var listener = this.listener;
            if(listener.hasOwnProperty(data.name) == false)
                return
            var fields = listener[data.name];
            Object.keys(fields).forEach(function(fname) {
                var id = data.name + '.' + fname;
                var state = { timestamp: data.time * 1000, 
                    id: id,
                };
                state.rawvalue = GetAttr(data.obj, fname)
                state.value = state.rawvalue

                var db_obj = FLAT_DB[id].properites
                if(db_obj.hasOwnProperty('poly'))
                {
                    var poly = db_obj.poly;
                    var i =0;
                    state.value = 0;
                    for(i=0;i<poly.x.length;i+=1)
                    {
                        state.value += Math.pow(state.rawvalue, poly.x[i]) * poly.y[i];
                    }

                }

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
                                                   console.log(field)
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
