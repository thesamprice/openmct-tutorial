/**
 * Command Scheduler Extension for OpenMCT Commanding
 * 
 * Provides command scheduling and queuing capabilities including:
 * - Command queue management with priority handling
 * - Time-based command scheduling
 * - Conditional command execution
 * - Batch command operations
 */

class CommandScheduler {
    constructor(commandingPlugin) {
        this.commandingPlugin = commandingPlugin;
        this.commandQueue = [];
        this.scheduledCommands = new Map();
        this.queueProcessor = null;
        this.isProcessing = false;
        this.processingDelay = 1000; // 1 second between commands
    }

    initialize() {
        this.startQueueProcessor();
        this.registerSchedulerViews();
        this.registerSchedulerActions();
    }

    registerSchedulerViews() {
        // Command Queue view
        this.commandingPlugin.openmct.objectViews.addProvider({
            key: 'command.queue',
            name: 'Command Queue',
            cssClass: 'icon-list',
            canView: (domainObject) => domainObject.identifier.key === 'commanding',
            view: (domainObject) => new CommandQueueView(this)
        });

        // Command Scheduler view
        this.commandingPlugin.openmct.objectViews.addProvider({
            key: 'command.scheduler',
            name: 'Command Scheduler',
            cssClass: 'icon-clock',
            canView: (domainObject) => domainObject.identifier.key === 'commanding',
            view: (domainObject) => new CommandSchedulerView(this)
        });
    }

    registerSchedulerActions() {
        // Schedule command action
        this.commandingPlugin.openmct.actions.register({
            key: 'command.schedule',
            name: 'Schedule Command',
            description: 'Schedule this command for later execution',
            cssClass: 'icon-clock',
            appliesTo: (objectPath) => {
                const domainObject = objectPath[0];
                return domainObject.type === 'command';
            },
            invoke: (objectPath) => {
                const domainObject = objectPath[0];
                this.showScheduleDialog(domainObject);
            }
        });

        // Add to queue action
        this.commandingPlugin.openmct.actions.register({
            key: 'command.queue',
            name: 'Add to Queue',
            description: 'Add this command to the execution queue',
            cssClass: 'icon-list',
            appliesTo: (objectPath) => {
                const domainObject = objectPath[0];
                return domainObject.type === 'command';
            },
            invoke: (objectPath) => {
                const domainObject = objectPath[0];
                this.showQueueDialog(domainObject);
            }
        });
    }

    showScheduleDialog(domainObject) {
        const dialog = this.commandingPlugin.openmct.overlays.dialog({
            iconClass: 'icon-clock',
            title: `Schedule ${domainObject.name}`,
            body: this.createScheduleForm(domainObject.definition),
            buttons: [
                {
                    label: 'Cancel',
                    callback: () => dialog.dismiss()
                },
                {
                    label: 'Schedule',
                    emphasis: true,
                    callback: () => {
                        this.scheduleCommandFromForm(domainObject.definition, dialog);
                    }
                }
            ]
        });
    }

    showQueueDialog(domainObject) {
        const dialog = this.commandingPlugin.openmct.overlays.dialog({
            iconClass: 'icon-list',
            title: `Queue ${domainObject.name}`,
            body: this.createQueueForm(domainObject.definition),
            buttons: [
                {
                    label: 'Cancel',
                    callback: () => dialog.dismiss()
                },
                {
                    label: 'Add to Queue',
                    emphasis: true,
                    callback: () => {
                        this.queueCommandFromForm(domainObject.definition, dialog);
                    }
                }
            ]
        });
    }

    createScheduleForm(cmdDef) {
        const form = document.createElement('div');
        form.className = 'schedule-form';

        form.innerHTML = `
            <div class="form-section">
                <h3>Command Parameters</h3>
                <div class="command-parameters"></div>
            </div>
            
            <div class="form-section">
                <h3>Scheduling Options</h3>
                
                <div class="form-group">
                    <label for="schedule-type">Schedule Type</label>
                    <select id="schedule-type" class="form-control">
                        <option value="immediate">Execute Immediately</option>
                        <option value="delay">Execute After Delay</option>
                        <option value="absolute">Execute at Specific Time</option>
                        <option value="condition">Execute When Condition Met</option>
                    </select>
                </div>
                
                <div class="schedule-options">
                    <div class="delay-options" style="display: none;">
                        <div class="form-group">
                            <label for="delay-amount">Delay Amount</label>
                            <input type="number" id="delay-amount" class="form-control" min="1" value="60">
                        </div>
                        <div class="form-group">
                            <label for="delay-unit">Delay Unit</label>
                            <select id="delay-unit" class="form-control">
                                <option value="seconds">Seconds</option>
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="absolute-options" style="display: none;">
                        <div class="form-group">
                            <label for="execution-time">Execution Time</label>
                            <input type="datetime-local" id="execution-time" class="form-control">
                        </div>
                    </div>
                    
                    <div class="condition-options" style="display: none;">
                        <div class="form-group">
                            <label for="condition-type">Condition Type</label>
                            <select id="condition-type" class="form-control">
                                <option value="telemetry">Telemetry Value</option>
                                <option value="command">After Command Completion</option>
                                <option value="time">Time Window</option>
                            </select>
                        </div>
                        <div class="condition-details">
                            <!-- Populated based on condition type -->
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="execution-priority">Execution Priority</label>
                    <select id="execution-priority" class="form-control">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="max-retries">Max Retries on Failure</label>
                    <input type="number" id="max-retries" class="form-control" min="0" max="5" value="0">
                </div>
            </div>
        `;

        // Add command parameters
        const paramsContainer = form.querySelector('.command-parameters');
        const commandForm = this.commandingPlugin.createCommandForm(cmdDef);
        paramsContainer.appendChild(commandForm);

        // Setup schedule type change handler
        const scheduleType = form.querySelector('#schedule-type');
        scheduleType.addEventListener('change', () => {
            this.updateScheduleOptions(form, scheduleType.value);
        });

        return form;
    }

    createQueueForm(cmdDef) {
        const form = document.createElement('div');
        form.className = 'queue-form';

        form.innerHTML = `
            <div class="form-section">
                <h3>Command Parameters</h3>
                <div class="command-parameters"></div>
            </div>
            
            <div class="form-section">
                <h3>Queue Options</h3>
                
                <div class="form-group">
                    <label for="queue-priority">Queue Priority</label>
                    <select id="queue-priority" class="form-control">
                        <option value="1">Low (1)</option>
                        <option value="5" selected>Normal (5)</option>
                        <option value="8">High (8)</option>
                        <option value="10">Critical (10)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="queue-position">Queue Position</label>
                    <select id="queue-position" class="form-control">
                        <option value="end" selected>Add to End</option>
                        <option value="priority">Insert by Priority</option>
                        <option value="beginning">Add to Beginning</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="auto-execute"> 
                        Auto-execute when queue is processed
                    </label>
                </div>
            </div>
        `;

        // Add command parameters
        const paramsContainer = form.querySelector('.command-parameters');
        const commandForm = this.commandingPlugin.createCommandForm(cmdDef);
        paramsContainer.appendChild(commandForm);

        return form;
    }

    updateScheduleOptions(form, scheduleType) {
        const options = form.querySelectorAll('.delay-options, .absolute-options, .condition-options');
        options.forEach(option => option.style.display = 'none');

        switch (scheduleType) {
            case 'delay':
                form.querySelector('.delay-options').style.display = 'block';
                break;
            case 'absolute':
                form.querySelector('.absolute-options').style.display = 'block';
                // Set minimum time to current time
                const now = new Date();
                const timeInput = form.querySelector('#execution-time');
                timeInput.min = now.toISOString().slice(0, 16);
                timeInput.value = new Date(now.getTime() + 60000).toISOString().slice(0, 16);
                break;
            case 'condition':
                form.querySelector('.condition-options').style.display = 'block';
                break;
        }
    }

    scheduleCommandFromForm(cmdDef, dialog) {
        const form = dialog.element.querySelector('.schedule-form');
        const scheduleType = form.querySelector('#schedule-type').value;
        const priority = form.querySelector('#execution-priority').value;
        const maxRetries = parseInt(form.querySelector('#max-retries').value);
        
        const parameters = this.commandingPlugin.getFormContext(
            form.querySelector('.command-parameters'), 
            cmdDef
        );

        let executionTime = new Date();
        
        switch (scheduleType) {
            case 'delay':
                const delayAmount = parseInt(form.querySelector('#delay-amount').value);
                const delayUnit = form.querySelector('#delay-unit').value;
                const delayMs = this.convertDelayToMs(delayAmount, delayUnit);
                executionTime = new Date(Date.now() + delayMs);
                break;
            case 'absolute':
                executionTime = new Date(form.querySelector('#execution-time').value);
                break;
            case 'condition':
                // Handle conditional execution
                const conditionType = form.querySelector('#condition-type').value;
                this.scheduleConditionalCommand(cmdDef, parameters, conditionType, priority, maxRetries);
                dialog.dismiss();
                return;
        }

        const scheduledCommand = {
            id: this.generateCommandId(),
            command: cmdDef.name,
            parameters: parameters,
            executionTime: executionTime,
            priority: priority,
            maxRetries: maxRetries,
            retryCount: 0,
            status: 'scheduled',
            createdAt: new Date()
        };

        this.scheduledCommands.set(scheduledCommand.id, scheduledCommand);
        
        this.commandingPlugin.openmct.notifications.info(
            `Command ${cmdDef.name} scheduled for ${executionTime.toLocaleString()}`
        );
        
        dialog.dismiss();
    }

    queueCommandFromForm(cmdDef, dialog) {
        const form = dialog.element.querySelector('.queue-form');
        const priority = parseInt(form.querySelector('#queue-priority').value);
        const position = form.querySelector('#queue-position').value;
        const autoExecute = form.querySelector('#auto-execute').checked;
        
        const parameters = this.commandingPlugin.getFormContext(
            form.querySelector('.command-parameters'), 
            cmdDef
        );

        const queuedCommand = {
            id: this.generateCommandId(),
            command: cmdDef.name,
            parameters: parameters,
            priority: priority,
            autoExecute: autoExecute,
            status: 'queued',
            createdAt: new Date()
        };

        this.addToQueue(queuedCommand, position);
        
        this.commandingPlugin.openmct.notifications.info(
            `Command ${cmdDef.name} added to queue`
        );
        
        dialog.dismiss();
    }

    addToQueue(command, position) {
        switch (position) {
            case 'beginning':
                this.commandQueue.unshift(command);
                break;
            case 'priority':
                // Insert based on priority (higher priority = lower index)
                let insertIndex = this.commandQueue.findIndex(cmd => cmd.priority < command.priority);
                if (insertIndex === -1) {
                    insertIndex = this.commandQueue.length;
                }
                this.commandQueue.splice(insertIndex, 0, command);
                break;
            case 'end':
            default:
                this.commandQueue.push(command);
                break;
        }

        // Emit queue update event
        this.commandingPlugin.openmct.objects.eventEmitter.emit('command_queue_update', {
            action: 'add',
            command: command,
            queueSize: this.commandQueue.length
        });
    }

    removeFromQueue(commandId) {
        const index = this.commandQueue.findIndex(cmd => cmd.id === commandId);
        if (index !== -1) {
            const removed = this.commandQueue.splice(index, 1)[0];
            
            this.commandingPlugin.openmct.objects.eventEmitter.emit('command_queue_update', {
                action: 'remove',
                command: removed,
                queueSize: this.commandQueue.length
            });
            
            return removed;
        }
        return null;
    }

    startQueueProcessor() {
        if (this.queueProcessor) {
            clearInterval(this.queueProcessor);
        }

        this.queueProcessor = setInterval(() => {
            this.processQueues();
        }, this.processingDelay);
    }

    async processQueues() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Process scheduled commands
            await this.processScheduledCommands();
            
            // Process command queue
            await this.processCommandQueue();
        } finally {
            this.isProcessing = false;
        }
    }

    async processScheduledCommands() {
        const now = new Date();
        const readyCommands = Array.from(this.scheduledCommands.values())
            .filter(cmd => cmd.status === 'scheduled' && cmd.executionTime <= now)
            .sort((a, b) => a.executionTime - b.executionTime);

        for (const command of readyCommands) {
            try {
                await this.executeScheduledCommand(command);
            } catch (error) {
                console.error('Error executing scheduled command:', error);
                this.handleCommandError(command, error);
            }
        }
    }

    async processCommandQueue() {
        if (this.commandQueue.length === 0) return;

        // Get the highest priority command that should auto-execute
        const nextCommand = this.commandQueue.find(cmd => cmd.autoExecute);
        if (!nextCommand) return;

        try {
            await this.executeQueuedCommand(nextCommand);
        } catch (error) {
            console.error('Error executing queued command:', error);
            this.handleCommandError(nextCommand, error);
        }
    }

    async executeScheduledCommand(command) {
        command.status = 'executing';
        
        const result = await this.commandingPlugin.executeCommand({
            name: command.command,
            parameters: this.getCommandParameterDefinitions(command.command)
        }, null, command.parameters);

        if (result.success) {
            command.status = 'completed';
            command.completedAt = new Date();
            this.scheduledCommands.delete(command.id);
        } else {
            this.handleCommandFailure(command, result);
        }
    }

    async executeQueuedCommand(command) {
        command.status = 'executing';
        
        // Remove from queue
        this.removeFromQueue(command.id);
        
        const result = await this.commandingPlugin.executeCommand({
            name: command.command,
            parameters: this.getCommandParameterDefinitions(command.command)
        }, null, command.parameters);

        if (result.success) {
            command.status = 'completed';
            command.completedAt = new Date();
        } else {
            this.handleCommandFailure(command, result);
        }
    }

    handleCommandFailure(command, result) {
        command.retryCount = (command.retryCount || 0) + 1;
        
        if (command.retryCount < command.maxRetries) {
            command.status = 'retrying';
            // Re-schedule for retry (add small delay)
            if (command.executionTime) {
                command.executionTime = new Date(Date.now() + 5000); // 5 second delay
            } else {
                // Re-add to queue for retry
                this.addToQueue(command, 'beginning');
            }
        } else {
            command.status = 'failed';
            command.failureReason = result.errors ? result.errors.join(', ') : 'Unknown error';
            command.completedAt = new Date();
            
            this.commandingPlugin.openmct.notifications.error(
                `Command ${command.command} failed after ${command.retryCount} attempts`
            );
        }
    }

    handleCommandError(command, error) {
        command.status = 'error';
        command.errorMessage = error.message;
        command.completedAt = new Date();
        
        this.commandingPlugin.openmct.notifications.error(
            `Command ${command.command} encountered an error: ${error.message}`
        );
    }

    convertDelayToMs(amount, unit) {
        const multipliers = {
            seconds: 1000,
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000
        };
        return amount * (multipliers[unit] || 1000);
    }

    generateCommandId() {
        return 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getCommandParameterDefinitions(commandName) {
        const cmdDef = this.commandingPlugin.commandDefinitions.get(commandName);
        return cmdDef ? cmdDef.parameters : [];
    }

    getQueueStatus() {
        return {
            queueSize: this.commandQueue.length,
            scheduledCount: this.scheduledCommands.size,
            isProcessing: this.isProcessing,
            nextExecution: this.getNextExecutionTime()
        };
    }

    getNextExecutionTime() {
        const nextScheduled = Array.from(this.scheduledCommands.values())
            .filter(cmd => cmd.status === 'scheduled')
            .sort((a, b) => a.executionTime - b.executionTime)[0];

        return nextScheduled ? nextScheduled.executionTime : null;
    }

    clearQueue() {
        this.commandQueue.length = 0;
        this.commandingPlugin.openmct.objects.eventEmitter.emit('command_queue_update', {
            action: 'clear',
            queueSize: 0
        });
    }

    clearScheduled() {
        const scheduledCount = this.scheduledCommands.size;
        this.scheduledCommands.clear();
        this.commandingPlugin.openmct.notifications.info(
            `Cleared ${scheduledCount} scheduled commands`
        );
    }
}

// Export for use by the commanding plugin
window.CommandScheduler = CommandScheduler;