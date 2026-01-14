/**
 * Apple Containers CLI Wrapper
 * Provides TypeScript interface to the `container` CLI command
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import {
    Container,
    ContainerStatus,
    ContainerInspect,
    ContainerStats,
    Image,
    ImageInspect,
    Volume,
    VolumeInspect,
    Network,
    NetworkInspect,
    CliResult,
    RunContainerOptions,
    BuildImageOptions,
    PullImageOptions,
    CreateVolumeOptions,
    CreateNetworkOptions,
    ExtensionConfig
} from './types';

// Use execFile to avoid shell injection vulnerabilities
const execFileAsync = promisify(execFile);

/**
 * Apple Containers CLI wrapper class
 */
export class ContainerCli implements vscode.Disposable {
    private _outputChannel: vscode.OutputChannel;
    private _config: ExtensionConfig;
    private _configChangeDisposable: vscode.Disposable;

    constructor(outputChannel: vscode.OutputChannel) {
        this._outputChannel = outputChannel;
        this._config = this.loadConfig();

        // Listen for configuration changes (with proper disposal)
        this._configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('appleContainers')) {
                this._config = this.loadConfig();
            }
        });
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this._configChangeDisposable.dispose();
    }

    /**
     * Load extension configuration
     */
    private loadConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration('appleContainers');
        return {
            containerPath: config.get<string>('containerPath', 'container'),
            refreshInterval: config.get<number>('refreshInterval', 5000),
            showStoppedContainers: config.get<boolean>('showStoppedContainers', true),
            defaultShell: config.get<string>('defaultShell', '/bin/sh'),
            confirmBeforeDelete: config.get<boolean>('confirmBeforeDelete', true)
        };
    }

    /**
     * Get current configuration
     */
    get config(): ExtensionConfig {
        return this._config;
    }

    /**
     * Execute a container CLI command
     * Uses execFile to avoid shell injection vulnerabilities
     */
    private async execute<T>(args: string[], parseJson = false): Promise<CliResult<T>> {
        const cliPath = this._config.containerPath;
        this._outputChannel.appendLine(`[CMD] ${cliPath} ${args.join(' ')}`);

        try {
            // execFile doesn't spawn a shell, preventing command injection
            const { stdout, stderr } = await execFileAsync(cliPath, args, {
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                timeout: 60000 // 60 second timeout
            });

            if (stderr) {
                this._outputChannel.appendLine(`[STDERR] ${stderr}`);
            }

            if (parseJson && stdout.trim()) {
                try {
                    const data = JSON.parse(stdout) as T;
                    return { success: true, data, exitCode: 0 };
                } catch (jsonError) {
                    this._outputChannel.appendLine(`[JSON ERROR] Failed to parse: ${stdout}`);
                    return { success: false, error: 'Failed to parse JSON output', exitCode: 0 };
                }
            }

            return { success: true, data: stdout as T, exitCode: 0 };
        } catch (error) {
            const err = error as { message: string; code?: number; stderr?: string };
            const errorMessage = err.stderr || err.message;
            this._outputChannel.appendLine(`[ERROR] ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
                exitCode: err.code || 1
            };
        }
    }


    /**
     * Check if the container CLI is available
     */
    async isAvailable(): Promise<boolean> {
        const result = await this.execute(['--version']);
        return result.success;
    }

    /**
     * Get CLI version
     */
    async getVersion(): Promise<string | undefined> {
        const result = await this.execute<string>(['--version']);
        if (result.success && result.data) {
            return result.data.trim();
        }
        return undefined;
    }

    // ==================== Container Operations ====================

    /**
     * Raw container data from CLI
     */
    private parseRawContainer(raw: Record<string, unknown>): Container {
        const config = raw.configuration as Record<string, unknown> || {};
        const imageInfo = config.image as Record<string, unknown> || {};
        const publishedPorts = config.publishedPorts as Array<Record<string, unknown>> || [];

        // Parse ports
        const ports = publishedPorts.map(p => ({
            hostIp: p.hostAddress as string || undefined,
            hostPort: p.hostPort as number,
            containerPort: p.containerPort as number,
            protocol: (p.proto as 'tcp' | 'udp') || 'tcp'
        }));

        // Get status - normalize to our enum
        const rawStatus = (raw.status as string || '').toLowerCase();
        let status: ContainerStatus;
        switch (rawStatus) {
            case 'running':
                status = ContainerStatus.Running;
                break;
            case 'stopped':
            case 'exited':
                status = ContainerStatus.Stopped;
                break;
            case 'created':
                status = ContainerStatus.Created;
                break;
            case 'paused':
                status = ContainerStatus.Paused;
                break;
            default:
                status = ContainerStatus.Unknown;
        }

        return {
            id: config.id as string || '',
            name: config.id as string || '', // Apple Containers uses id as name
            image: imageInfo.reference as string || 'unknown',
            status,
            created: '',
            ports: ports.length > 0 ? ports : undefined,
            labels: config.labels as Record<string, string> || undefined
        };
    }

    /**
     * List containers
     */
    async listContainers(all = false): Promise<Container[]> {
        const args = ['list', '--format', 'json'];
        if (all) {
            args.push('--all');
        }

        const result = await this.execute<Array<Record<string, unknown>>>(args, true);
        if (result.success && result.data) {
            const rawData = Array.isArray(result.data) ? result.data : [];
            return rawData.map(raw => this.parseRawContainer(raw));
        }
        return [];
    }

    /**
     * Inspect a container
     */
    async inspectContainer(id: string): Promise<ContainerInspect | undefined> {
        const result = await this.execute<ContainerInspect[]>(['inspect', '--format', 'json', id], true);
        if (result.success && result.data && result.data.length > 0) {
            return result.data[0];
        }
        return undefined;
    }

    /**
     * Start a container
     */
    async startContainer(id: string): Promise<CliResult<string>> {
        return this.execute<string>(['start', id]);
    }

    /**
     * Stop a container
     */
    async stopContainer(id: string, timeout?: number): Promise<CliResult<string>> {
        const args = ['stop'];
        if (timeout !== undefined) {
            args.push('--time', timeout.toString());
        }
        args.push(id);
        return this.execute<string>(args);
    }

    /**
     * Kill a container
     */
    async killContainer(id: string, signal?: string): Promise<CliResult<string>> {
        const args = ['kill'];
        if (signal) {
            args.push('--signal', signal);
        }
        args.push(id);
        return this.execute<string>(args);
    }

    /**
     * Delete a container
     */
    async deleteContainer(id: string, force = false): Promise<CliResult<string>> {
        const args = ['delete'];
        if (force) {
            args.push('--force');
        }
        args.push(id);
        return this.execute<string>(args);
    }

    /**
     * Run a new container
     */
    async runContainer(options: RunContainerOptions): Promise<CliResult<string>> {
        const args = ['run'];

        // Management options
        if (options.name) {
            args.push('--name', options.name);
        }
        if (options.detach) {
            args.push('--detach');
        }
        if (options.remove) {
            args.push('--rm');
        }
        if (options.interactive) {
            args.push('--interactive');
        }
        if (options.tty) {
            args.push('--tty');
        }

        // Environment
        if (options.env) {
            for (const [key, value] of Object.entries(options.env)) {
                args.push('--env', `${key}=${value}`);
            }
        }
        if (options.envFile) {
            args.push('--env-file', options.envFile);
        }

        // Ports
        if (options.ports) {
            for (const port of options.ports) {
                let portSpec = '';
                if (port.hostIp) {
                    portSpec += `${port.hostIp}:`;
                }
                portSpec += `${port.host}:${port.container}`;
                if (port.protocol && port.protocol !== 'tcp') {
                    portSpec += `/${port.protocol}`;
                }
                args.push('--publish', portSpec);
            }
        }

        // Volumes
        if (options.volumes) {
            for (const vol of options.volumes) {
                let volSpec = `${vol.source}:${vol.target}`;
                if (vol.readonly) {
                    volSpec += ':ro';
                }
                args.push('--volume', volSpec);
            }
        }

        // Mounts
        if (options.mounts) {
            for (const mount of options.mounts) {
                let mountSpec = `type=${mount.type},source=${mount.source},target=${mount.target}`;
                if (mount.readonly) {
                    mountSpec += ',readonly';
                }
                args.push('--mount', mountSpec);
            }
        }

        // Network
        if (options.network) {
            args.push('--network', options.network);
        }

        // Process options
        if (options.workdir) {
            args.push('--workdir', options.workdir);
        }
        if (options.user) {
            args.push('--user', options.user);
        }

        // Resource limits
        if (options.cpus) {
            args.push('--cpus', options.cpus.toString());
        }
        if (options.memory) {
            args.push('--memory', options.memory);
        }

        // Platform
        if (options.platform) {
            args.push('--platform', options.platform);
        }

        // Entrypoint
        if (options.entrypoint) {
            args.push('--entrypoint', options.entrypoint);
        }

        // Labels
        if (options.labels) {
            for (const [key, value] of Object.entries(options.labels)) {
                args.push('--label', `${key}=${value}`);
            }
        }

        // DNS
        if (options.dns) {
            for (const dns of options.dns) {
                args.push('--dns', dns);
            }
        }
        if (options.dnsSearch) {
            for (const search of options.dnsSearch) {
                args.push('--dns-search', search);
            }
        }

        // Apple-specific options
        if (options.rosetta) {
            args.push('--rosetta');
        }
        if (options.ssh) {
            args.push('--ssh');
        }

        // Image
        args.push(options.image);

        // Command
        if (options.cmd) {
            args.push(...options.cmd);
        }

        return this.execute<string>(args);
    }

    /**
     * Create a terminal for attaching to a container
     */
    attachContainer(id: string, shell?: string): vscode.Terminal {
        const shellCmd = shell || this._config.defaultShell;
        const terminal = vscode.window.createTerminal({
            name: `Container: ${id.substring(0, 12)}`,
            shellPath: this._config.containerPath,
            shellArgs: ['exec', '-it', id, shellCmd]
        });
        terminal.show();
        return terminal;
    }

    /**
     * Create a terminal for viewing container logs
     */
    viewLogs(id: string, follow = true): vscode.Terminal {
        const args = ['logs'];
        if (follow) {
            args.push('--follow');
        }
        args.push(id);

        const terminal = vscode.window.createTerminal({
            name: `Logs: ${id.substring(0, 12)}`,
            shellPath: this._config.containerPath,
            shellArgs: args
        });
        terminal.show();
        return terminal;
    }

    /**
     * Get container stats
     */
    async getStats(id?: string): Promise<ContainerStats[]> {
        const args = ['stats', '--format', 'json', '--no-stream'];
        if (id) {
            args.push(id);
        }

        const result = await this.execute<ContainerStats[]>(args, true);
        if (result.success && result.data) {
            return Array.isArray(result.data) ? result.data : [];
        }
        return [];
    }

    // ==================== Image Operations ====================

    /**
     * Parse raw image data from CLI
     */
    private parseRawImage(raw: Record<string, unknown>): Image {
        const reference = raw.reference as string || '';
        const descriptor = raw.descriptor as Record<string, unknown> || {};

        // Parse reference into repository and tag
        // Format: "docker.io/library/nginx:latest" or "myimage:latest"
        let repository = reference;
        let tag = 'latest';

        const lastColon = reference.lastIndexOf(':');
        const lastSlash = reference.lastIndexOf('/');

        // Check if there's a tag (colon after the last slash)
        if (lastColon > lastSlash) {
            repository = reference.substring(0, lastColon);
            tag = reference.substring(lastColon + 1);
        }

        // Simplify docker.io/library/ prefix
        if (repository.startsWith('docker.io/library/')) {
            repository = repository.substring('docker.io/library/'.length);
        } else if (repository.startsWith('docker.io/')) {
            repository = repository.substring('docker.io/'.length);
        }

        return {
            id: descriptor.digest as string || '',
            repository,
            tag,
            digest: descriptor.digest as string || undefined,
            size: this.formatSize(descriptor.size as number || 0),
            sizeBytes: descriptor.size as number || 0,
            created: '',
            labels: undefined
        };
    }

    /**
     * Format bytes to human readable size using IEC units (1024-based)
     */
    private formatSize(bytes: number): string {
        if (bytes === 0) { return '0 B'; }
        const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    }

    /**
     * List images
     */
    async listImages(): Promise<Image[]> {
        const result = await this.execute<Array<Record<string, unknown>>>(['image', 'list', '--format', 'json'], true);
        if (result.success && result.data) {
            const rawData = Array.isArray(result.data) ? result.data : [];
            return rawData.map(raw => this.parseRawImage(raw));
        }
        return [];
    }

    /**
     * Inspect an image
     */
    async inspectImage(id: string): Promise<ImageInspect | undefined> {
        const result = await this.execute<ImageInspect[]>(['image', 'inspect', '--format', 'json', id], true);
        if (result.success && result.data && result.data.length > 0) {
            return result.data[0];
        }
        return undefined;
    }

    /**
     * Pull an image
     */
    pullImage(options: PullImageOptions): vscode.Terminal {
        const args = ['image', 'pull'];
        if (options.platform) {
            args.push('--platform', options.platform);
        }
        args.push(options.image);

        const terminal = vscode.window.createTerminal({
            name: `Pull: ${options.image}`,
            shellPath: this._config.containerPath,
            shellArgs: args
        });
        terminal.show();
        return terminal;
    }

    /**
     * Delete an image
     */
    async deleteImage(id: string, force = false): Promise<CliResult<string>> {
        const args = ['image', 'delete'];
        if (force) {
            args.push('--force');
        }
        args.push(id);
        return this.execute<string>(args);
    }

    /**
     * Build an image
     */
    buildImage(options: BuildImageOptions): vscode.Terminal {
        const args = ['build'];

        if (options.dockerfile) {
            args.push('--file', options.dockerfile);
        }
        if (options.tag) {
            args.push('--tag', options.tag);
        }
        if (options.tags) {
            for (const tag of options.tags) {
                args.push('--tag', tag);
            }
        }
        if (options.buildArgs) {
            for (const [key, value] of Object.entries(options.buildArgs)) {
                args.push('--build-arg', `${key}=${value}`);
            }
        }
        if (options.target) {
            args.push('--target', options.target);
        }
        if (options.platform) {
            args.push('--platform', options.platform);
        }
        if (options.noCache) {
            args.push('--no-cache');
        }
        if (options.labels) {
            for (const [key, value] of Object.entries(options.labels)) {
                args.push('--label', `${key}=${value}`);
            }
        }

        args.push(options.context);

        const terminal = vscode.window.createTerminal({
            name: `Build: ${options.tag || 'image'}`,
            shellPath: this._config.containerPath,
            shellArgs: args
        });
        terminal.show();
        return terminal;
    }

    /**
     * Prune unused images
     */
    async pruneImages(all = false): Promise<CliResult<string>> {
        const args = ['image', 'prune', '--force'];
        if (all) {
            args.push('--all');
        }
        return this.execute<string>(args);
    }

    // ==================== Volume Operations ====================

    /**
     * List volumes
     */
    async listVolumes(): Promise<Volume[]> {
        const result = await this.execute<Volume[]>(['volume', 'list', '--format', 'json'], true);
        if (result.success && result.data) {
            return Array.isArray(result.data) ? result.data : [];
        }
        return [];
    }

    /**
     * Inspect a volume
     */
    async inspectVolume(name: string): Promise<VolumeInspect | undefined> {
        const result = await this.execute<VolumeInspect[]>(['volume', 'inspect', '--format', 'json', name], true);
        if (result.success && result.data && result.data.length > 0) {
            return result.data[0];
        }
        return undefined;
    }

    /**
     * Create a volume
     */
    async createVolume(options: CreateVolumeOptions): Promise<CliResult<string>> {
        const args = ['volume', 'create'];
        if (options.driver) {
            args.push('--driver', options.driver);
        }
        if (options.labels) {
            for (const [key, value] of Object.entries(options.labels)) {
                args.push('--label', `${key}=${value}`);
            }
        }
        args.push(options.name);
        return this.execute<string>(args);
    }

    /**
     * Delete a volume
     */
    async deleteVolume(name: string, force = false): Promise<CliResult<string>> {
        const args = ['volume', 'delete'];
        if (force) {
            args.push('--force');
        }
        args.push(name);
        return this.execute<string>(args);
    }

    /**
     * Prune unused volumes
     */
    async pruneVolumes(): Promise<CliResult<string>> {
        return this.execute<string>(['volume', 'prune', '--force']);
    }

    // ==================== Network Operations ====================

    /**
     * List networks
     */
    async listNetworks(): Promise<Network[]> {
        const result = await this.execute<Network[]>(['network', 'list', '--format', 'json'], true);
        if (result.success && result.data) {
            return Array.isArray(result.data) ? result.data : [];
        }
        return [];
    }

    /**
     * Inspect a network
     */
    async inspectNetwork(id: string): Promise<NetworkInspect | undefined> {
        const result = await this.execute<NetworkInspect[]>(['network', 'inspect', '--format', 'json', id], true);
        if (result.success && result.data && result.data.length > 0) {
            return result.data[0];
        }
        return undefined;
    }

    /**
     * Create a network
     */
    async createNetwork(options: CreateNetworkOptions): Promise<CliResult<string>> {
        const args = ['network', 'create'];
        if (options.driver) {
            args.push('--driver', options.driver);
        }
        if (options.subnet) {
            args.push('--subnet', options.subnet);
        }
        if (options.gateway) {
            args.push('--gateway', options.gateway);
        }
        if (options.internal) {
            args.push('--internal');
        }
        if (options.labels) {
            for (const [key, value] of Object.entries(options.labels)) {
                args.push('--label', `${key}=${value}`);
            }
        }
        args.push(options.name);
        return this.execute<string>(args);
    }

    /**
     * Delete a network
     */
    async deleteNetwork(id: string): Promise<CliResult<string>> {
        return this.execute<string>(['network', 'delete', id]);
    }

    // ==================== System Operations ====================

    /**
     * Get system information
     */
    async getSystemInfo(): Promise<Record<string, unknown> | undefined> {
        const result = await this.execute<Record<string, unknown>>(['system', 'info', '--format', 'json'], true);
        if (result.success && result.data) {
            return result.data;
        }
        return undefined;
    }
}
