import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { 
  AgentConfig, 
  AgentTask, 
  TaskStatus, 
  AgentType,
  AgentCapability 
} from '../types';

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected type: AgentType;
  protected model: BaseLanguageModel;
  protected capabilities: AgentCapability[];
  protected maxConcurrentTasks: number;
  protected currentTasks: Map<string, AgentTask>;
  protected logger: winston.Logger;
  protected retryAttempts: number;
  protected timeout: number;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.capabilities = config.capabilities;
    this.maxConcurrentTasks = config.maxConcurrentTasks;
    this.currentTasks = new Map();
    this.retryAttempts = config.retryAttempts;
    this.timeout = config.timeout;

    // Initialize language model based on configuration
    this.model = this.initializeModel(config.model);
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'ai-agent',
        agentId: this.id,
        agentType: this.type 
      },
      transports: [
        new winston.transports.File({ 
          filename: process.env.LOG_FILE || 'logs/agents.log' 
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  private initializeModel(modelName: string): BaseLanguageModel {
    if (modelName.startsWith('gpt-')) {
      return new ChatOpenAI({
        modelName,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
    } else if (modelName.startsWith('claude-')) {
      return new ChatAnthropic({
        modelName,
        temperature: 0.1,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY
      });
    } else {
      throw new Error(`Unsupported model: ${modelName}`);
    }
  }

  /**
   * Execute a task assigned to this agent
   */
  public async executeTask(task: AgentTask): Promise<any> {
    if (this.currentTasks.size >= this.maxConcurrentTasks) {
      throw new Error(`Agent ${this.name} has reached maximum concurrent tasks limit`);
    }

    // Check if agent has required capability for this task
    if (!this.canHandleTask(task)) {
      throw new Error(`Agent ${this.name} cannot handle task type: ${task.type}`);
    }

    this.currentTasks.set(task.id, { ...task, status: TaskStatus.IN_PROGRESS });
    this.logger.info(`Starting task execution`, { taskId: task.id, taskType: task.type });

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        const result = await this.performTask(task);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const completedTask = {
          ...task,
          status: TaskStatus.COMPLETED,
          output: result,
          actualDuration: duration,
          updatedAt: new Date()
        };

        this.currentTasks.set(task.id, completedTask);
        this.logger.info(`Task completed successfully`, { 
          taskId: task.id, 
          duration: duration + 'ms'
        });

        return result;
      } catch (error) {
        attempt++;
        this.logger.warn(`Task execution failed, attempt ${attempt}/${this.retryAttempts}`, {
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error)
        });

        if (attempt >= this.retryAttempts) {
          const failedTask = {
            ...task,
            status: TaskStatus.FAILED,
            errors: [...(task.errors || []), error instanceof Error ? error.message : String(error)],
            updatedAt: new Date()
          };

          this.currentTasks.set(task.id, failedTask);
          this.logger.error(`Task failed after ${this.retryAttempts} attempts`, { 
            taskId: task.id,
            error: error instanceof Error ? error.message : String(error)
          });
          
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Abstract method that each agent must implement to perform their specific tasks
   */
  protected abstract performTask(task: AgentTask): Promise<any>;

  /**
   * Check if this agent can handle the given task type
   */
  protected canHandleTask(task: AgentTask): boolean {
    return this.capabilities.some(capability => 
      capability.supportedOperations.includes(task.type)
    );
  }

  /**
   * Generate AI response using the configured language model
   */
  protected async generateResponse(
    systemPrompt: string, 
    userPrompt: string, 
    context?: any
  ): Promise<string> {
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ];

    if (context) {
      messages.splice(1, 0, new HumanMessage(`Context: ${JSON.stringify(context, null, 2)}`));
    }

    const response = await this.model.invoke(messages);
    return response.content.toString();
  }

  /**
   * Get current status of the agent
   */
  public getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      capabilities: this.capabilities,
      currentTasks: Array.from(this.currentTasks.values()),
      availableCapacity: this.maxConcurrentTasks - this.currentTasks.size
    };
  }

  /**
   * Stop and clean up the agent
   */
  public async stop(): Promise<void> {
    this.logger.info(`Stopping agent ${this.name}`);
    
    // Cancel all pending tasks
    for (const [taskId, task] of this.currentTasks.entries()) {
      if (task.status === TaskStatus.IN_PROGRESS) {
        this.currentTasks.set(taskId, {
          ...task,
          status: TaskStatus.CANCELLED,
          updatedAt: new Date()
        });
      }
    }

    this.logger.info(`Agent ${this.name} stopped`);
  }
} 