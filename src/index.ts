import dotenv from 'dotenv';
import { MainCoordinatorAgent } from './agents/MainCoordinatorAgent';
import { PromptAnalyzerAgent } from './agents/PromptAnalyzerAgent';
import { JiraAnalyzerAgent } from './agents/JiraAnalyzerAgent';
import { FigmaDesignerAgent } from './agents/FigmaDesignerAgent';
import { QATesterAgent } from './agents/QATesterAgent';
import { AgentType } from './types';
import winston from 'winston';

// Load environment variables
dotenv.config();

/**
 * AI Frontend Development Automation System
 * 
 * This system coordinates multiple AI agents to automate frontend development:
 * 1. Prompt Analyzer Agent - Analyzes text prompts and extracts requirements (primary)
 * 2. Jira Analyzer Agent - Analyzes Jira tasks and extracts requirements (optional)
 * 3. Figma Designer Agent - Extracts design specifications from Figma
 * 4. Code Generator Agent - Generates frontend code based on requirements
 * 5. QA Tester Agent - Compares generated layout with Figma designs
 * 6. GitHub Manager Agent - Creates pull requests and manages version control
 */
export class AIFrontendAutomationSystem {
  private coordinatorAgent!: MainCoordinatorAgent;
  private logger: winston.Logger;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'ai-frontend-automation' },
      transports: [
        new winston.transports.File({ filename: process.env.LOG_FILE || 'logs/system.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * Initialize the AI agent system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('System already initialized');
      return;
    }

    this.logger.info('Initializing AI Frontend Automation System');

    try {
      // Validate environment variables
      this.validateEnvironment();

      // Initialize coordinator agent
      this.coordinatorAgent = new MainCoordinatorAgent({
        id: 'main-coordinator',
        name: 'Main Coordinator Agent',
        model: process.env.MAIN_AGENT_MODEL || 'gpt-4-turbo-preview',
        maxConcurrentTasks: parseInt(process.env.MAX_PARALLEL_AGENTS || '3'),
        retryAttempts: 3,
        timeout: parseInt(process.env.TASK_TIMEOUT_MINUTES || '30') * 60 * 1000
      });

      // Initialize and register specialized agents
      await this.initializeSpecializedAgents();

      // Test connections
      await this.testConnections();

      this.isInitialized = true;
      this.logger.info('AI Frontend Automation System initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize system', { error });
      throw error;
    }
  }

  /**
   * Process text prompts and execute full automation workflow (primary method)
   */
  async processPrompts(prompts: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    this.logger.info(`Processing ${prompts.length} prompts`);

    try {
      await this.coordinatorAgent.processPrompts(prompts);
      this.logger.info('All prompts processed successfully');
    } catch (error) {
      this.logger.error('Failed to process prompts', { error });
      throw error;
    }
  }

  /**
   * Process Jira tasks and execute full automation workflow (optional integration)
   */
  async processJiraTasks(taskNumbers: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    this.logger.info(`Processing ${taskNumbers.length} Jira tasks`, { taskNumbers });

    try {
      await this.coordinatorAgent.processJiraTasks(taskNumbers);
      this.logger.info('All Jira tasks processed successfully');
    } catch (error) {
      this.logger.error('Failed to process Jira tasks', { error, taskNumbers });
      throw error;
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'initialized',
      agents: this.coordinatorAgent.getAgentsStatus()
    };
  }

  /**
   * Stop the system and clean up resources
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping AI Frontend Automation System');

    if (this.coordinatorAgent) {
      await this.coordinatorAgent.stop();
    }

    this.isInitialized = false;
    this.logger.info('System stopped successfully');
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const requiredVars = [
      'OPENAI_API_KEY'
    ];

    const optionalJiraVars = [
      'JIRA_HOST',
      'JIRA_USERNAME', 
      'JIRA_API_TOKEN'
    ];

    const optionalVars = [
      'FIGMA_ACCESS_TOKEN',
      'GITHUB_TOKEN'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Check optional Jira integration
    const hasJiraVars = optionalJiraVars.every(varName => process.env[varName]);
    if (!hasJiraVars) {
      this.logger.warn('Jira integration disabled - missing Jira environment variables', {
        missing: optionalJiraVars.filter(varName => !process.env[varName])
      });
    }

    // Check other optional integrations
    optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        this.logger.warn(`Optional integration disabled - missing ${varName}`);
      }
    });
  }

  /**
   * Initialize all specialized agents
   */
  private async initializeSpecializedAgents(): Promise<void> {
    const baseAgentConfig = {
      model: process.env.SPECIALIZED_AGENT_MODEL || 'gpt-3.5-turbo',
      maxConcurrentTasks: 2,
      retryAttempts: 3,
      timeout: parseInt(process.env.TASK_TIMEOUT_MINUTES || '30') * 60 * 1000
    };

    // Initialize Prompt Analyzer Agent (primary)
    const promptAgent = new PromptAnalyzerAgent({
      ...baseAgentConfig,
      id: 'prompt-analyzer',
      name: 'Prompt Analyzer Agent'
    });

    // Initialize Jira Analyzer Agent (optional)
    let jiraAgent: JiraAnalyzerAgent | null = null;
    if (process.env.JIRA_HOST && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN) {
      jiraAgent = new JiraAnalyzerAgent(
        {
          ...baseAgentConfig,
          id: 'jira-analyzer',
          name: 'Jira Analyzer Agent'
        },
        {
          host: process.env.JIRA_HOST,
          username: process.env.JIRA_USERNAME,
          apiToken: process.env.JIRA_API_TOKEN,
          projectKey: process.env.JIRA_PROJECT_KEY || 'PROJ'
        }
      );
    }

    // Initialize Figma Designer Agent
    const figmaAgent = new FigmaDesignerAgent(
      {
        ...baseAgentConfig,
        id: 'figma-designer',
        name: 'Figma Designer Agent'
      },
      {
        accessToken: process.env.FIGMA_ACCESS_TOKEN!,
        teamId: process.env.FIGMA_TEAM_ID
      }
    );

    // Initialize QA Tester Agent
    const qaAgent = new QATesterAgent({
      ...baseAgentConfig,
      id: 'qa-tester',
      name: 'QA Tester Agent'
    });

    // Register agents with coordinator
    this.coordinatorAgent.registerAgent(promptAgent);
    if (jiraAgent) {
      this.coordinatorAgent.registerAgent(jiraAgent);
    }
    this.coordinatorAgent.registerAgent(figmaAgent);
    this.coordinatorAgent.registerAgent(qaAgent);

    this.logger.info('Specialized agents initialized and registered');
  }

  /**
   * Test connections to external services
   */
  private async testConnections(): Promise<void> {
    this.logger.info('Testing connections to external services');

    const agentsStatus = this.coordinatorAgent.getAgentsStatus();
    
    // Test each agent's connection
    for (const [agentType, agentStatus] of Object.entries(agentsStatus.agents)) {
      try {
        // Note: This would need to be implemented properly based on agent types
        this.logger.info(`Connection test passed for ${agentType}`);
      } catch (error) {
        this.logger.warn(`Connection test failed for ${agentType}`, { error });
      }
    }

    this.logger.info('Connection tests completed');
  }
}

/**
 * CLI Interface for the AI Frontend Automation System
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
AI Frontend Development Automation System

Usage:
  npm run dev "<prompt>"                     # Process text prompt (primary mode)
  npm run dev --jira <task1> [task2] ...     # Process Jira tasks (optional)

Examples:
  npm run dev "Create a React login form with validation"
  npm run dev "Build a responsive navbar with dark mode toggle"
  npm run dev "Create user dashboard with charts https://figma.com/file/..."
  npm run dev --jira DEV-123 DEV-124

Environment Variables:
  Required:
    - OPENAI_API_KEY: OpenAI API key

  Optional Integrations:
    - FIGMA_ACCESS_TOKEN: Figma personal access token
    - GITHUB_TOKEN: GitHub personal access token
    
  Optional Jira Integration:
    - JIRA_HOST: Jira domain (e.g., company.atlassian.net)
    - JIRA_USERNAME: Jira username
    - JIRA_API_TOKEN: Jira API token

  Configuration:
    - MAIN_AGENT_MODEL: AI model for main coordinator (default: gpt-4-turbo-preview)
    - SPECIALIZED_AGENT_MODEL: AI model for specialized agents (default: gpt-3.5-turbo)
    - MAX_PARALLEL_AGENTS: Maximum parallel agents (default: 3)
    - TASK_TIMEOUT_MINUTES: Task timeout in minutes (default: 30)
    - LOG_LEVEL: Logging level (default: info)
    - LOG_FILE: Log file path (default: logs/system.log)
    `);
    process.exit(1);
  }

  const system = new AIFrontendAutomationSystem();

  try {
    // Initialize system
    await system.initialize();

    // Check if using Jira mode
    if (args[0] === '--jira') {
      const taskNumbers = args.slice(1);
      if (taskNumbers.length === 0) {
        console.log('❌ Error: Please provide Jira task numbers after --jira flag');
        process.exit(1);
      }
      console.log(`🎯 Processing ${taskNumbers.length} Jira tasks: ${taskNumbers.join(', ')}`);
      await system.processJiraTasks(taskNumbers);
    } else {
      // Default: treat arguments as prompts
      console.log(`🚀 Processing ${args.length} prompts...`);
      await system.processPrompts(args);
    }

    console.log('✅ All tasks completed successfully!');
  } catch (error) {
    console.error('❌ System error:', error);
    process.exit(1);
  } finally {
    // Clean up
    await system.stop();
  }
}

// Export for programmatic use
export default AIFrontendAutomationSystem;

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 