Getting Started
Getting Started Overview
Complete guide to getting started with Cedar-OS

Cedar-OS is an open-source framework for building AI-native applications. This guide will walk you through setting up your first Cedar-OS application with chat functionality, AI backend integration, and state management.
​
Installing Cedar-OS
​
With Cedar-CLI
1
Check Prerequisites

Cedar-OS requires:
React 18.2.0 or higher
React DOM 18.2.0 or higher
Node.js 18+ (for development)
Framework Support:
✅ Next.js (Recommended) - Full support with optimal performance
✅ Create React App - Supported with additional configuration
✅ Vite + React - Supported with additional configuration
✅ Other React frameworks - May require manual setup
2
Install using the cedar-os-cli

Our CLI is the fastest way to get started with Cedar-OS. For most users, run this command - it automatically detects your setup and does the right thing:

Copy

Ask AI
npx cedar-os-cli plant-seed
What plant-seed does:
New project: Offers template selection → Creates project → Adds Cedar components
Recommended: We highly recommend starting with the Mastra template. It requires the least configuration and is the most powerful way to use Cedar-OS.
Existing Next.js project: Automatically adds Cedar components and required dependencies to your project
Existing React project: Adds Cedar components with a note about Next.js being optimal
About Cedar components: Cedar-OS uses a shadcn-style approach - components are copied directly into your project (not installed as dependencies). This gives you full control to customize, modify, and style the components as needed for your application.
When to use add-sapling instead:
Use this command to install cedar-os and download Cedar components in an existing project if plant-seed fails.

Copy

Ask AI
# Add Cedar components and install dependencies only
npx cedar-os-cli add-sapling
Using CLI flags
You can skip prompts using the --yes flag:

Copy

Ask AI
npx cedar-os-cli plant-seed --project-name my-cedar-tree --yes
3
Add your API key

Create a .env.local file in your project root and add your OpenAI API key:

Copy

Ask AI
# For client-side access (Cedar-OS components in browser)
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key

# For server-side access (API routes, server components)
OPENAI_API_KEY=your-openai-api-key
Choose based on your setup:
Use NEXT_PUBLIC_OPENAI_API_KEY if Cedar-OS will make API calls directly from the browser
Use OPENAI_API_KEY if you’re routing calls through your backend/API routes
You can include both if you need access from both client and server
This will be based on your agent configuration, see Agent Backend Connection for detailed configuration options.
4
Initialize CedarCopilot

Wrap your app with the CedarCopilot component and configure your AI provider:
Important: CedarCopilot must be used in a client component. Add "use client" at the top of any file that uses CedarCopilot.

Mastra

AI SDK

OpenAI

Anthropic

Custom Backend

Copy

Ask AI
"use client";

import { CedarCopilot } from 'cedar-os';

function App() {
	return (
		<CedarCopilot
			llmProvider={{
				provider: 'mastra',
				baseURL: 'http://localhost:4111', // Your Mastra backend URL
				apiKey: process.env.MASTRA_API_KEY, // Optional: only if your backend requires auth
			}}>
			<YourApp />
		</CedarCopilot>
	);
}
See Agent Backend Connection for more details. Now you’re ready to add a chat!
5
Using Cedar

Now that you have Cedar-OS installed and configured, here are your next steps to build your AI-native application:
Choose your next feature:
Configuring a Chat - Set up chat interfaces with ChatInput and ChatBubbles components for seamless AI conversations
Adding State Access - Enable AI agents to read and modify your application state using useCedarState
Using Spells - Create interactive radial menus and quick actions for enhanced user experience
Quick start examples:

Chat Setup

State Access

Spells Integration

Copy

Ask AI
import { FloatingCedarChat } from 'cedar-os';

function ChatApp() {
  return (
    <div className="h-screen">
      {/* This automatically works */}
      <FloatingCedarChat />
    </div>
  );
}
​
Next Steps
Now that you have Cedar-OS set up with basic functionality:
Explore Advanced Features: Check out Voice Integration, Custom Message Types, and Advanced State Management.
Try Different Providers: Experiment with Mastra for full-featured agents or Direct Provider Integration.
Customize the UI: Learn about Styling and Theming to match your brand.
Build Complex Workflows: Explore our Examples to see Cedar-OS in action with real applications.
​
If Things Are Going Wrong
​
Manual Installation (CLI Fallback)
Look at our CLI guide for more options of CLI commands you can try. If all CLI commands are failing, you can manually install Cedar-OS:
1
Install the cedar-os package


npm

yarn

pnpm

bun

Copy

Ask AI
npm install cedar-os
2
Copy component source code

You will need to manually copy the component source code locally. The component files can be found here: Cedar-OS Components
Copy the components you need into your project’s component directory (typically src/components/cedar-os/).
3
Install dependencies

First set up Tailwind CSS (required for Cedar styling) (look at these docs for framework specific instructions)
Then install the runtime dependencies for Cedar-OS components:

npm

yarn

pnpm

bun

Copy

Ask AI
npm install lucide-react motion motion-plus-react uuid react-markdown framer-motion @radix-ui/react-slot class-variance-authority
​
Troubleshooting Common Issues
Components not rendering: Make sure you’ve wrapped your app with CedarCopilot.
Components missing ALL styling: If Cedar-OS components are missing all styling (we promise they are beautiful!), make sure you have Tailwind CSS configured in your project.
Don’t see the chat?: Make sure you add the correct chat component inside the <CedarCopilot> boundary. See Chat Overview for setup instructions.
AI calls failing: Check that your API keys are correctly set in environment variables and accessible in your client code.
Using with non-Next.js frameworks: While Cedar-OS works with Create React App, Vite, and other React frameworks, you may need to manually configure Tailwind CSS and ensure proper client-side rendering for optimal performance.
TypeScript errors: Cedar-OS is fully typed - check that you’re importing types correctly and using the right component props.
Need help? Check our Community Discord or GitHub Issues. We’re always here to help :-D
Demo Showcases
Cedar-OS Hackathon Starter
Ask a question...

github