/**
 * Images TreeView Provider
 * Displays container images in a tree view
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { Image } from '../types';

/**
 * Tree item representing an image
 */
export class ImageItem extends vscode.TreeItem {
    constructor(
        public readonly image: Image
    ) {
        const displayName = image.repository !== '<none>'
            ? `${image.repository}:${image.tag || 'latest'}`
            : image.id.substring(0, 12);

        super(displayName, vscode.TreeItemCollapsibleState.None);

        this.id = image.id;
        this.description = image.size;
        this.tooltip = this.createTooltip();
        this.contextValue = 'image';
        this.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        const name = this.image.repository !== '<none>'
            ? `${this.image.repository}:${this.image.tag || 'latest'}`
            : this.image.id.substring(0, 12);

        md.appendMarkdown(`**${name}**\n\n`);
        md.appendMarkdown(`- **ID:** \`${this.image.id}\`\n`);
        md.appendMarkdown(`- **Size:** ${this.image.size}\n`);
        if (this.image.created) {
            md.appendMarkdown(`- **Created:** ${this.image.created}\n`);
        }
        if (this.image.digest) {
            md.appendMarkdown(`- **Digest:** \`${this.image.digest.substring(0, 20)}...\`\n`);
        }
        return md;
    }

    /**
     * Get the full image name with tag
     */
    get fullName(): string {
        if (this.image.repository !== '<none>') {
            return `${this.image.repository}:${this.image.tag || 'latest'}`;
        }
        return this.image.id;
    }
}

/**
 * Images tree data provider
 */
export class ImagesProvider implements vscode.TreeDataProvider<ImageItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ImageItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _images: Image[] = [];
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
        this._images = await this._cli.listImages();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item
     */
    getTreeItem(element: ImageItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children
     */
    async getChildren(element?: ImageItem): Promise<ImageItem[]> {
        if (element) {
            return []; // Images don't have children
        }

        // Root level - return all images
        if (this._images.length === 0) {
            await this.refresh();
        }

        // Sort by repository name, then by tag
        return this._images
            .sort((a, b) => {
                const repoA = a.repository || '';
                const repoB = b.repository || '';
                if (repoA !== repoB) {
                    return repoA.localeCompare(repoB);
                }
                return (a.tag || '').localeCompare(b.tag || '');
            })
            .map(i => new ImageItem(i));
    }

    /**
     * Get image by ID
     */
    getImage(id: string): Image | undefined {
        return this._images.find(i => i.id === id);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopAutoRefresh();
        this._onDidChangeTreeData.dispose();
    }
}
