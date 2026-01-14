/**
 * Networks TreeView Provider
 * Displays container networks in a tree view
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { Network } from '../types';

/**
 * Tree item representing a network
 */
export class NetworkItem extends vscode.TreeItem {
    constructor(
        public readonly network: Network
    ) {
        super(network.name, vscode.TreeItemCollapsibleState.None);

        this.id = network.id;
        this.description = network.driver || 'bridge';
        this.tooltip = this.createTooltip();
        this.contextValue = 'network';
        this.iconPath = new vscode.ThemeIcon('globe', new vscode.ThemeColor('charts.orange'));
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.network.name}**\n\n`);
        md.appendMarkdown(`- **ID:** \`${this.network.id}\`\n`);
        if (this.network.driver) {
            md.appendMarkdown(`- **Driver:** ${this.network.driver}\n`);
        }
        if (this.network.scope) {
            md.appendMarkdown(`- **Scope:** ${this.network.scope}\n`);
        }
        if (this.network.internal !== undefined) {
            md.appendMarkdown(`- **Internal:** ${this.network.internal ? 'Yes' : 'No'}\n`);
        }
        if (this.network.ipam?.config && this.network.ipam.config.length > 0) {
            md.appendMarkdown(`- **IPAM:**\n`);
            for (const config of this.network.ipam.config) {
                if (config.subnet) {
                    md.appendMarkdown(`  - Subnet: \`${config.subnet}\`\n`);
                }
                if (config.gateway) {
                    md.appendMarkdown(`  - Gateway: \`${config.gateway}\`\n`);
                }
            }
        }
        if (this.network.labels && Object.keys(this.network.labels).length > 0) {
            md.appendMarkdown(`- **Labels:**\n`);
            for (const [key, value] of Object.entries(this.network.labels)) {
                md.appendMarkdown(`  - \`${key}\`: ${value}\n`);
            }
        }
        return md;
    }
}

/**
 * Networks tree data provider
 */
export class NetworksProvider implements vscode.TreeDataProvider<NetworkItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<NetworkItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _networks: Network[] = [];
    private _refreshTimer: ReturnType<typeof setInterval> | undefined;

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
        this._networks = await this._cli.listNetworks();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item
     */
    getTreeItem(element: NetworkItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children
     */
    async getChildren(element?: NetworkItem): Promise<NetworkItem[]> {
        if (element) {
            return []; // Networks don't have children
        }

        // Root level - return all networks
        if (this._networks.length === 0) {
            await this.refresh();
        }

        return this._networks
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(n => new NetworkItem(n));
    }

    /**
     * Get network by ID or name
     */
    getNetwork(idOrName: string): Network | undefined {
        return this._networks.find(n => n.id === idOrName || n.name === idOrName);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopAutoRefresh();
        this._onDidChangeTreeData.dispose();
    }
}
