export interface PromptTask {
  id: string;
  prompt: string;
  figmaLinks?: string[];
  requirements?: string[];
  acceptanceCriteria?: string[];
  priority?: string;
  framework?: string;
  styling?: string;
}

export interface JiraTask {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee?: string;
  priority: string;
  labels: string[];
  components: string[];
  issueType: string;
  figmaLinks?: string[];
  acceptanceCriteria?: string[];
}

export interface FigmaDesign {
  fileKey: string;
  nodeId: string;
  name: string;
  type: string;
  url: string;
  imageUrl?: string;
  specifications?: DesignSpecification[];
}

export interface DesignSpecification {
  property: string;
  value: string;
  unit?: string;
  description?: string;
}

export interface GitHubPullRequest {
  title: string;
  body: string;
  head: string;
  base: string;
  draft: boolean;
  reviewers?: string[];
  labels?: string[];
}

export interface AgentCapability {
  name: string;
  description: string;
  requiredServices: string[];
  supportedOperations: string[];
}

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  description: string;
  priority: TaskPriority;
  dependencies: string[];
  input: any;
  output?: any;
  status: TaskStatus;
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  errors?: string[];
}

export enum AgentTaskType {
  ANALYZE_PROMPT = 'ANALYZE_PROMPT',
  ANALYZE_JIRA_TASK = 'ANALYZE_JIRA_TASK',
  EXTRACT_FIGMA_DESIGN = 'EXTRACT_FIGMA_DESIGN',
  GENERATE_CODE = 'GENERATE_CODE',
  CREATE_TESTS = 'CREATE_TESTS',
  CREATE_PULL_REQUEST = 'CREATE_PULL_REQUEST',
  REVIEW_CODE = 'REVIEW_CODE',
  UPDATE_DOCUMENTATION = 'UPDATE_DOCUMENTATION'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  model: string;
  capabilities: AgentCapability[];
  maxConcurrentTasks: number;
  retryAttempts: number;
  timeout: number;
}

export enum AgentType {
  MAIN_COORDINATOR = 'MAIN_COORDINATOR',
  PROMPT_ANALYZER = 'PROMPT_ANALYZER',
  JIRA_ANALYZER = 'JIRA_ANALYZER',
  FIGMA_DESIGNER = 'FIGMA_DESIGNER',
  CODE_GENERATOR = 'CODE_GENERATOR',
  GITHUB_MANAGER = 'GITHUB_MANAGER',
  QA_TESTER = 'QA_TESTER'
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  dependencies: string[];
  input: any;
  output?: any;
  status: TaskStatus;
  retryCount: number;
}

export interface MCPConnection {
  id: string;
  name: string;
  serverUrl: string;
  capabilities: string[];
  isConnected: boolean;
  lastHeartbeat?: Date;
}

export interface CodeGenerationRequest {
  taskId: string;
  component: string;
  framework: string;
  styling: string;
  features: string[];
  designSpecs: DesignSpecification[];
  existingCode?: string;
  dependencies?: string[];
}

export interface CodeGenerationResult {
  files: GeneratedFile[];
  tests: GeneratedFile[];
  documentation: string;
  dependencies: string[];
  buildCommands: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: FileType;
  description: string;
}

export enum FileType {
  COMPONENT = 'COMPONENT',
  STYLE = 'STYLE',
  TEST = 'TEST',
  CONFIG = 'CONFIG',
  DOCUMENTATION = 'DOCUMENTATION'
} 