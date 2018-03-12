function FlaskDocument(id, model, rev, markDeleted) {
    return {
        "_id": id,
        "_rev": rev,
        "_deleted": markDeleted,
        "metadata": {
            "category": "domain object",
            "type": model.type,
            "owner": "admin",
            "name": model.name,
            "created": Date.now()
        },
        "model": model
    };
}


function FlaskIndicatorCreate() {

    // Set of connection states; changing among these states will be
    // reflected in the indicator's appearance.
    // CONNECTED: Everything nominal, expect to be able to read/write.
    // DISCONNECTED: HTTP failed; maybe misconfigured, disconnected.
    // SEMICONNECTED: Connected to the database, but it reported an error.
    // PENDING: Still trying to connect, and haven't failed yet.
    var CONNECTED = {
            text: "Connected",
            glyphClass: "ok",
            description: "Connected to the domain object database."
        },
        DISCONNECTED = {
            text: "Disconnected",
            glyphClass: "err",
            description: "Unable to connect to the domain object database."
        },
        SEMICONNECTED = {
            text: "Unavailable",
            glyphClass: "caution",
            description: "Database does not exist or is unavailable."
        },
        PENDING = {
            text: "Checking connection..."
        };

    /**
     * Indicator for the current FlaskDB connection. Polls FlaskDB
     * at a regular interval (defined by bundle constants) to ensure
     * that the database is available.
     * @constructor
     * @memberof platform/persistence/Flask
     * @implements {Indicator}
     * @param $http Angular's $http service
     * @param $interval Angular's $interval service
     * @param {string} path the URL to poll to check for Flask availability
     * @param {number} interval the interval, in milliseconds, to poll at
     */
    function FlaskIndicator($http, $interval, path, interval) {
        var self = this;

        // Track the current connection state
        this.state = PENDING;

        this.$http = $http;
        this.$interval = $interval;
        this.path = path;
        this.interval = interval;


        // Callback if the HTTP request to Flask fails
        function handleError() {
            self.state = DISCONNECTED;
        }

        // Callback if the HTTP request succeeds. FlaskDB may
        // report an error, so check for that.
        function handleResponse(response) {
            var data = response.data;
            self.state = data.error ? SEMICONNECTED : CONNECTED;
        }

        // Try to connect to FlaskDB, and update the indicator.
        function updateIndicator() {
            $http.get(path).then(handleResponse, handleError);
        }

        // Update the indicator initially, and start polling.
        updateIndicator();
        $interval(updateIndicator, interval);
    }

    FlaskIndicator.prototype.getCssClass = function () {
        return "icon-database";
    };

    FlaskIndicator.prototype.getGlyphClass = function () {
        return this.state.glyphClass;
    };

    FlaskIndicator.prototype.getText = function () {
        return this.state.text;
    };

    FlaskIndicator.prototype.getDescription = function () {
        return this.state.description;
    };

    return FlaskIndicator;
}

function FlaskPersistenceProviderCreate() {

    // JSLint doesn't like dangling _'s, but FlaskDB uses these, so
    // hide this behind variables.
    var REV = "_rev",
        ID = "_id";

    /**
     * The FlaskPersistenceProvider reads and writes JSON documents
     * (more specifically, domain object models) to/from a FlaskDB
     * instance.
     * @memberof platform/persistence/Flask
     * @constructor
     * @implements {PersistenceService}
     * @param $http Angular's $http service
     * @param $interval Angular's $interval service
     * @param {string} space the name of the persistence space being served
     * @param {string} path the path to the FlaskDB instance
     */
    function FlaskPersistenceProvider($http, $q, space, path) {
        this.spaces = [space];
        this.revs = {};
        this.$q = $q;
        this.$http = $http;
        this.path = path;
    }

    // Pull out a list of document IDs from FlaskDB's
    // _all_docs response
    function getIdsFromAllDocs(allDocs) {
        return allDocs.rows.map(function (r) {
            return r.id;
        });
    }

    // Check the response to a create/update/delete request;
    // track the rev if it's valid, otherwise return false to
    // indicate that the request failed.
    FlaskPersistenceProvider.prototype.checkResponse = function (response) {
        if (response && response.ok) {
            this.revs[response.id] = response.rev;
            return response.ok;
        } else {
            return false;
        }
    };

    // Get a domain object model out of FlaskDB's response
    FlaskPersistenceProvider.prototype.getModel = function (response) {
        if (response && response.model) {
            this.revs[response[ID]] = response[REV];
            return response.model;
        } else {
            return undefined;
        }
    };

    // Issue a request using $http; get back the plain JS object
    // from the expected JSON response
    FlaskPersistenceProvider.prototype.request = function (subpath, method, value) {
        console.log(this.path)
        return this.$http({
            method: method,
            url: this.path + '/' + subpath,
            data: value
        }).then(function (response) {
            return response.data;
        }, function () {
            return undefined;
        });
    };

    // Shorthand methods for GET/PUT methods
    FlaskPersistenceProvider.prototype.get = function (subpath) {
        return this.request(subpath, "GET");
    };

    FlaskPersistenceProvider.prototype.put = function (subpath, value) {
        return this.request(subpath, "PUT", value);
    };


    FlaskPersistenceProvider.prototype.listSpaces = function () {
        return this.$q.when(this.spaces);
    };

    FlaskPersistenceProvider.prototype.listObjects = function () {
        return this.get("_all_docs").then(getIdsFromAllDocs.bind(this));
    };

    FlaskPersistenceProvider.prototype.createObject = function (space, key, value) {
        return this.put(key, new FlaskDocument(key, value))
            .then(this.checkResponse.bind(this));
    };


    FlaskPersistenceProvider.prototype.readObject = function (space, key) {
        return this.get(key).then(this.getModel.bind(this));
    };

    FlaskPersistenceProvider.prototype.updateObject = function (space, key, value) {
        var rev = this.revs[key];
        return this.put(key, new FlaskDocument(key, value, rev))
            .then(this.checkResponse.bind(this));
    };

    FlaskPersistenceProvider.prototype.deleteObject = function (space, key, value) {
        var rev = this.revs[key];
        return this.put(key, new FlaskDocument(key, value, rev, true))
            .then(this.checkResponse.bind(this));
    };

    return FlaskPersistenceProvider;
}



openmct.legacyRegistry.register("/persistenceFlask", {
    "name": "Flask Persistence",
    "description": "Adapter to read and write objects using a flask server.",
    "extensions": {
        "components": [
            {
                "provides": "persistenceService",
                "type": "provider",
                "implementation": FlaskPersistenceProviderCreate(),
                "depends": [
                    "$http",
                    "$q",
                    "PERSISTENCE_SPACE",
                    "COUCHDB_PATH"
                ]
            }
        ],
        "constants": [
            {
                "key": "PERSISTENCE_SPACE",
                "value": "mct"
            },
            {
                "key": "COUCHDB_PATH",
                "value": "/pages"
            },
            {
                "key": "COUCHDB_INDICATOR_INTERVAL",
                "value": 15000
            }
        ],
        "indicators": [
            {
                "implementation": FlaskIndicatorCreate(),
                "depends": [
                    "$http",
                    "$interval",
                    "COUCHDB_PATH",
                    "COUCHDB_INDICATOR_INTERVAL"
                ]
            }
        ]
    }
});
openmct.legacyRegistry.enable('/persistenceFlask')