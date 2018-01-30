/**
 * Basic historical telemetry plugin.
 */

function HistoricalTelemetryPlugin() {
    return function install (openmct) {
        var provider = {
            supportsRequest: function (domainObject) {
                return domainObject.type === 'example.telemetry';
            },
            request: function (domainObject, options) {
                var url = '/history/' +
                    domainObject.identifier.key +
                    '?start=' + options.start +
                    '&end=' + options.end;
    
                    var p = new Promise(function(res,rej){
                        var id = domainObject.identifier.key;
                        if(telemetry_history.hasOwnProperty(id))
                        {
                            return res(telemetry_history[id]);
                        }
                        else{
                            return res([]);
                        }

                    });
                    return p;

            }
        };
    
        openmct.telemetry.addProvider(provider);
    }
}