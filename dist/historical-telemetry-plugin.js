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
                    return fetch(url).then(response =>{
                        if(response.ok){
                            var res = response.json().then(function(data)
                            {
                                var i = 0;
                                var l = data.length;
                                for(i=0;i<l; i++)
                                    data[i].id = domainObject.identifier.key;
                                return data;
                            })
                            return res;
                        }

                    })

            }
        };
    
        openmct.telemetry.addProvider(provider);
    }
}