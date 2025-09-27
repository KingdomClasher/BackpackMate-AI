Getting Started
Templates & CLI guide
Available CLI commands to create with, add, and become more advanced with Cedar

The Cedar CLI is a command-line tool that makes it easy to create new Cedar projects or add Cedar components to existing ones. It intelligently detects your environment and guides you through the setup process.
Because Cedar downloads files locally, it is recommended to always run these commands on a clean branch in case any components get overwritten.
​
Quick Start
For most users, simply run:

Copy

Ask AI
npx cedar-os-cli plant-seed
This will launch the smart plant-seed command that detects your environment and does the right thing automatically to add Cedar to your project. It guides you through all the steps you need.
​
Available Commands
​
cedar plant-seed (Recommended)
The smart command that automatically detects your environment and takes the appropriate action:
New project: Offers template selection → Creates project → Installs Cedar
Existing Next.js/React project: Detects and just adds Cedar and its dependencies
Usage:

Copy

Ask AI
npx cedar-os-cli plant-seed
Options:
-p, --project-name <name> - Project directory name (prompts if not provided)
-y, --yes - Skip all prompts and use defaults (Mastra template for new projects)
​
cedar add-sapling
Installs the latest version of Cedar-OS and optionally downloads Cedar UI components. Use to refresh your environment after Cedar updaes.
Usage:

Copy

Ask AI
npx cedar-os-cli add-sapling
Options:
-d, --dir <path> - Installation directory (default: src/cedar/components)
-c, --components <names...> - Specific components to install
-a, --all - Install all available components
-y, --yes - Skip confirmation prompts and auto-install dependencies
​
cedar pluck-component
Downloads specific Cedar components locally from an existing npm installation. Use this when you’ve installed cedar-os-components via npm but want to customize specific components.
Usage:

Copy

Ask AI
npx cedar-os-cli pluck-component
Options:
-d, --dir <path> - Installation directory (default: src/cedar/components)
-c, --components <names...> - Specific components to download
-a, --all - Download all available components
-y, --yes - Skip confirmation prompts
You can either:
Pass one or more component names with -c to download them directly, e.g.

Copy

Ask AI
npx cedar-os-cli pluck-component -c FloatingCedarChat TooltipMenu
Omit -c to open an interactive list where you can select components.
​
Project Templates
When creating new projects, you can choose from several templates, or a blank NextJS component with all dependencies installed:
​
Blank Cedar Project
What: Next.js app with Cedar components (no backend)
Includes: Basic Cedar setup using OpenAI API directly
Repository: cedar-blank
​
Mastra Blank
What: Next.js app with Mastra backend scaffolding
Includes: Monorepo structure, automatic backend connection setup, minimal Cedar integration
Repository: cedar-mastra-blank
​
Mastra Reference Repo
What: Complete Cedar implementation with Mastra backend
Includes: All Cedar features, backend integration, example implementations
Best for: Learning Cedar features (or if anything in our docs is confusing)
Repository: cedar-mastra-starter
​
Installation Fails
If automatic installation fails, the CLI will show manual installation steps:

Copy

Ask AI
# Manual Next.js creation
npx create-next-app@latest my-project
cd my-project
npx cedar-os-cli add-sapling

# Or follow the manual installation guide
​
Next Steps
After using the CLI:
Configure your Cedar setup following the organizing a Cedar project guide
Set up your backend connection with agent backend connection
Customize your chat interface using chat components
Cedar-OS Hackathon Starter
Organizing a cedar project
Ask a question...

github