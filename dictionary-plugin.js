
var TLM_DB_JSON;
var FLAT_DB = {}
function BuildFlatDB(x){
    FLAT_DB[x.key] = x;
    var i=0;
    for(i=0;i<x.children.length;i+=1)
    {
        BuildFlatDB(x.children[i])
    }
}
function loadDictionary() {
    return fetch('/db_telemetry',{cache: 'force-cache'})
    .then(function (response) {
        TLM_DB_JSON = response.json()
        return TLM_DB_JSON;
    }).then(function(res){
        TLM_DB_JSON = res;
        BuildFlatDB(res)
        return TLM_DB_JSON;
    });
}
function getDictionary() {
    var p = new Promise(function(res,rej){
        res(TLM_DB_JSON);
    });
    return p;
}

var objectProvider = {
    get: function (identifier) {

        var GetObj = function(identifier){
            if (identifier.key === 'spacecraft') {
                return {
                    identifier: identifier,
                    name: TLM_DB_JSON.name,
                    type: 'folder',
                    location: 'ROOT',
                    children: TLM_DB_JSON.children
                };
            }
            else{
                var measurement = FLAT_DB[identifier.key];
                measurement['identifier'] = identifier;

                if (measurement.type == 'folder')
                {

                }
                else{
                    measurement.telemetry = {
                        values: measurement.values
                    }

                    if(measurement.properites.limits)
                    {
                        measurement.limitEvaluator = {
                            evaluate:function (a){
                                if(FLAT_DB[a.id].properites.limits.rh && a.value >= FLAT_DB[a.id].properites.limits.rh)
                                {
                                    return {cssClass: "s-limit-upr s-limit-red",
                                    name: "Red High"}
                                }
                                if(FLAT_DB[a.id].properites.limits.rl && a.value <= FLAT_DB[a.id].properites.limits.rl)
                                {
                                    return {cssClass: "s-limit-lwr s-limit-red",
                                    name: "Red Low"}
                                }
                                if(FLAT_DB[a.id].properites.limits.yh && a.value >= FLAT_DB[a.id].properites.limits.yh)
                                {
                                    return {cssClass: "s-limit-upr s-limit-yellow",
                                    name: "Yellow High"}
                                }
                                if(FLAT_DB[a.id].properites.limits.yl && a.value <= FLAT_DB[a.id].properites.limits.yl)
                                {
                                    return {cssClass: "s-limit-lwr s-limit-yellow",
                                    name: "Yellow Low"}
                                }

                            }}
    
                    }
    
                }

                return measurement;
            }
        }
        var p = new Promise(function(res,rej){
            var obj = GetObj(identifier)
            res(obj);
        });
        return p
    }

};

var compositionProvider = {
    appliesTo: function (domainObject) {
        return domainObject.identifier.namespace === 'example.taxonomy' &&
               domainObject.type === 'folder';
    },
    load: function (domainObject) {

        var GetObj = function(domainObject)
        {
            return domainObject.children.map(function (m) {
                return {
                    namespace: 'example.taxonomy',
                    key: m.key
                };
            });
        }
        var p = new Promise(function(res,rej){
            var obj = GetObj(domainObject)
            res(obj);
        });
        return p;
    }
};

function DictionaryPlugin() {
    return function install(openmct) {
        openmct.objects.addRoot({
            namespace: 'example.taxonomy',
            key: 'spacecraft'
        });

        openmct.objects.addProvider('example.taxonomy', objectProvider);

        openmct.composition.addProvider(compositionProvider);

        openmct.types.addType('example.telemetry', {
            name: 'Example Telemetry Point',
            description: 'Example telemetry point from our happy tutorial.',
            cssClass: 'icon-telemetry'
        });
    };
};

/*TODO Hack until they fix their limit Evaluator */
openmct.telemetry.limitEvaluator =  function () {
    if( arguments[0].limitEvaluator && typeof arguments[0].limitEvaluator.evaluate  === 'function')
    {
        return arguments[0].limitEvaluator;
    }
    else{
        return this.legacyProvider.limitEvaluator.apply(this.legacyProvider, arguments);

    }
}