Mastra & custom backends
Extending Mastra
Connecting Cedar-OS with Mastra

Mastra is a full-featured typescript framework to build agents. It provides memory, tool calls, knowledge base, and more. It’s our personal recommended choice when building complex agents.
​
Initial Configuration
1
Set up your project

Run plant-seed and select either:
Mastra starter - for a complete setup with both frontend and backend
Mastra reference repo - to see a full implementation example
If you already have a Mastra backend, use the blank frontend cedar repo option instead.
For reference, you can still follow the official Mastra guide: Install using the create-mastra CLI.
2
Wrap your app with CedarCopilot

Wrap your application with the CedarCopilot provider to connect to your Mastra backend:

Copy

Ask AI
import { CedarCopilot } from 'cedar-os';
function App() {
	return (
		<CedarCopilot
			llmProvider={{
				provider: 'mastra',
				baseURL: 'http://localhost:4111', // default dev port for Mastra
				apiKey: process.env.NEXT_PUBLIC_MASTRA_API_KEY, // optional — only for backend auth
			}}>
			<YourApp />
		</CedarCopilot>
	);
}
3
Configure Mastra endpoints to talk to Cedar

Configure your Mastra backend to work with Cedar by following the Mastra-specific configuration options: Mastra Configuration Options
Register API routes in your Mastra server so Cedar’s chat components have something to talk to:
mastra/src/index.ts

Copy

Ask AI
import { registerApiRoute } from '@mastra/core/server';

// POST /chat
// The chat's non-streaming default endpoint
registerApiRoute('/chat', {
	method: 'POST',
	// …validate input w/ zod
	handler: async (c) => {
		/* your agent.generate() logic */
	},
});

// POST /chat/stream (SSE)
// The chat's streaming default endpoint
registerApiRoute('/chat/stream', {
	method: 'POST',
	handler: async (c) => {
		/* stream agent output in SSE format */
	},
});
4
Add Cedar Chat

Drop a Cedar chat component into your frontend – see Chat Overview. Your backend and frontend are now linked! You’re ready to start bringing the power of your Mastra agentic workflows to your UI.
​
Type Safety
Mastra backends support full end-to-end type safety using MastraParams<T, E>:

Copy

Ask AI
// Use MastraParams for type-safe requests
type MastraParams<
	T extends Record<string, unknown> = Record<string, never>,
	E = object
> = BaseParams<T, E> & {
	route: string;
	resourceId?: string;
	threadId?: string;
};
The MastraParams type allows you to:
T: Define types for your additionalContext data
E: Define types for custom fields (userId, sessionId, etc.)
For complete type safety implementation, validation with Zod schemas, and detailed examples, see Typing Agent Requests.
​
Features to explore
Now that you have Cedar-OS connected to Mastra, explore these powerful features:
State Access & Manipulation - Use the useRegisterState hook for communicating frontend state and letting agents manipulate your frontend state
Mentions & Context - Send @ mentions to your backend using the useStateBasedMentionProvider
​
New to Mastra? Here are a few primitives to understand
Agent
Tool
Workflow
index.ts

Copy

Ask AI
// Agents encapsulate instructions, model, memory and tools
export const roadmap = new Agent({
  name: 'Roadmap',
  model: openai('gpt-4o-mini'),
  tools: { upvoteTool },
  instructions: `You are …`,
});
// Docs: https://mastra.ai/en/docs/agents/overview
​
Deployment
The recommended deployment setup is:
Frontend: Deploy to Vercel for optimal performance and seamless integration
Backend: Use Mastra Cloud for hosting your Mastra server
​
Next Steps
Clone & run the cedar-mastra-starter to see everything in action.
Explore the official Mastra docs for further customisation.
Processing agent responses
Custom Backend Implementation
Ask a question...

github
Powered by Mintlify