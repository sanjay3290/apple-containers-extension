# 🍎 Apple Containers for VS Code

A Visual Studio Code extension for managing Apple Containers directly from your editor. Apple Containers is a lightweight alternative to Docker on macOS, offering native virtualization with better performance and lower resource usage.

## ✨ Features

### Container Management
- **View all containers** - See running and stopped containers in a tree view
- **Start/Stop/Restart** - Control container lifecycle with one click
- **Attach shell** - Open an interactive terminal inside running containers
- **View logs** - Stream container logs in real-time
- **Inspect** - View detailed JSON configuration
- **Live stats** - Monitor CPU, memory, and network usage

### Image Management
- **Browse images** - View all local container images
- **Pull images** - Download images from registries
- **Build images** - Build from Dockerfile or Containerfile
- **Delete/Prune** - Clean up unused images

### Volume Management
- **Create volumes** - Set up persistent storage
- **Inspect volumes** - View volume details and mountpoints
- **Delete/Prune** - Remove unused volumes

### Network Management
- **Create networks** - Set up custom container networks
- **Configure IPAM** - Define subnets and gateways
- **Inspect networks** - View network configuration

### Additional Features
- **Status bar integration** - Shows running container count
- **Auto-refresh** - Keeps views up to date automatically
- **Context menus** - Right-click actions for quick access
- **Configurable** - Customize behavior through settings

## 📋 Requirements

- **macOS** - Apple Containers only runs on macOS
- **Apple Containers CLI** - The `container` command must be installed
- **VS Code 1.85.0+** - Required for extension features

## 🚀 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (⌘+Shift+X)
3. Search for "Apple Containers"
4. Click Install

### From VSIX
```bash
code --install-extension apple-containers-0.1.0.vsix
```

### Build from Source
```bash
git clone https://github.com/sanjay3290/apple-containers-extension.git
cd apple-containers-extension
npm install
npm run compile
```

## 🎯 Usage

### Quick Start

1. Open the Apple Containers sidebar (container icon in activity bar)
2. View your containers, images, volumes, and networks
3. Right-click items for context actions
4. Use the command palette (⌘+Shift+P) for additional commands

### Run a Container

1. Click the play button in the Containers view title bar
2. Enter the image name (e.g., `nginx:latest`, `ubuntu:22.04`)
3. Optionally set a container name
4. Select options (interactive, remove on exit, etc.)
5. The container starts in a terminal or background

### Build an Image

1. Click the tools button in the Images view title bar
2. Select the build context (workspace folder)
3. Choose a Dockerfile if multiple exist
4. Enter the image tag
5. The build runs in a terminal

### Pull an Image

1. Click the cloud download button in the Images view
2. Enter the image name and tag
3. Select platform (arm64 or amd64 with Rosetta)
4. The pull runs in a terminal with progress

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `appleContainers.containerPath` | `container` | Path to the container CLI |
| `appleContainers.refreshInterval` | `5000` | Auto-refresh interval in ms (0 to disable) |
| `appleContainers.showStoppedContainers` | `true` | Show stopped containers in list |
| `appleContainers.defaultShell` | `/bin/sh` | Default shell for attach |
| `appleContainers.confirmBeforeDelete` | `true` | Confirm before deleting resources |

## 🔧 Commands

All commands are available in the Command Palette (⌘+Shift+P) under "Apple Containers":

| Command | Description |
|---------|-------------|
| `Apple Containers: Refresh` | Refresh all views |
| `Apple Containers: Run Container...` | Run a new container |
| `Apple Containers: Pull Image...` | Pull an image from registry |
| `Apple Containers: Build Image...` | Build from Dockerfile |
| `Apple Containers: Create Volume...` | Create a new volume |
| `Apple Containers: Create Network...` | Create a new network |
| `Apple Containers: Prune Unused Images` | Remove dangling images |
| `Apple Containers: Prune Unused Volumes` | Remove unused volumes |
| `Apple Containers: Open Settings` | Open extension settings |

## 🆚 Docker vs Apple Containers

| Feature | Docker Desktop | Apple Containers |
|---------|---------------|------------------|
| Resource usage | High (VM overhead) | Low (native virtualization) |
| Startup time | Slower | Faster |
| macOS integration | Requires license | Native Apple technology |
| ARM64 support | Good | Excellent (native) |
| x86 emulation | Rosetta 2 | Rosetta 2 |
| Compose support | Full | Limited |
| Linux compatibility | Full | Full |

## 🐛 Troubleshooting

### CLI Not Found
If the extension can't find the `container` CLI:
1. Open Settings (⌘+,)
2. Search for "appleContainers.containerPath"
3. Set the full path to the container binary

### Permissions
If you get permission errors:
```bash
# Ensure container CLI has execute permission
chmod +x /path/to/container
```

### Connection Issues
If containers fail to start:
1. Check Apple Containers daemon is running
2. Verify network settings
3. Check the output channel for errors (View > Output > Apple Containers)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Apple for the Containers technology
- VS Code team for the excellent extension API
- The container community for inspiration

---

**Enjoy managing containers the Apple way! 🍎**
