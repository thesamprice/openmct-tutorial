var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class FlaskDocument {
    constructor(id, model, rev, markDeleted) {
        this._id = id;
        this._rev = rev;
        this._deleted = markDeleted;
        this.metadata = {
            category: 'domain object',
            type: model.type,
            owner: 'admin',
            name: model.name,
            created: Date.now(),
        };
        this.model = model;
    }
}
;
export default function FlaskPersistencePlugin({ path, space, }) {
    return function install(openmct) {
        openmct.objects.addProvider(space, {
            create: (key, model) => __awaiter(this, void 0, void 0, function* () {
                const document = new FlaskDocument(key, model); // 'new' is now valid
                const response = yield fetch(`${path}/${key}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(document),
                });
                return response.ok;
            }),
            update: (key, model) => __awaiter(this, void 0, void 0, function* () {
                const rev = model._rev;
                const document = new FlaskDocument(key, model, rev); // 'new' is now valid
                const response = yield fetch(`${path}/${key}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(document),
                });
                return response.ok;
            }),
            get: (key) => __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`${path}/${key}`);
                if (!response.ok) {
                    return undefined;
                }
                const document = yield response.json();
                return document.model;
            }),
            delete: (key) => __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`${path}/${key}`, {
                    method: 'DELETE',
                });
                return response.ok;
            }),
            list: () => __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`${path}/_all_docs`);
                if (!response.ok) {
                    return [];
                }
                const allDocs = yield response.json();
                return allDocs.rows.map((row) => row.id);
            }),
        });
        console.log(`Flask Persistence Plugin installed for space: ${space}`);
    };
}
export function FlaskIndicatorPlugin({ path, interval, }) {
    return function install(openmct) {
        const CONNECTED = {
            text: 'Connected',
            iconClass: 'icon-check-circle',
            statusClass: 's-status-ok',
            description: 'Connected to the domain object database.',
        };
        const DISCONNECTED = {
            text: 'Disconnected',
            iconClass: 'icon-times-circle',
            statusClass: 's-status-error',
            description: 'Unable to connect to the domain object database.',
        };
        const PENDING = {
            text: 'Checking connection...',
            iconClass: 'icon-refresh',
            statusClass: 's-status-caution',
            description: 'Connecting to the database...',
        };
        let state = PENDING;
        // Create an indicator
        const indicator = {
            getText() {
                return state.text;
            },
            getIconClass() {
                return state.iconClass;
            },
            getStatusClass() {
                return state.statusClass;
            },
            getDescription() {
                return state.description;
            },
        };
        // openmct.indicators.add(indicator);
        // Poll the Flask server
        function checkConnection() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const response = yield fetch(path);
                    if (response.ok) {
                        state = CONNECTED;
                    }
                    else {
                        state = DISCONNECTED;
                    }
                }
                catch (error) {
                    state = DISCONNECTED;
                }
            });
        }
        // Initial check and interval
        checkConnection();
        setInterval(checkConnection, interval);
    };
}
