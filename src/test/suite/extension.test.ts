/**
 * Extension Test Suite
 * Tests for extension activation and basic functionality
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting extension tests...');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('sanjay3290.apple-containers');
        assert.ok(extension, 'Extension should be installed');
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('sanjay3290.apple-containers');
        if (extension) {
            await extension.activate();
            assert.strictEqual(extension.isActive, true, 'Extension should be active');
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        const expectedCommands = [
            'appleContainers.refresh',
            'appleContainers.runContainer',
            'appleContainers.startContainer',
            'appleContainers.stopContainer',
            'appleContainers.restartContainer',
            'appleContainers.deleteContainer',
            'appleContainers.attachContainer',
            'appleContainers.viewLogs',
            'appleContainers.inspectContainer',
            'appleContainers.containerStats',
            'appleContainers.pullImage',
            'appleContainers.buildImage',
            'appleContainers.deleteImage',
            'appleContainers.inspectImage',
            'appleContainers.runFromImage',
            'appleContainers.createVolume',
            'appleContainers.deleteVolume',
            'appleContainers.inspectVolume',
            'appleContainers.pruneVolumes',
            'appleContainers.createNetwork',
            'appleContainers.deleteNetwork',
            'appleContainers.inspectNetwork',
            'appleContainers.pruneImages',
            'appleContainers.openSettings'
        ];

        for (const cmd of expectedCommands) {
            assert.ok(
                commands.includes(cmd),
                `Command ${cmd} should be registered`
            );
        }
    });

    test('Configuration should have defaults', () => {
        const config = vscode.workspace.getConfiguration('appleContainers');

        assert.strictEqual(
            config.get('containerPath'),
            'container',
            'containerPath should default to "container"'
        );

        assert.strictEqual(
            config.get('refreshInterval'),
            5000,
            'refreshInterval should default to 5000'
        );

        assert.strictEqual(
            config.get('showStoppedContainers'),
            true,
            'showStoppedContainers should default to true'
        );

        assert.strictEqual(
            config.get('defaultShell'),
            '/bin/sh',
            'defaultShell should default to /bin/sh'
        );

        assert.strictEqual(
            config.get('confirmBeforeDelete'),
            true,
            'confirmBeforeDelete should default to true'
        );
    });

    test('Views should be registered', () => {
        // Tree views are registered via package.json contributions
        // We can verify the extension contributes the expected views
        const extension = vscode.extensions.getExtension('sanjay3290.apple-containers');
        if (extension) {
            const contributes = extension.packageJSON.contributes;
            assert.ok(contributes.views, 'Extension should contribute views');
            assert.ok(
                contributes.views['apple-containers'],
                'Extension should contribute apple-containers view container'
            );

            const viewIds = contributes.views['apple-containers'].map(
                (v: { id: string }) => v.id
            );

            assert.ok(
                viewIds.includes('appleContainers.containers'),
                'Should have containers view'
            );
            assert.ok(
                viewIds.includes('appleContainers.images'),
                'Should have images view'
            );
            assert.ok(
                viewIds.includes('appleContainers.volumes'),
                'Should have volumes view'
            );
            assert.ok(
                viewIds.includes('appleContainers.networks'),
                'Should have networks view'
            );
        }
    });
});
