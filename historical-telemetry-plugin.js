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
                // var url = '/history/' +
                //     domainObject.identifier.key //+
                    // '?start=' + options.start +
                    // '&end=' + options.end;

                    var p = new Promise(function(res,rej){
                        var id = domainObject.identifier.key;
                        console.log(id)
                        console.log(TLM_HISTORY)
                        if(TLM_HISTORY.hasOwnProperty(id))
                        {
                            return res(TLM_HISTORY[id]);
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