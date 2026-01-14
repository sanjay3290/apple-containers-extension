/**
 * Apple Containers VS Code Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { ContainerCli } from './cli';
import {
    ContainersProvider,
    ImagesProvider,
    VolumesProvider,
    NetworksProvider
} from './providers';
import {
    registerContainerCommands,
    registerImageCommands,
    registerVolumeCommands,
    registerNetworkCommands
} from './commands';

// Extension output channel
let outputChannel: vscode.OutputChannel;

// Status bar item
let statusBarItem: vscode.StatusBarItem;

// CLI instance
let cli: ContainerCli;

// Providers
let containersProvider: ContainersProvider;
let imagesProvider: ImagesProvider;
let volumesProvider: VolumesProvider;
let networksProvider: NetworksProvider;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('Apple Containers');
    context.subscriptions.push(outputChannel);

    // Initialize CLI wrapper
    cli = new ContainerCli(outputChannel);

    // Check if CLI is available
    const isAvailable = await cli.isAvailable();
    if (!isAvailable) {
        const action = await vscode.window.showWarningMessage(
            'Apple Containers CLI not found. Please install Apple Containers or configure the path in settings.',
            'Open Settings',
            'Learn More'
        );

        if (action === 'Open Settings') {
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'appleContainers.containerPath'
            );
        } else if (action === 'Learn More') {
            await vscode.env.openExternal(
                vscode.Uri.parse('https://developer.apple.com/documentation/virtualization')
            );
        }
    }

    // Create tree data providers
    containersProvider = new ContainersProvider(cli);
    imagesProvider = new ImagesProvider(cli);
    volumesProvider = new VolumesProvider(cli);
    networksProvider = new NetworksProvider(cli);

    // Register tree views
    const containersView = vscode.window.createTreeView('appleContainers.containers', {
        treeDataProvider: containersProvider,
        showCollapseAll: false
    });

    const imagesView = vscode.window.createTreeView('appleContainers.images', {
        treeDataProvider: imagesProvider,
        showCollapseAll: false
    });

    const volumesView = vscode.window.createTreeView('appleContainers.volumes', {
        treeDataProvider: volumesProvider,
        showCollapseAll: false
    });

    const networksView = vscode.window.createTreeView('appleContainers.networks', {
        treeDataProvider: networksProvider,
        showCollapseAll: false
    });

    context.subscriptions.push(containersView, imagesView, volumesView, networksView);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.command = 'appleContainers.refresh';
    statusBarItem.tooltip = 'Apple Containers - Click to refresh';
    context.subscriptions.push(statusBarItem);

    // Update status bar
    updateStatusBar();

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.refresh', async () => {
            await Promise.all([
                containersProvider.refresh(),
                imagesProvider.refresh(),
                volumesProvider.refresh(),
                networksProvider.refresh()
            ]);
            updateStatusBar();
            vscode.window.showInformationMessage('Apple Containers refreshed');
        })
    );

    // Register settings command
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.openSettings', () => {
            vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'appleContainers'
            );
        })
    );

    // Register all commands
    registerContainerCommands(context, cli, containersProvider, imagesProvider);
    registerImageCommands(context, cli, imagesProvider);
    registerVolumeCommands(context, cli, volumesProvider);
    registerNetworkCommands(context, cli, networksProvider);

    // Subscribe providers and CLI to disposal
    context.subscriptions.push({
        dispose: () => {
            containersProvider.dispose();
            imagesProvider.dispose();
            volumesProvider.dispose();
            networksProvider.dispose();
            cli.dispose(); // Dispose CLI to clean up config listener
        }
    });

    // Log activation
    const version = await cli.getVersion();
    outputChannel.appendLine(`Apple Containers extension activated`);
    if (version) {
        outputChannel.appendLine(`CLI version: ${version}`);
    }

    // Initial data load
    await Promise.all([
        containersProvider.refresh(),
        imagesProvider.refresh(),
        volumesProvider.refresh(),
        networksProvider.refresh()
    ]);

    updateStatusBar();
}

/**
 * Update status bar with container count
 */
async function updateStatusBar(): Promise<void> {
    try {
        const containers = await cli.listContainers(false); // Only running containers
        const runningCount = containers.length;

        if (runningCount > 0) {
            statusBarItem.text = `$(vm-running) ${runningCount} container${runningCount !== 1 ? 's' : ''}`;
            statusBarItem.backgroundColor = undefined;
        } else {
            statusBarItem.text = '$(vm) No containers';
            statusBarItem.backgroundColor = undefined;
        }

        statusBarItem.show();
    } catch (error) {
        // Log the error for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[STATUS BAR ERROR] ${errorMessage}`);

        statusBarItem.text = '$(warning) Containers';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = `Apple Containers - Error: ${errorMessage}`;
        statusBarItem.show();
    }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    // Cleanup handled by context.subscriptions
    if (outputChannel) {
        outputChannel.appendLine('Apple Containers extension deactivated');
    }
}
