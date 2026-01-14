/**
 * Container Commands
 * Handles all container-related commands
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { ContainersProvider, ContainerItem } from '../providers/containersProvider';
import { ImagesProvider, ImageItem } from '../providers/imagesProvider';

/**
 * Register container commands
 */
export function registerContainerCommands(
    context: vscode.ExtensionContext,
    cli: ContainerCli,
    containersProvider: ContainersProvider,
    imagesProvider: ImagesProvider
): void {
    // Start container
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.startContainer', async (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting container ${item.container.name || containerId.substring(0, 12)}...`,
                    cancellable: false
                },
                async () => cli.startContainer(containerId)
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Container started: ${item.container.name || containerId.substring(0, 12)}`);
                await containersProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to start container: ${result.error}`);
            }
        })
    );

    // Stop container
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.stopContainer', async (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Stopping container ${item.container.name || containerId.substring(0, 12)}...`,
                    cancellable: false
                },
                async () => cli.stopContainer(containerId)
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Container stopped: ${item.container.name || containerId.substring(0, 12)}`);
                await containersProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to stop container: ${result.error}`);
            }
        })
    );

    // Restart container
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.restartContainer', async (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Restarting container ${item.container.name || containerId.substring(0, 12)}...`,
                    cancellable: false
                },
                async () => {
                    // Stop the container first
                    const stopResult = await cli.stopContainer(containerId);
                    if (!stopResult.success) {
                        return stopResult; // Return stop error
                    }
                    // Only start if stop succeeded
                    return cli.startContainer(containerId);
                }
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Container restarted: ${item.container.name || containerId.substring(0, 12)}`);
                await containersProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to restart container: ${result.error}`);
            }
        })
    );

    // Delete container
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.deleteContainer', async (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            // Confirm deletion
            if (cli.config.confirmBeforeDelete) {
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete container "${item.container.name || containerId.substring(0, 12)}"?`,
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
                    title: `Deleting container ${item.container.name || containerId.substring(0, 12)}...`,
                    cancellable: false
                },
                async () => cli.deleteContainer(containerId, true)
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Container deleted: ${item.container.name || containerId.substring(0, 12)}`);
                await containersProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to delete container: ${result.error}`);
            }
        })
    );

    // Attach to container
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.attachContainer', (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            cli.attachContainer(containerId);
        })
    );

    // View container logs
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.viewLogs', (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            cli.viewLogs(containerId);
        })
    );

    // Inspect container
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.inspectContainer', async (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            const inspect = await cli.inspectContainer(containerId);
            if (inspect) {
                const doc = await vscode.workspace.openTextDocument({
                    content: JSON.stringify(inspect, null, 2),
                    language: 'json'
                });
                await vscode.window.showTextDocument(doc, { preview: true });
            } else {
                vscode.window.showErrorMessage('Failed to inspect container');
            }
        })
    );

    // Container stats
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.containerStats', async (item: ContainerItem) => {
            const containerId = item?.container?.id;
            if (!containerId) {
                vscode.window.showErrorMessage('No container selected');
                return;
            }

            // Create terminal for live stats
            const terminal = vscode.window.createTerminal({
                name: `Stats: ${item.container.name || containerId.substring(0, 12)}`,
                shellPath: cli.config.containerPath,
                shellArgs: ['stats', containerId]
            });
            terminal.show();
        })
    );

    // Run container (opens input dialog)
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.runContainer', async () => {
            const image = await vscode.window.showInputBox({
                prompt: 'Enter image name (e.g., nginx:latest, ubuntu:22.04)',
                placeHolder: 'image:tag',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Image name is required';
                    }
                    return null;
                }
            });

            if (!image) {
                return;
            }

            // Ask for container name
            const name = await vscode.window.showInputBox({
                prompt: 'Enter container name (optional)',
                placeHolder: 'my-container'
            });

            // Ask for common options
            const options = await vscode.window.showQuickPick(
                [
                    { label: '$(terminal) Interactive (-it)', value: 'interactive', picked: true },
                    { label: '$(trash) Remove on exit (--rm)', value: 'remove', picked: false },
                    { label: '$(debug-start) Detached (-d)', value: 'detach', picked: false },
                    { label: '$(key) Forward SSH agent (--ssh)', value: 'ssh', picked: false },
                    { label: '$(chip) Enable Rosetta (--rosetta)', value: 'rosetta', picked: false }
                ],
                {
                    canPickMany: true,
                    placeHolder: 'Select container options'
                }
            );

            // Build options
            const runOptions = {
                image: image.trim(),
                name: name?.trim() || undefined,
                interactive: options?.some(o => o.value === 'interactive'),
                tty: options?.some(o => o.value === 'interactive'),
                remove: options?.some(o => o.value === 'remove'),
                detach: options?.some(o => o.value === 'detach'),
                ssh: options?.some(o => o.value === 'ssh'),
                rosetta: options?.some(o => o.value === 'rosetta')
            };

            // If detached, use CLI method
            if (runOptions.detach) {
                const result = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Running container from ${image}...`,
                        cancellable: false
                    },
                    async () => cli.runContainer(runOptions)
                );

                if (result.success) {
                    vscode.window.showInformationMessage(`Container started from ${image}`);
                    await containersProvider.refresh();
                } else {
                    vscode.window.showErrorMessage(`Failed to run container: ${result.error}`);
                }
            } else {
                // Interactive - create terminal
                const args = ['run'];
                if (runOptions.interactive) {
                    args.push('-it');
                }
                if (runOptions.remove) {
                    args.push('--rm');
                }
                if (runOptions.name) {
                    args.push('--name', runOptions.name);
                }
                if (runOptions.ssh) {
                    args.push('--ssh');
                }
                if (runOptions.rosetta) {
                    args.push('--rosetta');
                }
                args.push(image);

                const terminal = vscode.window.createTerminal({
                    name: `Run: ${name || image}`,
                    shellPath: cli.config.containerPath,
                    shellArgs: args
                });
                terminal.show();
            }
        })
    );

    // Run container from image (context menu on image)
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.runFromImage', async (item: ImageItem) => {
            if (!item?.image) {
                vscode.window.showErrorMessage('No image selected');
                return;
            }

            const imageName = item.fullName;

            // Ask for container name
            const name = await vscode.window.showInputBox({
                prompt: 'Enter container name (optional)',
                placeHolder: 'my-container'
            });

            // Interactive run in terminal
            const terminal = vscode.window.createTerminal({
                name: `Run: ${name || imageName}`,
                shellPath: cli.config.containerPath,
                shellArgs: ['run', '-it', '--rm', ...(name ? ['--name', name] : []), imageName]
            });
            terminal.show();
        })
    );
}
