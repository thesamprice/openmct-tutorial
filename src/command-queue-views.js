/**
 * Command Queue and Scheduler Views for OpenMCT
 * 
 * Provides visual interfaces for managing command queues and scheduling
 */

class CommandQueueView {
    constructor(commandScheduler) {
        this.commandScheduler = commandScheduler;
        this.updateInterval = null;
    }

    show(element) {
        this.element = element;
        this.render();
        this.startUpdating();
    }

    render() {
        this.element.innerHTML = `
            <div class="command-queue-view">
                <div class="queue-header">
                    <h2>Command Queue</h2>
                    <div class="queue-status">
                        <span class="queue-size">Queue: 0 commands</span>
                        <span class="processing-status">Idle</span>
                    </div>
                    <div class="queue-controls">
                        <button class="btn btn-secondary pause-queue">
                            <span class="icon icon-pause"></span>
                            Pause Queue
                        </button>
                        <button class="btn btn-warning clear-queue">
                            <span class="icon icon-trash"></span>
                            Clear Queue
                        </button>
                    </div>
                </div>
                
                <div class="queue-content">
                    <div class="queue-list"></div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.updateQueueDisplay();
    }

    bindEvents() {
        const pauseBtn = this.element.querySelector('.pause-queue');
        const clearBtn = this.element.querySelector('.clear-queue');

        pauseBtn.addEventListener('click', () => {
            this.toggleQueueProcessing();
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the entire queue?')) {
                this.commandScheduler.clearQueue();
            }
        });

        // Listen for queue updates
        this.commandScheduler.commandingPlugin.openmct.objects.eventEmitter.on('command_queue_update', () => {
            this.updateQueueDisplay();
        });
    }

    updateQueueDisplay() {
        const status = this.commandScheduler.getQueueStatus();
        const queueList = this.element.querySelector('.queue-list');
        
        // Update status display
        this.element.querySelector('.queue-size').textContent = `Queue: ${status.queueSize} commands`;
        this.element.querySelector('.processing-status').textContent = status.isProcessing ? 'Processing' : 'Idle';

        // Update queue list
        if (this.commandScheduler.commandQueue.length === 0) {
            queueList.innerHTML = '<div class="no-commands">No commands in queue</div>';
            return;
        }

        queueList.innerHTML = this.commandScheduler.commandQueue.map((command, index) => `
            <div class="queue-item ${command.status}" data-command-id="${command.id}">
                <div class="item-header">
                    <div class="item-info">
                        <span class="queue-position">#${index + 1}</span>
                        <span class="command-name">${command.command}</span>
                        <span class="priority-badge priority-${command.priority}">
                            Priority: ${command.priority}
                        </span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                            <span class="icon icon-arrow-up"></span>
                        </button>
                        <button class="btn-icon move-down" title="Move Down" ${index === this.commandScheduler.commandQueue.length - 1 ? 'disabled' : ''}>
                            <span class="icon icon-arrow-down"></span>
                        </button>
                        <button class="btn-icon remove" title="Remove">
                            <span class="icon icon-trash"></span>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="parameters">
                        ${Object.entries(command.parameters).map(([key, value]) => 
                            `<span class="param">${key}: ${JSON.stringify(value)}</span>`
                        ).join(', ')}
                    </div>
                    <div class="metadata">
                        <span class="created-at">Created: ${command.createdAt.toLocaleString()}</span>
                        <span class="auto-execute ${command.autoExecute ? 'enabled' : 'disabled'}">
                            Auto-execute: ${command.autoExecute ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind item actions
        this.bindItemActions();
    }

    bindItemActions() {
        const queueItems = this.element.querySelectorAll('.queue-item');
        
        queueItems.forEach((item, index) => {
            const commandId = item.dataset.commandId;
            
            // Move up button
            const moveUpBtn = item.querySelector('.move-up');
            if (moveUpBtn && !moveUpBtn.disabled) {
                moveUpBtn.addEventListener('click', () => {
                    this.moveCommand(index, index - 1);
                });
            }
            
            // Move down button
            const moveDownBtn = item.querySelector('.move-down');
            if (moveDownBtn && !moveDownBtn.disabled) {
                moveDownBtn.addEventListener('click', () => {
                    this.moveCommand(index, index + 1);
                });
            }
            
            // Remove button
            const removeBtn = item.querySelector('.remove');
            removeBtn.addEventListener('click', () => {
                if (confirm(`Remove command ${this.commandScheduler.commandQueue[index].command} from queue?`)) {
                    this.commandScheduler.removeFromQueue(commandId);
                }
            });
        });
    }

    moveCommand(fromIndex, toIndex) {
        const queue = this.commandScheduler.commandQueue;
        if (toIndex >= 0 && toIndex < queue.length) {
            const command = queue.splice(fromIndex, 1)[0];
            queue.splice(toIndex, 0, command);
            this.updateQueueDisplay();
        }
    }

    toggleQueueProcessing() {
        const pauseBtn = this.element.querySelector('.pause-queue');
        const icon = pauseBtn.querySelector('.icon');
        
        if (this.commandScheduler.queueProcessor) {
            clearInterval(this.commandScheduler.queueProcessor);
            this.commandScheduler.queueProcessor = null;
            pauseBtn.innerHTML = '<span class="icon icon-play"></span> Resume Queue';
            icon.className = 'icon icon-play';
        } else {
            this.commandScheduler.startQueueProcessor();
            pauseBtn.innerHTML = '<span class="icon icon-pause"></span> Pause Queue';
            icon.className = 'icon icon-pause';
        }
    }

    startUpdating() {
        this.updateInterval = setInterval(() => {
            this.updateQueueDisplay();
        }, 2000);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

class CommandSchedulerView {
    constructor(commandScheduler) {
        this.commandScheduler = commandScheduler;
        this.updateInterval = null;
    }

    show(element) {
        this.element = element;
        this.render();
        this.startUpdating();
    }

    render() {
        this.element.innerHTML = `
            <div class="command-scheduler-view">
                <div class="scheduler-header">
                    <h2>Command Scheduler</h2>
                    <div class="scheduler-status">
                        <span class="scheduled-count">Scheduled: 0 commands</span>
                        <span class="next-execution">Next: None</span>
                    </div>
                    <div class="scheduler-controls">
                        <button class="btn btn-warning clear-scheduled">
                            <span class="icon icon-trash"></span>
                            Clear All Scheduled
                        </button>
                    </div>
                </div>
                
                <div class="scheduler-content">
                    <div class="time-filter">
                        <label for="time-range">Show commands for:</label>
                        <select id="time-range" class="form-control">
                            <option value="24">Next 24 hours</option>
                            <option value="168">Next week</option>
                            <option value="720">Next month</option>
                            <option value="all">All scheduled</option>
                        </select>
                    </div>
                    
                    <div class="scheduled-list"></div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.updateScheduledDisplay();
    }

    bindEvents() {
        const clearBtn = this.element.querySelector('.clear-scheduled');
        const timeFilter = this.element.querySelector('#time-range');

        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all scheduled commands?')) {
                this.commandScheduler.clearScheduled();
                this.updateScheduledDisplay();
            }
        });

        timeFilter.addEventListener('change', () => {
            this.updateScheduledDisplay();
        });
    }

    updateScheduledDisplay() {
        const status = this.commandScheduler.getQueueStatus();
        const scheduledList = this.element.querySelector('.scheduled-list');
        const timeRange = this.element.querySelector('#time-range').value;
        
        // Update status display
        this.element.querySelector('.scheduled-count').textContent = `Scheduled: ${status.scheduledCount} commands`;
        
        const nextExecution = status.nextExecution;
        this.element.querySelector('.next-execution').textContent = 
            nextExecution ? `Next: ${nextExecution.toLocaleString()}` : 'Next: None';

        // Filter scheduled commands by time range
        const now = new Date();
        const maxTime = timeRange === 'all' ? null : new Date(now.getTime() + (parseInt(timeRange) * 60 * 60 * 1000));
        
        const filteredCommands = Array.from(this.commandScheduler.scheduledCommands.values())
            .filter(command => {
                if (maxTime && command.executionTime > maxTime) return false;
                return true;
            })
            .sort((a, b) => a.executionTime - b.executionTime);

        if (filteredCommands.length === 0) {
            scheduledList.innerHTML = '<div class="no-commands">No scheduled commands</div>';
            return;
        }

        scheduledList.innerHTML = filteredCommands.map(command => `
            <div class="scheduled-item ${command.status}" data-command-id="${command.id}">
                <div class="item-header">
                    <div class="item-info">
                        <span class="command-name">${command.command}</span>
                        <span class="execution-time">${command.executionTime.toLocaleString()}</span>
                        <span class="status-badge ${command.status}">${command.status}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon edit" title="Edit">
                            <span class="icon icon-pencil"></span>
                        </button>
                        <button class="btn-icon cancel" title="Cancel">
                            <span class="icon icon-x"></span>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="parameters">
                        ${Object.entries(command.parameters).map(([key, value]) => 
                            `<span class="param">${key}: ${JSON.stringify(value)}</span>`
                        ).join(', ')}
                    </div>
                    <div class="metadata">
                        <span class="priority">Priority: ${command.priority}</span>
                        <span class="retries">Max Retries: ${command.maxRetries}</span>
                        <span class="created-at">Created: ${command.createdAt.toLocaleString()}</span>
                        ${command.retryCount > 0 ? `<span class="retry-count">Retry Count: ${command.retryCount}</span>` : ''}
                    </div>
                    ${this.getTimeUntilExecution(command.executionTime)}
                </div>
            </div>
        `).join('');

        // Bind item actions
        this.bindScheduledItemActions();
    }

    bindScheduledItemActions() {
        const scheduledItems = this.element.querySelectorAll('.scheduled-item');
        
        scheduledItems.forEach(item => {
            const commandId = item.dataset.commandId;
            
            // Edit button
            const editBtn = item.querySelector('.edit');
            editBtn.addEventListener('click', () => {
                this.editScheduledCommand(commandId);
            });
            
            // Cancel button
            const cancelBtn = item.querySelector('.cancel');
            cancelBtn.addEventListener('click', () => {
                if (confirm('Cancel this scheduled command?')) {
                    this.commandScheduler.scheduledCommands.delete(commandId);
                    this.updateScheduledDisplay();
                }
            });
        });
    }

    editScheduledCommand(commandId) {
        const command = this.commandScheduler.scheduledCommands.get(commandId);
        if (!command) return;

        // Create a simple edit dialog
        const dialog = this.commandScheduler.commandingPlugin.openmct.overlays.dialog({
            iconClass: 'icon-pencil',
            title: `Edit Scheduled Command: ${command.command}`,
            body: this.createEditForm(command),
            buttons: [
                {
                    label: 'Cancel',
                    callback: () => dialog.dismiss()
                },
                {
                    label: 'Update',
                    emphasis: true,
                    callback: () => {
                        this.updateScheduledCommand(command, dialog);
                    }
                }
            ]
        });
    }

    createEditForm(command) {
        const form = document.createElement('div');
        form.className = 'edit-scheduled-form';

        form.innerHTML = `
            <div class="form-group">
                <label for="edit-execution-time">Execution Time</label>
                <input type="datetime-local" id="edit-execution-time" class="form-control" 
                       value="${command.executionTime.toISOString().slice(0, 16)}">
            </div>
            
            <div class="form-group">
                <label for="edit-priority">Priority</label>
                <select id="edit-priority" class="form-control">
                    <option value="low" ${command.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="normal" ${command.priority === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="high" ${command.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="critical" ${command.priority === 'critical' ? 'selected' : ''}>Critical</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="edit-max-retries">Max Retries</label>
                <input type="number" id="edit-max-retries" class="form-control" 
                       min="0" max="5" value="${command.maxRetries}">
            </div>
        `;

        return form;
    }

    updateScheduledCommand(command, dialog) {
        const form = dialog.element.querySelector('.edit-scheduled-form');
        
        command.executionTime = new Date(form.querySelector('#edit-execution-time').value);
        command.priority = form.querySelector('#edit-priority').value;
        command.maxRetries = parseInt(form.querySelector('#edit-max-retries').value);

        this.commandScheduler.commandingPlugin.openmct.notifications.info(
            `Updated scheduled command: ${command.command}`
        );

        dialog.dismiss();
        this.updateScheduledDisplay();
    }

    getTimeUntilExecution(executionTime) {
        const now = new Date();
        const timeDiff = executionTime - now;
        
        if (timeDiff <= 0) {
            return '<div class="time-until overdue">Overdue</div>';
        }
        
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        let timeString = '';
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
        timeString += `${seconds}s`;
        
        return `<div class="time-until">Executes in: ${timeString}</div>`;
    }

    startUpdating() {
        this.updateInterval = setInterval(() => {
            this.updateScheduledDisplay();
        }, 1000); // Update every second for countdown
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Export the view classes
window.CommandQueueView = CommandQueueView;
window.CommandSchedulerView = CommandSchedulerView;