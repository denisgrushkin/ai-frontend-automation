import { BaseAgent } from './BaseAgent';
import { 
  AgentTask, 
  AgentTaskType, 
  TaskPriority, 
  TaskStatus,
  AgentType,
  WorkflowStep,
  JiraTask,
  CodeGenerationRequest
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MainCoordinatorAgent extends BaseAgent {
  private subAgents: Map<AgentType, BaseAgent>;
  private activeWorkflows: Map<string, WorkflowStep[]>;

  constructor(config: any) {
    super({
      ...config,
      type: AgentType.MAIN_COORDINATOR,
      capabilities: [{
        name: 'Task Coordination',
        description: 'Orchestrate and coordinate tasks across multiple specialized agents',
        requiredServices: ['LangChain'],
        supportedOperations: [
          AgentTaskType.ANALYZE_JIRA_TASK,
          AgentTaskType.EXTRACT_FIGMA_DESIGN,
          AgentTaskType.GENERATE_CODE,
          AgentTaskType.CREATE_TESTS,
          AgentTaskType.CREATE_PULL_REQUEST
        ]
      }]
    });

    this.subAgents = new Map();
    this.activeWorkflows = new Map();
  }

  /**
   * Register a specialized agent under this coordinator
   */
  public registerAgent(agent: BaseAgent): void {
    this.subAgents.set(agent.getStatus().type, agent);
    this.logger.info(`Registered agent: ${agent.getStatus().name}`);
  }

  /**
   * Process text prompts and coordinate the full development workflow (primary method)
   */
  public async processPrompts(prompts: string[]): Promise<void> {
    this.logger.info(`Processing ${prompts.length} prompts`);

    for (const prompt of prompts) {
      try {
        await this.executePromptWorkflow(prompt);
      } catch (error) {
        this.logger.error(`Failed to process prompt`, {
          error: error instanceof Error ? error.message : String(error),
          promptPreview: prompt.substring(0, 100)
        });
      }
    }
  }

  /**
   * Process Jira task numbers and coordinate the full development workflow (optional integration)
   */
  public async processJiraTasks(taskNumbers: string[]): Promise<void> {
    this.logger.info(`Processing ${taskNumbers.length} Jira tasks`, { taskNumbers });

    for (const taskNumber of taskNumbers) {
      try {
        await this.executeJiraWorkflow(taskNumber);
      } catch (error) {
        this.logger.error(`Failed to process Jira task ${taskNumber}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Execute the full development workflow for a text prompt
   */
  private async executePromptWorkflow(prompt: string): Promise<void> {
    const workflowId = uuidv4();
    this.logger.info(`Starting prompt workflow`, { workflowId, promptPreview: prompt.substring(0, 100) });

    // Define workflow steps for prompt analysis
    const workflowSteps: WorkflowStep[] = [
      {
        id: uuidv4(),
        name: 'Analyze Prompt',
        agentType: AgentType.PROMPT_ANALYZER,
        dependencies: [],
        input: { prompt },
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Extract Figma Design',
        agentType: AgentType.FIGMA_DESIGNER,
        dependencies: ['Analyze Prompt'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Generate Code',
        agentType: AgentType.CODE_GENERATOR,
        dependencies: ['Analyze Prompt', 'Extract Figma Design'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Visual QA Testing',
        agentType: AgentType.QA_TESTER,
        dependencies: ['Generate Code', 'Extract Figma Design'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Create Tests',
        agentType: AgentType.CODE_GENERATOR,
        dependencies: ['Visual QA Testing'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Create Pull Request',
        agentType: AgentType.GITHUB_MANAGER,
        dependencies: ['Generate Code', 'Create Tests', 'Visual QA Testing'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      }
    ];

    this.activeWorkflows.set(workflowId, workflowSteps);

    try {
      await this.executeWorkflowSteps(workflowId, workflowSteps);
      this.logger.info(`Prompt workflow completed successfully`, { workflowId });
    } catch (error) {
      this.logger.error(`Prompt workflow failed`, { workflowId, error });
      throw error;
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  /**
   * Execute the full development workflow for a single Jira task
   */
  private async executeJiraWorkflow(taskNumber: string): Promise<void> {
    const workflowId = uuidv4();
    this.logger.info(`Starting workflow for task ${taskNumber}`, { workflowId });

    // Define workflow steps
    const workflowSteps: WorkflowStep[] = [
      {
        id: uuidv4(),
        name: 'Analyze Jira Task',
        agentType: AgentType.JIRA_ANALYZER,
        dependencies: [],
        input: { taskNumber },
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Extract Figma Design',
        agentType: AgentType.FIGMA_DESIGNER,
        dependencies: ['Analyze Jira Task'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Generate Code',
        agentType: AgentType.CODE_GENERATOR,
        dependencies: ['Analyze Jira Task', 'Extract Figma Design'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Visual QA Testing',
        agentType: AgentType.QA_TESTER,
        dependencies: ['Generate Code', 'Extract Figma Design'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Create Tests',
        agentType: AgentType.CODE_GENERATOR,
        dependencies: ['Visual QA Testing'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      },
      {
        id: uuidv4(),
        name: 'Create Pull Request',
        agentType: AgentType.GITHUB_MANAGER,
        dependencies: ['Generate Code', 'Create Tests', 'Visual QA Testing'],
        input: {},
        status: TaskStatus.PENDING,
        retryCount: 0
      }
    ];

    this.activeWorkflows.set(workflowId, workflowSteps);

    try {
      // Execute workflow steps
      await this.executeWorkflowSteps(workflowId, workflowSteps);
      this.logger.info(`Workflow completed successfully`, { workflowId, taskNumber });
    } catch (error) {
      this.logger.error(`Workflow failed`, { 
        workflowId, 
        taskNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  /**
   * Execute workflow steps in correct dependency order
   */
  private async executeWorkflowSteps(workflowId: string, steps: WorkflowStep[]): Promise<void> {
    const completedSteps = new Set<string>();
    
    while (completedSteps.size < steps.length) {
      const readySteps = steps.filter(step => 
        step.status === TaskStatus.PENDING &&
        step.dependencies.every(dep => completedSteps.has(dep))
      );

      if (readySteps.length === 0) {
        throw new Error('Workflow deadlock: no steps ready to execute');
      }

      // Execute ready steps in parallel
      const stepPromises = readySteps.map(step => this.executeWorkflowStep(workflowId, step));
      const results = await Promise.allSettled(stepPromises);

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const step = readySteps[i];

        if (result.status === 'fulfilled') {
          step.status = TaskStatus.COMPLETED;
          step.output = result.value;
          completedSteps.add(step.name);
          this.logger.info(`Step completed`, { workflowId, stepName: step.name });
        } else {
          step.status = TaskStatus.FAILED;
          this.logger.error(`Step failed`, { 
            workflowId, 
            stepName: step.name,
            error: result.reason
          });
          throw new Error(`Step '${step.name}' failed: ${result.reason}`);
        }
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(workflowId: string, step: WorkflowStep): Promise<any> {
    const agent = this.subAgents.get(step.agentType);
    if (!agent) {
      throw new Error(`No agent registered for type: ${step.agentType}`);
    }

    // Prepare input with context from previous steps
    const enrichedInput = await this.enrichStepInput(workflowId, step);

    const agentTask: AgentTask = {
      id: uuidv4(),
      type: this.mapStepToTaskType(step.name),
      description: `Execute ${step.name} for workflow ${workflowId}`,
      priority: TaskPriority.MEDIUM,
      dependencies: step.dependencies,
      input: enrichedInput,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    step.status = TaskStatus.IN_PROGRESS;
    const result = await agent.executeTask(agentTask);
    
    return result;
  }

  /**
   * Enrich step input with outputs from previous steps
   */
  private async enrichStepInput(workflowId: string, step: WorkflowStep): Promise<any> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return step.input;
    }

    const enrichedInput = { ...step.input };

    // Add outputs from dependency steps
    for (const dependency of step.dependencies) {
      const dependencyStep = workflow.find(s => s.name === dependency);
      if (dependencyStep?.output) {
        enrichedInput[dependency.replace(/\s+/g, '_').toLowerCase()] = dependencyStep.output;
      }
    }

    return enrichedInput;
  }

  /**
   * Map workflow step name to agent task type
   */
  private mapStepToTaskType(stepName: string): AgentTaskType {
    switch (stepName) {
      case 'Analyze Prompt':
        return AgentTaskType.ANALYZE_PROMPT;
      case 'Analyze Jira Task':
        return AgentTaskType.ANALYZE_JIRA_TASK;
      case 'Extract Figma Design':
        return AgentTaskType.EXTRACT_FIGMA_DESIGN;
      case 'Generate Code':
        return AgentTaskType.GENERATE_CODE;
      case 'Visual QA Testing':
        return AgentTaskType.CREATE_TESTS;
      case 'Create Tests':
        return AgentTaskType.CREATE_TESTS;
      case 'Create Pull Request':
        return AgentTaskType.CREATE_PULL_REQUEST;
      default:
        throw new Error(`Unknown step name: ${stepName}`);
    }
  }

  /**
   * Main method called by BaseAgent to perform coordinator-specific tasks
   */
  protected async performTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case AgentTaskType.ANALYZE_JIRA_TASK:
        return this.processJiraTasks(task.input.taskNumbers || [task.input.taskNumber]);
      default:
        throw new Error(`Unsupported task type for coordinator: ${task.type}`);
    }
  }

  /**
   * Get status of all registered agents
   */
  public getAgentsStatus() {
    const agentsStatus: any = {};
    
    for (const [type, agent] of this.subAgents.entries()) {
      agentsStatus[type] = agent.getStatus();
    }

    return {
      coordinator: this.getStatus(),
      agents: agentsStatus,
      activeWorkflows: this.activeWorkflows.size
    };
  }

  /**
   * Stop all agents
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping all agents');
    
    // Stop all sub-agents
    for (const agent of this.subAgents.values()) {
      await agent.stop();
    }

    // Stop coordinator
    await super.stop();
  }
} 