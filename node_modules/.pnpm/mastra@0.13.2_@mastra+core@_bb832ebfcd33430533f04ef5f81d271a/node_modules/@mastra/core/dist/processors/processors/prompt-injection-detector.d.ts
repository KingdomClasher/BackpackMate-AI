import type { MastraMessageV2 } from '../../agent/message-list/index.js';
import type { TracingContext } from '../../ai-tracing/index.js';
import type { MastraLanguageModel } from '../../llm/model/shared.types.js';
import type { Processor } from '../index.js';
/**
 * Confidence scores for each detection category (0-1)
 */
export interface PromptInjectionCategoryScores {
    injection?: number;
    jailbreak?: number;
    'tool-exfiltration'?: number;
    'data-exfiltration'?: number;
    'system-override'?: number;
    'role-manipulation'?: number;
    [customType: string]: number | undefined;
}
/**
 * Result structure for prompt injection detection
 */
export interface PromptInjectionResult {
    categories?: PromptInjectionCategoryScores;
    reason?: string;
    rewritten_content?: string;
}
/**
 * Configuration options for PromptInjectionDetector
 */
export interface PromptInjectionOptions {
    /** Model configuration for the detection agent */
    model: MastraLanguageModel;
    /**
     * Detection types to check for.
     * If not specified, uses default categories.
     */
    detectionTypes?: string[];
    /**
     * Confidence threshold for flagging (0-1, default: 0.7)
     * Higher threshold = less sensitive to avoid false positives
     */
    threshold?: number;
    /**
     * Strategy when injection is detected:
     * - 'block': Reject the entire input with an error (default)
     * - 'warn': Log warning but allow content through
     * - 'filter': Remove flagged messages but continue with remaining
     * - 'rewrite': Attempt to neutralize the injection while preserving intent
     */
    strategy?: 'block' | 'warn' | 'filter' | 'rewrite';
    /**
     * Custom detection instructions for the agent
     * If not provided, uses default instructions based on detection types
     */
    instructions?: string;
    /**
     * Whether to include confidence scores in logs (default: false)
     * Useful for tuning thresholds and debugging
     */
    includeScores?: boolean;
}
/**
 * PromptInjectionDetector uses an internal Mastra agent to identify and handle
 * prompt injection attacks, jailbreaks, and tool/data exfiltration attempts.
 *
 * Provides multiple response strategies including content rewriting to neutralize
 * attacks while preserving legitimate user intent.
 */
export declare class PromptInjectionDetector implements Processor {
    readonly name = "prompt-injection-detector";
    private detectionAgent;
    private detectionTypes;
    private threshold;
    private strategy;
    private includeScores;
    private static readonly DEFAULT_DETECTION_TYPES;
    constructor(options: PromptInjectionOptions);
    processInput(args: {
        messages: MastraMessageV2[];
        abort: (reason?: string) => never;
        tracingContext?: TracingContext;
    }): Promise<MastraMessageV2[]>;
    /**
     * Detect prompt injection using the internal agent
     */
    private detectPromptInjection;
    /**
     * Determine if prompt injection is flagged based on category scores above threshold
     */
    private isInjectionFlagged;
    /**
     * Handle detected prompt injection based on strategy
     */
    private handleDetectedInjection;
    /**
     * Create a rewritten message with neutralized content
     */
    private createRewrittenMessage;
    /**
     * Extract text content from message for analysis
     */
    private extractTextContent;
    /**
     * Create default detection instructions
     */
    private createDefaultInstructions;
    /**
     * Create detection prompt for the agent
     */
    private createDetectionPrompt;
}
//# sourceMappingURL=prompt-injection-detector.d.ts.map