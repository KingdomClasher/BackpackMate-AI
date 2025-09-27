Connecting to an Agent
Agent Backend Connection
Overview of connecting AI agents to Cedar-OS

If you already have your backend setup, you can skip this. Move onto Creating custom agent flows and Processing agent responses to understand how Cedar-OS makes a network call and handles the response.
Before we get to the juicy interactions like speaking to your AI for it to do work inside your applications, we have to connect to the agent!
Cedar-OS has working configurations with every major backend. We support:
Mastra - Full-featured agent framework with memory, tools, and knowledge base
AI SDK - Vercel’s unified AI SDK supporting multiple providers
OpenAI - Direct OpenAI API integration
Anthropic - Direct Anthropic API integration
Custom Backend - Build your own integration
​
How to choose your provider
You want a full-featured agent: Mastra - When you need memory across sessions (conversation history), tool calls, knowledge base, and more complex agent capabilities.
Simplicity: AI SDK - One interface, multiple providers. Perfect for getting started quickly.
You only have one API Key: Anthropic/OpenAI - Direct integration with a single provider.
You already have a custom backend (e.g Langchain): Custom Backend - glad I could help :^)
​
Initial Configuration
Choose your provider and configure it with the CedarCopilot component. By default, this will make your chat and all other functions to the backend work

AI SDK

OpenAI

Anthropic

Mastra

Custom Backend

Copy

Ask AI
import { CedarCopilot } from 'cedar-os';

// TypeScript Type
type AISDKConfig = {
	provider: 'ai-sdk';
	providers: {
		openai?: { apiKey: string };
		anthropic?: { apiKey: string };
		google?: { apiKey: string };
		mistral?: { apiKey: string };
		groq?: { apiKey: string };
		xai?: { apiKey: string };
	};
};

function App() {
	return (
		// You don't need to put every model,
		// but if you try to use a model without a key it will fail
		<CedarCopilot
			llmProvider={{
				provider: 'ai-sdk',
				providers: {
					openai: {
						apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
					},
					anthropic: {
						apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
					},
					google: {
						apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
					},
					groq: {
						apiKey: process.env.GROQ_API_KEY,
					},
					xai: {
						apiKey: process.env.XAI_API_KEY,
					},
				},
			}}>
			<YourApp />
		</CedarCopilot>
	);
}
​
Mastra Configuration Options
When using the Mastra provider, you have additional configuration options:
baseURL: The base URL of your Mastra backend (required)
apiKey: Optional API key if your backend requires authentication
chatPath: Optional base path for chat endpoints (defaults to /chat)
voiceRoute: Optional route for voice endpoints (automatically configures voice endpoint)
The chatPath parameter is particularly useful if your Mastra backend uses a different base path for chat endpoints. For example:
With default chatPath: '/chat': Routes become /chat/execute-function, /chat/init, etc.
With custom chatPath: '/api/v1/chat': Routes become /api/v1/chat/execute-function, /api/v1/chat/init, etc.
The voiceRoute parameter automatically configures the voice endpoint by combining it with the baseURL. For example:
With baseURL: 'http://localhost:3000/api' and voiceRoute: '/chat/voice-execute': Voice endpoint becomes http://localhost:3000/api/chat/voice-execute
If not specified, the voice endpoint remains at the default value and must be configured manually
The high-level sendMessage() function (that handles sending the chat), calls by default:
${chatPath} (on message send, non-streaming)
${chatPath}/stream (on message send, streaming).
You can still override this by passing a custom route parameter to sendMessage().
​
Typed Provider Connection
Cedar-OS provides full TypeScript support with provider-specific parameter types:
Important: The additionalContext field is now passed as a structured object (not stringified) to Mastra and Custom backends. For direct LLM providers (OpenAI, Anthropic, AI-SDK), Cedar automatically stringifies the context within the prompt text.
​
Request Types
Configurable Providers (support custom fields via generics):

Copy

Ask AI
// MastraParams - for Mastra backends
type MastraParams<
	T extends Record<string, unknown> = Record<string, never>, // For typing the additionalContext field on Base Params
	E = object // For adding additional params to your backend connection
> = BaseParams<T, E> & {
	route: string;
	resourceId?: string;
	threadId?: string;
};

// CustomParams - for custom backends
type CustomParams<
	T extends Record<string, unknown> = Record<string, never>,
	E = object
> = BaseParams<T, E> & {
	userId?: string;
	threadId?: string;
};
Standardized Providers (fixed APIs):

Copy

Ask AI
// Fixed parameter types - no custom fields
interface OpenAIParams extends BaseParams {
	model: string;
}

interface AnthropicParams extends BaseParams {
	model: string;
}

interface AISDKParams extends BaseParams {
	model: string; // Format: "provider/model"
}
​
Response Types

Copy

Ask AI
// What all providers return
export interface LLMResponse {
	content: string; // The agent's text response
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	metadata?: Record<string, unknown>;
	object?: StructuredResponseType | StructuredResponseType[]; // For structured outputs
}

// For voice-enabled providers
interface VoiceLLMResponse extends LLMResponse {
	transcription?: string;
	audioData?: string; // Base64 encoded audio
	audioUrl?: string;
	audioFormat?: string;
}
​
Zod Types
All agent connection types are exposed as Zod schemas for runtime validation on the backend:

Copy

Ask AI
import { MastraParamsSchema } from 'cedar-os';

// Backend validation example
const requestSchema = MastraParamsSchema(
	UserContextSchemas, // Zod schemas for your context data
	z.object({
		// Custom fields schema
		userId: z.string(),
		sessionId: z.string(),
	})
);

// Validate incoming requests with full type safety
const validatedParams = requestSchema.parse(incomingRequest);
For comprehensive type safety implementation and examples, see Typing Agent Requests and Typing Agent Responses.
​
Best Practices
When designing agentic workflows, the best practice for working with Cedar-OS is to create typed functions with hardcoded system prompts in a single file. This approach ensures consistency, type safety, and reusability across your application.

AI SDK

OpenAI

Anthropic

Mastra

Custom Backend

Copy

Ask AI
import { useTypedAgentConnection } from 'cedar-os';
import { z } from 'zod';

// Get a typed connection for AI SDK
const { callLLM, streamLLM, callLLMStructured } =
	useTypedAgentConnection('ai-sdk');

interface AISDKParams extends BaseParams {
	model: string; // Format: "provider/model" e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet"
}

// Example with OpenAI model through AI SDK
const openaiResponse = await callLLM({
	model: 'openai/gpt-4o',
	prompt: 'Hello, AI!',
	systemPrompt: 'You are a helpful assistant.',
});

// Example with Anthropic model through AI SDK
const anthropicResponse = await callLLM({
	model: 'anthropic/claude-3-sonnet',
	prompt: 'Hello, AI!',
	systemPrompt: 'You are a helpful assistant.',
});

// Example with xAI Grok model through AI SDK
const grokResponse = await callLLM({
	model: 'xai/grok-beta',
	prompt: 'Hello, AI!',
	systemPrompt: 'You are a helpful assistant.',
});

// Structured response example with Zod schema
const ProductSchema = z.object({
	name: z.string(),
	price: z.number(),
	category: z.string(),
	inStock: z.boolean(),
	description: z.string(),
});

type Product = z.infer<typeof ProductSchema>;

const structuredResponse: Product = await callLLMStructured({
	model: 'openai/gpt-4o',
	prompt: 'Generate a product for a tech store',
	systemPrompt: 'You are a product generator for an electronics store.',
	schema: ProductSchema,
});

// structuredResponse.object is now fully typed as Product
console.log(structuredResponse.object.name); // string
console.log(structuredResponse.object.price); // number
console.log(structuredResponse.object.inStock); // boolean
For more advanced usage, see our guides on:
Chat Input - Building rich chat interfaces
Messages - Handling AI responses
State Access - Managing application state
​
Detailed Provider Guides
For more advanced configuration and usage patterns:
Extending Mastra - Full agent framework with backend extension guides
Custom Backend - Build your own integration through API
Debugger Panel
Creating custom agent flows
Ask a question...

