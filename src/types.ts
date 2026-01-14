/**
 * Apple Containers - Type Definitions
 * Defines interfaces for containers, images, volumes, and networks
 */

/**
 * Container status enumeration
 */
export enum ContainerStatus {
    Running = 'running',
    Stopped = 'stopped',
    Created = 'created',
    Paused = 'paused',
    Exited = 'exited',
    Unknown = 'unknown'
}

/**
 * Container information returned by `container list`
 */
export interface Container {
    id: string;
    name: string;
    image: string;
    status: ContainerStatus;
    created: string;
    ports?: PortMapping[];
    labels?: Record<string, string>;
}

/**
 * Port mapping for container
 */
export interface PortMapping {
    hostIp?: string;
    hostPort: number;
    containerPort: number;
    protocol: 'tcp' | 'udp';
}

/**
 * Container inspect result
 */
export interface ContainerInspect {
    id: string;
    name: string;
    image: string;
    imageId: string;
    status: ContainerStatus;
    created: string;
    started?: string;
    finished?: string;
    exitCode?: number;
    pid?: number;
    restartCount: number;
    platform: {
        os: string;
        arch: string;
    };
    config: {
        env?: string[];
        cmd?: string[];
        entrypoint?: string[];
        workingDir?: string;
        user?: string;
    };
    resources: {
        cpus?: number;
        memory?: string;
    };
    mounts?: Mount[];
    networks?: NetworkAttachment[];
    ports?: PortMapping[];
}

/**
 * Container mount point
 */
export interface Mount {
    type: 'bind' | 'volume' | 'tmpfs';
    source: string;
    target: string;
    readonly: boolean;
}

/**
 * Network attachment for container
 */
export interface NetworkAttachment {
    name: string;
    ipAddress?: string;
    macAddress?: string;
}

/**
 * Image information returned by `container image list`
 */
export interface Image {
    id: string;
    repository: string;
    tag: string;
    digest?: string;
    size: string;
    sizeBytes?: number;
    created: string;
    labels?: Record<string, string>;
}

/**
 * Image inspect result
 */
export interface ImageInspect {
    id: string;
    repository: string;
    tag: string;
    digest?: string;
    created: string;
    size: string;
    sizeBytes?: number;
    platform: {
        os: string;
        arch: string;
    };
    config: {
        env?: string[];
        cmd?: string[];
        entrypoint?: string[];
        workingDir?: string;
        user?: string;
        exposedPorts?: string[];
        volumes?: string[];
        labels?: Record<string, string>;
    };
    layers?: string[];
}

/**
 * Volume information returned by `container volume list`
 */
export interface Volume {
    name: string;
    driver?: string;
    mountpoint?: string;
    created?: string;
    labels?: Record<string, string>;
    scope?: string;
}

/**
 * Volume inspect result
 */
export interface VolumeInspect extends Volume {
    options?: Record<string, string>;
    status?: Record<string, string>;
}

/**
 * Network information returned by `container network list`
 */
export interface Network {
    id: string;
    name: string;
    driver?: string;
    scope?: string;
    internal?: boolean;
    ipam?: {
        driver?: string;
        config?: Array<{
            subnet?: string;
            gateway?: string;
        }>;
    };
    labels?: Record<string, string>;
}

/**
 * Network inspect result
 */
export interface NetworkInspect extends Network {
    containers?: Array<{
        id: string;
        name: string;
        ipAddress?: string;
        macAddress?: string;
    }>;
    options?: Record<string, string>;
}

/**
 * Container resource stats
 */
export interface ContainerStats {
    id: string;
    name: string;
    cpuPercent: number;
    memoryUsage: string;
    memoryLimit: string;
    memoryPercent: number;
    networkIn: string;
    networkOut: string;
    blockIn: string;
    blockOut: string;
    pids: number;
}

/**
 * Run container options
 */
export interface RunContainerOptions {
    image: string;
    name?: string;
    detach?: boolean;
    interactive?: boolean;
    tty?: boolean;
    remove?: boolean;
    env?: Record<string, string>;
    envFile?: string;
    ports?: Array<{
        host: number;
        container: number;
        hostIp?: string;
        protocol?: 'tcp' | 'udp';
    }>;
    volumes?: Array<{
        source: string;
        target: string;
        readonly?: boolean;
    }>;
    mounts?: Array<{
        type: 'bind' | 'volume' | 'tmpfs';
        source: string;
        target: string;
        readonly?: boolean;
    }>;
    network?: string;
    workdir?: string;
    user?: string;
    cpus?: number;
    memory?: string;
    entrypoint?: string;
    cmd?: string[];
    platform?: string;
    labels?: Record<string, string>;
    dns?: string[];
    dnsSearch?: string[];
    rosetta?: boolean;
    ssh?: boolean;
}

/**
 * Build image options
 */
export interface BuildImageOptions {
    context: string;
    dockerfile?: string;
    tag?: string;
    tags?: string[];
    buildArgs?: Record<string, string>;
    target?: string;
    platform?: string;
    noCache?: boolean;
    pull?: boolean;
    labels?: Record<string, string>;
}

/**
 * Pull image options
 */
export interface PullImageOptions {
    image: string;
    platform?: string;
    allTags?: boolean;
}

/**
 * Create volume options
 */
export interface CreateVolumeOptions {
    name: string;
    driver?: string;
    labels?: Record<string, string>;
    options?: Record<string, string>;
}

/**
 * Create network options
 */
export interface CreateNetworkOptions {
    name: string;
    driver?: string;
    subnet?: string;
    gateway?: string;
    internal?: boolean;
    labels?: Record<string, string>;
}

/**
 * CLI execution result
 */
export interface CliResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    exitCode: number;
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
    containerPath: string;
    refreshInterval: number;
    showStoppedContainers: boolean;
    defaultShell: string;
    confirmBeforeDelete: boolean;
}
