/**
 * Containers TreeView Provider
 * Displays running and stopped containers in a tree view
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { Container, ContainerStatus } from '../types';

/**
 * Tree item representing a container
 */
export class ContainerItem extends vscode.TreeItem {
    constructor(
        public readonly container: Container
    ) {
        super(container.name || container.id, vscode.TreeItemCollapsibleState.None);

        const isRunning = container.status === ContainerStatus.Running;

        this.id = container.id;
        this.description = container.image;
        this.tooltip = this.createTooltip();
        this.contextValue = isRunning ? 'runningContainer' : 'stoppedContainer';
        this.iconPath = new vscode.ThemeIcon(
            isRunning ? 'vm-running' : 'vm',
            isRunning
                ? new vscode.ThemeColor('charts.green')
                : new vscode.ThemeColor('charts.gray')
        );
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.container.name || this.container.id}**\n\n`);
        md.appendMarkdown(`- **Image:** ${this.container.image}\n`);
        md.appendMarkdown(`- **Status:** ${this.container.status}\n`);
        md.appendMarkdown(`- **ID:** \`${this.container.id}\`\n`);
        if (this.container.created) {
            md.appendMarkdown(`- **Created:** ${this.container.created}\n`);
        }
        if (this.container.ports && this.container.ports.length > 0) {
            const ports = this.container.ports
                .map(p => `${p.hostPort}:${p.containerPort}/${p.protocol}`)
                .join(', ');
            md.appendMarkdown(`- **Ports:** ${ports}\n`);
        }
        return md;
    }
}

/**
 * Containers tree data provider
 */
export class ContainersProvider implements vscode.TreeDataProvider<ContainerItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ContainerItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _containers: Container[] = [];
    private _refreshTimer: ReturnType<typeof setInterval> | undefined;
    private _initialLoadDone = false;

    constructor(private readonly _cli: ContainerCli) {
        this.startAutoRefresh();
    }

    /**
     * Start auto-refresh timer
     */
    private startAutoRefresh(): void {
        const interval = this._cli.config.refreshInterval;
        if (interval > 0) {
            this._refreshTimer = setInterval(() => {
                this.refresh();
            }, interval);
        }
    }

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh(): void {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = undefined;
        }
    }

    /**
     * Refresh the tree view
     */
    async refresh(): Promise<void> {
        const showAll = this._cli.config.showStoppedContainers;
        this._containers = await this._cli.listContainers(showAll);
        this._initialLoadDone = true;
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item
     */
    getTreeItem(element: ContainerItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children
     */
    async getChildren(element?: ContainerItem): Promise<ContainerItem[]> {
        if (element) {
            return []; // Containers don't have children
        }

        // Only trigger refresh if initial load hasn't happened
        // This prevents redundant CLI calls when there are genuinely no containers
        if (!this._initialLoadDone) {
            await this.refresh();
        }

        return this._containers.map(c => new ContainerItem(c));
    }

    /**
     * Get container by ID
     */
    getContainer(id: string): Container | undefined {
        return this._containers.find(c => c.id === id || c.name === id);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopAutoRefresh();
        this._onDidChangeTreeData.dispose();
    }
}
