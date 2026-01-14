/**
 * Volume Commands
 * Handles all volume-related commands
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { VolumesProvider, VolumeItem } from '../providers/volumesProvider';

/**
 * Register volume commands
 */
export function registerVolumeCommands(
    context: vscode.ExtensionContext,
    cli: ContainerCli,
    volumesProvider: VolumesProvider
): void {
    // Create volume
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.createVolume', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter volume name',
                placeHolder: 'my-volume',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Volume name is required';
                    }
                    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value)) {
                        return 'Volume name must start with alphanumeric and contain only alphanumeric, _, ., or -';
                    }
                    return null;
                }
            });

            if (!name) {
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Creating volume ${name}...`,
                    cancellable: false
                },
                async () => cli.createVolume({ name: name.trim() })
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Volume created: ${name}`);
                await volumesProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to create volume: ${result.error}`);
            }
        })
    );

    // Delete volume
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.deleteVolume', async (item: VolumeItem) => {
            const volumeName = item?.volume?.name;
            if (!volumeName) {
                vscode.window.showErrorMessage('No volume selected');
                return;
            }

            // Confirm deletion
            if (cli.config.confirmBeforeDelete) {
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete volume "${volumeName}"? This will remove all data in the volume.`,
                    { modal: true },
                    'Delete'
                );
                if (confirm !== 'Delete') {
                    return;
                }
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Deleting volume ${volumeName}...`,
                    cancellable: false
                },
                async () => cli.deleteVolume(volumeName, true)
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Volume deleted: ${volumeName}`);
                await volumesProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to delete volume: ${result.error}`);
            }
        })
    );

    // Inspect volume
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.inspectVolume', async (item: VolumeItem) => {
            const volumeName = item?.volume?.name;
            if (!volumeName) {
                vscode.window.showErrorMessage('No volume selected');
                return;
            }

            const inspect = await cli.inspectVolume(volumeName);
            if (inspect) {
                const doc = await vscode.workspace.openTextDocument({
                    content: JSON.stringify(inspect, null, 2),
                    language: 'json'
                });
                await vscode.window.showTextDocument(doc, { preview: true });
            } else {
                vscode.window.showErrorMessage('Failed to inspect volume');
            }
        })
    );

    // Prune volumes
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.pruneVolumes', async () => {
            // Confirm
            const confirm = await vscode.window.showWarningMessage(
                'This will remove all volumes not referenced by any container. This cannot be undone. Continue?',
                { modal: true },
                'Prune'
            );

            if (confirm !== 'Prune') {
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pruning volumes...',
                    cancellable: false
                },
                async () => cli.pruneVolumes()
            );

            if (result.success) {
                vscode.window.showInformationMessage('Volumes pruned successfully');
                await volumesProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to prune volumes: ${result.error}`);
            }
        })
    );
}
