type FlaskPluginOptions = {
    path: string;
    space: string;
};

type FlaskIndicatorOptions = {
    path: string;
    interval: number;
};
class FlaskDocument {
    _id: string;
    _rev?: string;
    _deleted?: boolean;
    metadata: {
        category: string;
        type: string;
        owner: string;
        name: string;
        created: number;
    };
    model: any;

    constructor(id: string, model: any, rev?: string, markDeleted?: boolean) {
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
};


export default function FlaskPersistencePlugin({
    path,
    space,
}: FlaskPluginOptions) {
    return function install(openmct: any) {
        openmct.objects.addProvider(space, {
            create: async (key: string, model: any) => {
                const document = new FlaskDocument(key, model); // 'new' is now valid
                const response = await fetch(`${path}/${key}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(document),
                });
                return response.ok;
            },
            update: async (key: string, model: any) => {
                const rev = model._rev;
                const document = new FlaskDocument(key, model, rev); // 'new' is now valid
                const response = await fetch(`${path}/${key}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(document),
                });
                return response.ok;
            },
            get: async (key: string) => {
                const response = await fetch(`${path}/${key}`);
                if (!response.ok) {
                    return undefined;
                }
                const document = await response.json();
                return document.model;
            },
            delete: async (key: string) => {
                const response = await fetch(`${path}/${key}`, {
                    method: 'DELETE',
                });
                return response.ok;
            },
            list: async () => {
                const response = await fetch(`${path}/_all_docs`);
                if (!response.ok) {
                    return [];
                }
                const allDocs = await response.json();
                return allDocs.rows.map((row: any) => row.id);
            },
        });

        console.log(`Flask Persistence Plugin installed for space: ${space}`);
    };
}



export function FlaskIndicatorPlugin({
    path,
    interval,
}: FlaskIndicatorOptions) {
    return function install(openmct: any) {
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
        async function checkConnection() {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    state = CONNECTED;
                } else {
                    state = DISCONNECTED;
                }
            } catch (error) {
                state = DISCONNECTED;
            }
        }

        // Initial check and interval
        checkConnection();
        setInterval(checkConnection, interval);
    };
}
