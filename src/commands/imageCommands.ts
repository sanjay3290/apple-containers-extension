/**
 * Image Commands
 * Handles all image-related commands
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ContainerCli } from '../cli';
import { ImagesProvider, ImageItem } from '../providers/imagesProvider';

/**
 * Register image commands
 */
export function registerImageCommands(
    context: vscode.ExtensionContext,
    cli: ContainerCli,
    imagesProvider: ImagesProvider
): void {
    // Pull image
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.pullImage', async () => {
            const image = await vscode.window.showInputBox({
                prompt: 'Enter image name to pull (e.g., nginx:latest, ubuntu:22.04)',
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

            // Ask for platform
            const platform = await vscode.window.showQuickPick(
                [
                    { label: '$(chip) Default (arm64)', value: undefined },
                    { label: '$(chip) linux/arm64', value: 'linux/arm64' },
                    { label: '$(chip) linux/amd64 (with Rosetta)', value: 'linux/amd64' }
                ],
                {
                    placeHolder: 'Select platform'
                }
            );

            if (platform === undefined) {
                return;
            }

            // Pull in terminal for progress visibility
            cli.pullImage({
                image: image.trim(),
                platform: platform.value
            });

            // Refresh after a delay
            setTimeout(() => {
                void imagesProvider.refresh();
            }, 5000);
        })
    );

    // Build image
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.buildImage', async () => {
            // Get workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            let buildContext = '.';

            if (workspaceFolders && workspaceFolders.length > 0) {
                if (workspaceFolders.length === 1) {
                    buildContext = workspaceFolders[0].uri.fsPath;
                } else {
                    const folder = await vscode.window.showWorkspaceFolderPick({
                        placeHolder: 'Select build context folder'
                    });
                    if (folder) {
                        buildContext = folder.uri.fsPath;
                    }
                }
            }

            // Check for Dockerfile/Containerfile
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(buildContext, '{Dockerfile,Containerfile,*.dockerfile,*.Dockerfile}'),
                '**/node_modules/**',
                10
            );

            let dockerfile: string | undefined;
            if (files.length > 1) {
                const selected = await vscode.window.showQuickPick(
                    files.map(f => ({
                        label: path.basename(f.fsPath),
                        description: path.dirname(f.fsPath),
                        value: f.fsPath
                    })),
                    { placeHolder: 'Select Dockerfile' }
                );
                dockerfile = selected?.value;
            } else if (files.length === 1) {
                dockerfile = files[0].fsPath;
            }

            // Get image tag
            const tag = await vscode.window.showInputBox({
                prompt: 'Enter image tag (e.g., myimage:latest)',
                placeHolder: 'image:tag',
                value: `${path.basename(buildContext)}:latest`
            });

            if (!tag) {
                return;
            }

            // Build options
            const optionItems = await vscode.window.showQuickPick(
                [
                    { label: '$(trash) No cache (--no-cache)', value: 'noCache', picked: false },
                    { label: '$(cloud-download) Always pull base image (--pull)', value: 'pull', picked: false }
                ],
                {
                    canPickMany: true,
                    placeHolder: 'Select build options (optional)'
                }
            );

            // Build in terminal
            cli.buildImage({
                context: buildContext,
                dockerfile: dockerfile,
                tag: tag.trim(),
                noCache: optionItems?.some(o => o.value === 'noCache'),
                pull: optionItems?.some(o => o.value === 'pull')
            });

            // Refresh after a delay
            setTimeout(() => {
                void imagesProvider.refresh();
            }, 10000);
        })
    );

    // Delete image
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.deleteImage', async (item: ImageItem) => {
            const imageId = item?.image?.id;
            if (!imageId) {
                vscode.window.showErrorMessage('No image selected');
                return;
            }

            const imageName = item.fullName;

            // Confirm deletion
            if (cli.config.confirmBeforeDelete) {
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete image "${imageName}"?`,
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
                    title: `Deleting image ${imageName}...`,
                    cancellable: false
                },
                async () => cli.deleteImage(imageId, true)
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Image deleted: ${imageName}`);
                await imagesProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to delete image: ${result.error}`);
            }
        })
    );

    // Inspect image
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.inspectImage', async (item: ImageItem) => {
            const imageId = item?.image?.id;
            if (!imageId) {
                vscode.window.showErrorMessage('No image selected');
                return;
            }

            const inspect = await cli.inspectImage(imageId);
            if (inspect) {
                const doc = await vscode.workspace.openTextDocument({
                    content: JSON.stringify(inspect, null, 2),
                    language: 'json'
                });
                await vscode.window.showTextDocument(doc, { preview: true });
            } else {
                vscode.window.showErrorMessage('Failed to inspect image');
            }
        })
    );

    // Prune images
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.pruneImages', async () => {
            const pruneAll = await vscode.window.showQuickPick(
                [
                    { label: '$(trash) Prune dangling images only', value: false },
                    { label: '$(trash) Prune all unused images', value: true }
                ],
                { placeHolder: 'Select prune option' }
            );

            if (pruneAll === undefined) {
                return;
            }

            // Confirm
            const confirm = await vscode.window.showWarningMessage(
                pruneAll.value
                    ? 'This will remove all images not referenced by any container. Continue?'
                    : 'This will remove all dangling images. Continue?',
                { modal: true },
                'Prune'
            );

            if (confirm !== 'Prune') {
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pruning images...',
                    cancellable: false
                },
                async () => cli.pruneImages(pruneAll.value)
            );

            if (result.success) {
                vscode.window.showInformationMessage('Images pruned successfully');
                await imagesProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to prune images: ${result.error}`);
            }
        })
    );
}
