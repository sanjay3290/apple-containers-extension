/**
 * Network Commands
 * Handles all network-related commands
 */

import * as vscode from 'vscode';
import { ContainerCli } from '../cli';
import { NetworksProvider, NetworkItem } from '../providers/networksProvider';

/**
 * Register network commands
 */
export function registerNetworkCommands(
    context: vscode.ExtensionContext,
    cli: ContainerCli,
    networksProvider: NetworksProvider
): void {
    // Create network
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.createNetwork', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter network name',
                placeHolder: 'my-network',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Network name is required';
                    }
                    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value)) {
                        return 'Network name must start with alphanumeric and contain only alphanumeric, _, ., or -';
                    }
                    return null;
                }
            });

            if (!name) {
                return;
            }

            // Ask for subnet (optional)
            const subnet = await vscode.window.showInputBox({
                prompt: 'Enter subnet (optional, e.g., 172.20.0.0/16)',
                placeHolder: '172.20.0.0/16'
            });

            // Ask for gateway (optional)
            let gateway: string | undefined;
            if (subnet) {
                gateway = await vscode.window.showInputBox({
                    prompt: 'Enter gateway (optional, e.g., 172.20.0.1)',
                    placeHolder: '172.20.0.1'
                });
            }

            // Ask for internal
            const internalPick = await vscode.window.showQuickPick(
                [
                    { label: '$(globe) External (default)', value: false },
                    { label: '$(lock) Internal only', value: true }
                ],
                { placeHolder: 'Select network type' }
            );

            if (internalPick === undefined) {
                return;
            }

            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Creating network ${name}...`,
                    cancellable: false
                },
                async () => cli.createNetwork({
                    name: name.trim(),
                    subnet: subnet?.trim() || undefined,
                    gateway: gateway?.trim() || undefined,
                    internal: internalPick.value
                })
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Network created: ${name}`);
                await networksProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to create network: ${result.error}`);
            }
        })
    );

    // Delete network
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.deleteNetwork', async (item: NetworkItem) => {
            const networkId = item?.network?.id;
            const networkName = item?.network?.name;
            if (!networkId) {
                vscode.window.showErrorMessage('No network selected');
                return;
            }

            // Confirm deletion
            if (cli.config.confirmBeforeDelete) {
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete network "${networkName}"?`,
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
                    title: `Deleting network ${networkName}...`,
                    cancellable: false
                },
                async () => cli.deleteNetwork(networkId)
            );

            if (result.success) {
                vscode.window.showInformationMessage(`Network deleted: ${networkName}`);
                await networksProvider.refresh();
            } else {
                vscode.window.showErrorMessage(`Failed to delete network: ${result.error}`);
            }
        })
    );

    // Inspect network
    context.subscriptions.push(
        vscode.commands.registerCommand('appleContainers.inspectNetwork', async (item: NetworkItem) => {
            const networkId = item?.network?.id;
            if (!networkId) {
                vscode.window.showErrorMessage('No network selected');
                return;
            }

            const inspect = await cli.inspectNetwork(networkId);
            if (inspect) {
                const doc = await vscode.workspace.openTextDocument({
                    content: JSON.stringify(inspect, null, 2),
                    language: 'json'
                });
                await vscode.window.showTextDocument(doc, { preview: true });
            } else {
                vscode.window.showErrorMessage('Failed to inspect network');
            }
        })
    );
}
