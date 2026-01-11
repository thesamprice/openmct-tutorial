/**
 * OpenMCT Commanding Integration
 * 
 * Provides commanding capabilities for OpenMCT frontend including:
 * - Command form generation from RDL structures
 * - Real-time command execution and status
 * - Command history and validation feedback
 */

class CommandingPlugin {
    constructor() {
        this.commandHistory = [];
        this.activeCommands = new Map();
        this.commandDefinitions = new Map();
        this.socket = null;
        this.scheduler = null;
    }

    install(openmct) {
        this.openmct = openmct;
        this.setupSocket();
        this.loadCommandDefinitions();
        this.registerCommandObjects();
        this.registerCommandViews();
        this.registerCommandActions();
        this.initializeScheduler();
    }

    initializeScheduler() {
        if (window.CommandScheduler) {
            this.scheduler = new CommandScheduler(this);
            this.scheduler.initialize();
        }
    }

    setupSocket() {
        // Connect to the same socket.io instance used for telemetry
        this.socket = window.io ? window.io() : null;
        
        if (this.socket) {
            this.socket.on('command_status', (data) => {
                this.handleCommandStatus(data);
            });
            
            this.socket.on('command_result', (data) => {
                this.handleCommandResult(data);
            });
        }
    }

    async loadCommandDefinitions() {
        try {
            const response = await fetch('/api/commands/list');
            const definitions = await response.json();
            
            definitions.forEach(cmdDef => {
                this.commandDefinitions.set(cmdDef.name, cmdDef);
            });
            
            console.log('Loaded command definitions:', this.commandDefinitions.size);
        } catch (error) {
            console.error('Failed to load command definitions:', error);
        }
    }

    registerCommandObjects() {
        this.openmct.objects.addRoot({
            namespace: 'commanding',
            key: 'commanding'
        });

        this.openmct.objects.addProvider('commanding', {
            get: (identifier) => {
                if (identifier.key === 'commanding') {
                    return Promise.resolve({
                        identifier,
                        name: 'Commanding',
                        type: 'folder',
                        composition: Array.from(this.commandDefinitions.keys()).map(cmdName => ({
                            namespace: 'commanding',
                            key: cmdName
                        }))
                    });
                }

                const cmdDef = this.commandDefinitions.get(identifier.key);
                if (cmdDef) {
                    return Promise.resolve({
                        identifier,
                        name: cmdDef.display_name || cmdDef.name,
                        type: 'command',
                        definition: cmdDef
                    });
                }

                return Promise.reject(`Unknown command: ${identifier.key}`);
            }
        });

        this.openmct.types.addType('command', {
            name: 'Command',
            description: 'A command that can be executed',
            cssClass: 'icon-activity',
            creatable: false
        });
    }

    registerCommandViews() {
        // Command execution view
        this.openmct.objectViews.addProvider({
            key: 'command.execution',
            name: 'Command Execution',
            cssClass: 'icon-activity',
            canView: (domainObject) => domainObject.type === 'command',
            view: (domainObject) => new CommandExecutionView(domainObject, this)
        });

        // Command history view
        this.openmct.objectViews.addProvider({
            key: 'command.history',
            name: 'Command History',
            cssClass: 'icon-clock',
            canView: (domainObject) => domainObject.identifier.key === 'commanding',
            view: (domainObject) => new CommandHistoryView(this)
        });
    }

    registerCommandActions() {
        this.openmct.actions.register({
            key: 'command.execute',
            name: 'Execute Command',
            description: 'Execute this command',
            cssClass: 'icon-play',
            appliesTo: (objectPath) => {
                const domainObject = objectPath[0];
                return domainObject.type === 'command';
            },
            invoke: (objectPath) => {
                const domainObject = objectPath[0];
                this.showCommandDialog(domainObject);
            }
        });
    }

    showCommandDialog(domainObject) {
        const dialog = this.openmct.overlays.dialog({
            iconClass: 'icon-activity',
            title: `Execute ${domainObject.name}`,
            body: this.createCommandForm(domainObject.definition),
            buttons: [
                {
                    label: 'Cancel',
                    callback: () => dialog.dismiss()
                },
                {
                    label: 'Execute',
                    emphasis: true,
                    callback: () => {
                        this.executeCommand(domainObject.definition, dialog);
                    }
                }
            ]
        });
    }

    createCommandForm(cmdDef) {
        const form = document.createElement('div');
        form.className = 'command-form';

        // Command description
        if (cmdDef.description) {
            const desc = document.createElement('div');
            desc.className = 'command-description';
            desc.textContent = cmdDef.description;
            form.appendChild(desc);
        }

        // Parameters form
        const paramsContainer = document.createElement('div');
        paramsContainer.className = 'command-parameters';

        cmdDef.parameters.forEach(param => {
            const paramGroup = this.createParameterField(param);
            paramsContainer.appendChild(paramGroup);
        });

        form.appendChild(paramsContainer);

        // Validation feedback area
        const feedback = document.createElement('div');
        feedback.className = 'command-validation-feedback';
        feedback.style.display = 'none';
        form.appendChild(feedback);

        // Add real-time validation
        this.setupFormValidation(form, cmdDef);

        return form;
    }

    createParameterField(param) {
        const group = document.createElement('div');
        group.className = 'form-group';

        // Label
        const label = document.createElement('label');
        label.textContent = param.display_name || param.name;
        if (param.required) {
            label.textContent += ' *';
            label.className = 'required';
        }
        group.appendChild(label);

        // Input field based on parameter type
        let input;
        if (param.enum_info) {
            input = this.createEnumInput(param);
        } else {
            input = this.createStandardInput(param);
        }

        input.name = param.name;
        input.dataset.paramName = param.name;
        group.appendChild(input);

        // Description
        if (param.description) {
            const desc = document.createElement('small');
            desc.className = 'param-description';
            desc.textContent = param.description;
            group.appendChild(desc);
        }

        // Validation message area
        const validationMsg = document.createElement('div');
        validationMsg.className = 'validation-message';
        validationMsg.style.display = 'none';
        group.appendChild(validationMsg);

        return group;
    }

    createEnumInput(param) {
        const enumInfo = param.enum_info;
        
        if (enumInfo.is_bitmask) {
            return this.createBitmaskInput(param);
        } else {
            return this.createSelectInput(param);
        }
    }

    createSelectInput(param) {
        const select = document.createElement('select');
        select.className = 'form-control';

        // Add default option if not required
        if (!param.required) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select --';
            select.appendChild(defaultOption);
        }

        // Add enum options
        param.enum_info.values.forEach(value => {
            const option = document.createElement('option');
            option.value = value.value;
            option.textContent = value.display_name || value.name;
            
            if (value.description) {
                option.title = value.description;
            }
            
            select.appendChild(option);
        });

        return select;
    }

    createBitmaskInput(param) {
        const container = document.createElement('div');
        container.className = 'bitmask-container';

        param.enum_info.values.forEach(value => {
            if (value.value === 0) return; // Skip NONE/empty values

            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = value.value;
            checkbox.id = `${param.name}_${value.name}`;
            checkbox.dataset.flagName = value.name;

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = value.display_name || value.name;
            
            if (value.description) {
                label.title = value.description;
            }

            checkboxGroup.appendChild(checkbox);
            checkboxGroup.appendChild(label);
            container.appendChild(checkboxGroup);
        });

        return container;
    }

    createStandardInput(param) {
        const input = document.createElement('input');
        input.className = 'form-control';

        // Set input type based on parameter type
        switch (param.type) {
            case 'float':
            case 'double':
                input.type = 'number';
                input.step = 'any';
                break;
            case 'int':
            case 'uint':
                input.type = 'number';
                input.step = '1';
                break;
            case 'bool':
                input.type = 'checkbox';
                break;
            default:
                input.type = 'text';
        }

        // Set validation attributes
        if (param.validation) {
            if (param.validation.min !== undefined) {
                input.min = param.validation.min;
            }
            if (param.validation.max !== undefined) {
                input.max = param.validation.max;
            }
        }

        if (param.required) {
            input.required = true;
        }

        return input;
    }

    setupFormValidation(form, cmdDef) {
        const inputs = form.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.validateParameter(input, cmdDef, form);
            });

            input.addEventListener('input', () => {
                this.clearValidationMessage(input);
            });
        });
    }

    async validateParameter(input, cmdDef, form) {
        const paramName = input.dataset.paramName;
        const param = cmdDef.parameters.find(p => p.name === paramName);
        
        if (!param) return;

        let value = this.getInputValue(input, param);
        
        try {
            const response = await fetch('/api/commands/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: cmdDef.name,
                    parameter: paramName,
                    value: value,
                    context: this.getFormContext(form, cmdDef)
                })
            });

            const result = await response.json();
            this.displayValidationResult(input, result);
            
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    getInputValue(input, param) {
        if (param.enum_info && param.enum_info.is_bitmask) {
            // For bitmask, collect all checked values
            const container = input.closest('.bitmask-container');
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            return Array.from(checkboxes).map(cb => cb.dataset.flagName);
        } else if (input.type === 'checkbox') {
            return input.checked;
        } else if (input.type === 'number') {
            return input.value ? Number(input.value) : null;
        } else {
            return input.value || null;
        }
    }

    getFormContext(form, cmdDef) {
        const context = {};
        const inputs = form.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            const paramName = input.dataset.paramName;
            if (paramName) {
                const param = cmdDef.parameters.find(p => p.name === paramName);
                context[paramName] = this.getInputValue(input, param);
            }
        });

        return context;
    }

    displayValidationResult(input, result) {
        const group = input.closest('.form-group');
        const validationMsg = group.querySelector('.validation-message');

        if (result.valid) {
            input.classList.remove('invalid');
            input.classList.add('valid');
            validationMsg.style.display = 'none';
        } else {
            input.classList.remove('valid');
            input.classList.add('invalid');
            validationMsg.textContent = result.errors.join(', ');
            validationMsg.style.display = 'block';
            
            // Show suggestions if available
            if (result.suggestions && result.suggestions.length > 0) {
                const suggestions = document.createElement('div');
                suggestions.className = 'validation-suggestions';
                suggestions.textContent = 'Suggestions: ' + result.suggestions.join(', ');
                validationMsg.appendChild(suggestions);
            }
        }
    }

    clearValidationMessage(input) {
        input.classList.remove('valid', 'invalid');
        const group = input.closest('.form-group');
        const validationMsg = group.querySelector('.validation-message');
        validationMsg.style.display = 'none';
    }

    async executeCommand(cmdDef, dialog) {
        const form = dialog.element.querySelector('.command-form');
        const parameters = this.getFormContext(form, cmdDef);

        try {
            const response = await fetch('/api/commands/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: cmdDef.name,
                    parameters: parameters
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.commandHistory.unshift({
                    command: cmdDef.name,
                    parameters: parameters,
                    timestamp: new Date(),
                    status: 'executed',
                    id: result.command_id
                });

                this.openmct.notifications.info(`Command ${cmdDef.name} executed successfully`);
                dialog.dismiss();
            } else {
                this.displayExecutionError(form, result.errors);
            }

        } catch (error) {
            console.error('Command execution error:', error);
            this.openmct.notifications.error(`Failed to execute command: ${error.message}`);
        }
    }

    displayExecutionError(form, errors) {
        const feedback = form.querySelector('.command-validation-feedback');
        feedback.innerHTML = '';
        feedback.style.display = 'block';

        errors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-error';
            errorDiv.textContent = error;
            feedback.appendChild(errorDiv);
        });
    }

    handleCommandStatus(data) {
        const historyEntry = this.commandHistory.find(entry => entry.id === data.command_id);
        if (historyEntry) {
            historyEntry.status = data.status;
            historyEntry.progress = data.progress;
        }

        // Emit event for command history view to update
        this.openmct.objects.eventEmitter.emit('command_status_update', data);
    }

    handleCommandResult(data) {
        const historyEntry = this.commandHistory.find(entry => entry.id === data.command_id);
        if (historyEntry) {
            historyEntry.status = data.success ? 'completed' : 'failed';
            historyEntry.result = data;
            historyEntry.completed_at = new Date();
        }

        if (data.success) {
            this.openmct.notifications.info(`Command completed: ${data.message}`);
        } else {
            this.openmct.notifications.error(`Command failed: ${data.message}`);
        }

        // Emit event for command history view to update
        this.openmct.objects.eventEmitter.emit('command_result', data);
    }

    getCommandHistory() {
        return [...this.commandHistory];
    }
}

class CommandExecutionView {
    constructor(domainObject, commandingPlugin) {
        this.domainObject = domainObject;
        this.commandingPlugin = commandingPlugin;
    }

    show(element) {
        this.element = element;
        this.render();
    }

    render() {
        const cmdDef = this.domainObject.definition;
        
        this.element.innerHTML = `
            <div class="command-execution-view">
                <div class="command-header">
                    <h2>${cmdDef.display_name || cmdDef.name}</h2>
                    <div class="command-info">
                        <p><strong>Description:</strong> ${cmdDef.description || 'No description available'}</p>
                        <p><strong>Parameters:</strong> ${cmdDef.parameters.length}</p>
                    </div>
                </div>
                
                <div class="command-parameters-list">
                    <h3>Parameters</h3>
                    ${this.renderParametersList(cmdDef.parameters)}
                </div>
                
                <div class="command-actions">
                    <button class="btn btn-primary execute-command">
                        <span class="icon icon-play"></span>
                        Execute Command
                    </button>
                </div>
            </div>
        `;

        // Bind execute button
        const executeBtn = this.element.querySelector('.execute-command');
        executeBtn.addEventListener('click', () => {
            this.commandingPlugin.showCommandDialog(this.domainObject);
        });
    }

    renderParametersList(parameters) {
        return parameters.map(param => `
            <div class="parameter-info">
                <div class="param-name">${param.display_name || param.name}</div>
                <div class="param-type">${this.getParameterTypeDisplay(param)}</div>
                <div class="param-description">${param.description || ''}</div>
            </div>
        `).join('');
    }

    getParameterTypeDisplay(param) {
        if (param.enum_info) {
            return param.enum_info.is_bitmask ? 'Bitmask Enum' : 'Enum';
        }
        return param.type || 'Unknown';
    }

    destroy() {
        // Cleanup if needed
    }
}

class CommandHistoryView {
    constructor(commandingPlugin) {
        this.commandingPlugin = commandingPlugin;
        this.updateInterval = null;
    }

    show(element) {
        this.element = element;
        this.render();
        this.startUpdating();
    }

    render() {
        this.element.innerHTML = `
            <div class="command-history-view">
                <div class="history-header">
                    <h2>Command History</h2>
                    <div class="history-controls">
                        <button class="btn btn-secondary clear-history">Clear History</button>
                    </div>
                </div>
                <div class="history-list"></div>
            </div>
        `;

        // Bind clear button
        const clearBtn = this.element.querySelector('.clear-history');
        clearBtn.addEventListener('click', () => {
            this.commandingPlugin.commandHistory.length = 0;
            this.updateHistoryList();
        });

        this.updateHistoryList();
    }

    updateHistoryList() {
        const historyList = this.element.querySelector('.history-list');
        const history = this.commandingPlugin.getCommandHistory();

        if (history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No commands executed yet</div>';
            return;
        }

        historyList.innerHTML = history.map(entry => `
            <div class="history-entry ${entry.status}">
                <div class="entry-header">
                    <span class="command-name">${entry.command}</span>
                    <span class="status-badge ${entry.status}">${entry.status}</span>
                    <span class="timestamp">${entry.timestamp.toLocaleString()}</span>
                </div>
                <div class="entry-details">
                    <div class="parameters">
                        ${Object.entries(entry.parameters).map(([key, value]) => 
                            `<span class="param">${key}: ${JSON.stringify(value)}</span>`
                        ).join(', ')}
                    </div>
                    ${entry.result ? `
                        <div class="result">
                            <strong>Result:</strong> ${entry.result.message || 'No message'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    startUpdating() {
        this.updateInterval = setInterval(() => {
            this.updateHistoryList();
        }, 1000);

        // Listen for command updates
        this.commandingPlugin.openmct.objects.eventEmitter.on('command_status_update', () => {
            this.updateHistoryList();
        });

        this.commandingPlugin.openmct.objects.eventEmitter.on('command_result', () => {
            this.updateHistoryList();
        });
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Export the plugin
window.CommandingPlugin = CommandingPlugin;