/**
 * Volumes TreeView Provider
 * Displays container volumes in a tree view
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { Volume } from '../types';

/**
 * Tree item representing a volume
 */
export class VolumeItem extends vscode.TreeItem {
    constructor(
        public readonly volume: Volume
    ) {
        super(volume.name, vscode.TreeItemCollapsibleState.None);

        this.id = volume.name;
        this.description = volume.driver || 'local';
        this.tooltip = this.createTooltip();
        this.contextValue = 'volume';
        this.iconPath = new vscode.ThemeIcon('database', new vscode.ThemeColor('charts.purple'));
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.volume.name}**\n\n`);
        if (this.volume.driver) {
            md.appendMarkdown(`- **Driver:** ${this.volume.driver}\n`);
        }
        if (this.volume.mountpoint) {
            md.appendMarkdown(`- **Mountpoint:** \`${this.volume.mountpoint}\`\n`);
        }
        if (this.volume.created) {
            md.appendMarkdown(`- **Created:** ${this.volume.created}\n`);
        }
        if (this.volume.scope) {
            md.appendMarkdown(`- **Scope:** ${this.volume.scope}\n`);
        }
        if (this.volume.labels && Object.keys(this.volume.labels).length > 0) {
            md.appendMarkdown(`- **Labels:**\n`);
            for (const [key, value] of Object.entries(this.volume.labels)) {
                md.appendMarkdown(`  - \`${key}\`: ${value}\n`);
            }
        }
        return md;
    }
}

/**
 * Volumes tree data provider
 */
export class VolumesProvider implements vscode.TreeDataProvider<VolumeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<VolumeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _volumes: Volume[] = [];
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
        this._volumes = await this._cli.listVolumes();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item
     */
    getTreeItem(element: VolumeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children
     */
    async getChildren(element?: VolumeItem): Promise<VolumeItem[]> {
        if (element) {
            return []; // Volumes don't have children
        }

        // Root level - return all volumes
        if (this._volumes.length === 0) {
            await this.refresh();
        }

        return this._volumes
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(v => new VolumeItem(v));
    }

    /**
     * Get volume by name
     */
    getVolume(name: string): Volume | undefined {
        return this._volumes.find(v => v.name === name);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopAutoRefresh();
        this._onDidChangeTreeData.dispose();
    }
}
