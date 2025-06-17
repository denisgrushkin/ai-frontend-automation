import { BaseAgent } from './BaseAgent';
import { JiraMCPClient, JiraMCPConfig } from '../mcp/JiraMCPClient';
import { 
  AgentTask, 
  AgentTaskType, 
  AgentType,
  JiraTask
} from '../types';

export class JiraAnalyzerAgent extends BaseAgent {
  private jiraClient: JiraMCPClient;

  constructor(config: any, jiraConfig: JiraMCPConfig) {
    super({
      ...config,
      type: AgentType.JIRA_ANALYZER,
      capabilities: [{
        name: 'Jira Task Analysis',
        description: 'Analyze Jira tasks and extract development requirements',
        requiredServices: ['Jira API'],
        supportedOperations: [AgentTaskType.ANALYZE_JIRA_TASK]
      }]
    });

    this.jiraClient = new JiraMCPClient(jiraConfig);
  }

  protected async performTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case AgentTaskType.ANALYZE_JIRA_TASK:
        return this.analyzeJiraTask(task.input);
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }

  /**
   * Analyze a Jira task and extract development requirements
   */
  private async analyzeJiraTask(input: any): Promise<any> {
    const { taskNumber } = input;
    
    this.logger.info(`Analyzing Jira task: ${taskNumber}`);

    try {
      // Fetch task from Jira
      const jiraTask = await this.jiraClient.getTask(taskNumber);
      
      // Use AI to analyze the task and extract structured information
      const analysisPrompt = this.buildAnalysisPrompt(jiraTask);
      const analysis = await this.generateResponse(
        this.getSystemPrompt(),
        analysisPrompt,
        jiraTask
      );

      // Parse AI response to structured data
      const structuredAnalysis = this.parseAnalysisResponse(analysis);

      this.logger.info(`Task analysis completed for: ${taskNumber}`);

      return {
        jiraTask,
        analysis: structuredAnalysis,
        figmaLinks: jiraTask.figmaLinks || [],
        acceptanceCriteria: jiraTask.acceptanceCriteria || [],
        estimatedComplexity: this.estimateComplexity(jiraTask),
        recommendedApproach: this.recommendApproach(jiraTask)
      };
    } catch (error) {
      this.logger.error(`Failed to analyze Jira task ${taskNumber}`, { error });
      throw error;
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(jiraTask: JiraTask): string {
    return `
    Please analyze this Jira task and extract the following information:

    TASK DETAILS:
    - Key: ${jiraTask.key}
    - Summary: ${jiraTask.summary}
    - Description: ${jiraTask.description}
    - Issue Type: ${jiraTask.issueType}
    - Priority: ${jiraTask.priority}
    - Labels: ${jiraTask.labels.join(', ')}
    - Components: ${jiraTask.components.join(', ')}

    ACCEPTANCE CRITERIA:
    ${jiraTask.acceptanceCriteria?.join('\n') || 'None specified'}

    FIGMA LINKS:
    ${jiraTask.figmaLinks?.join('\n') || 'None provided'}

    Please provide a structured analysis including:
    1. **Technical Requirements**: What needs to be built technically
    2. **UI/UX Requirements**: User interface and experience requirements
    3. **Business Logic**: Any business rules or logic that needs implementation
    4. **Data Requirements**: What data structures or APIs are needed
    5. **Testing Requirements**: What should be tested
    6. **Dependencies**: Any external dependencies or integrations needed
    7. **Deliverables**: Specific files or components that need to be created
    8. **Framework Recommendations**: Suggested frontend framework/libraries
    9. **Styling Approach**: CSS methodology or styling framework suggestions
    10. **Complexity Assessment**: Simple/Medium/Complex with reasoning

    Format your response as structured JSON.
    `;
  }

  /**
   * Get system prompt for task analysis
   */
  private getSystemPrompt(): string {
    return `
    You are an expert Frontend Development Analyst specializing in converting Jira tickets into actionable development plans.

    Your role is to:
    - Analyze Jira tasks thoroughly and extract all technical requirements
    - Identify UI/UX patterns and components needed
    - Suggest appropriate technical implementations
    - Estimate complexity and effort required
    - Identify potential challenges and solutions
    - Recommend best practices for frontend development

    Always provide detailed, actionable analysis that a developer can immediately use to start coding.
    Focus on modern frontend development practices using React, Vue, Angular, or vanilla JavaScript as appropriate.
    Consider responsive design, accessibility, performance, and maintainability.

    Respond in valid JSON format only.
    `;
  }

  /**
   * Parse AI response into structured data
   */
  private parseAnalysisResponse(response: string): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If not valid JSON, create structured response from text
      return {
        technicalRequirements: this.extractSection(response, 'Technical Requirements'),
        uiUxRequirements: this.extractSection(response, 'UI/UX Requirements'),
        businessLogic: this.extractSection(response, 'Business Logic'),
        dataRequirements: this.extractSection(response, 'Data Requirements'),
        testingRequirements: this.extractSection(response, 'Testing Requirements'),
        dependencies: this.extractSection(response, 'Dependencies'),
        deliverables: this.extractSection(response, 'Deliverables'),
        frameworkRecommendations: this.extractSection(response, 'Framework Recommendations'),
        stylingApproach: this.extractSection(response, 'Styling Approach'),
        complexityAssessment: this.extractSection(response, 'Complexity Assessment')
      };
    } catch (error) {
      this.logger.warn('Failed to parse analysis response as JSON, using raw text');
      return {
        rawAnalysis: response,
        technicalRequirements: ['Could not parse structured requirements'],
        complexityAssessment: 'Medium'
      };
    }
  }

  /**
   * Extract section from text response
   */
  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Estimate task complexity based on various factors
   */
  private estimateComplexity(jiraTask: JiraTask): 'Simple' | 'Medium' | 'Complex' {
    let complexityScore = 0;

    // Issue type factor
    const complexIssueTypes = ['Epic', 'Story', 'New Feature'];
    if (complexIssueTypes.includes(jiraTask.issueType)) complexityScore += 2;

    // Priority factor
    if (jiraTask.priority === 'High' || jiraTask.priority === 'Critical') complexityScore += 1;

    // Description length factor
    if (jiraTask.description.length > 500) complexityScore += 1;

    // Acceptance criteria factor
    const criteriaCount = jiraTask.acceptanceCriteria?.length || 0;
    if (criteriaCount > 3) complexityScore += 1;

    // Figma links factor (UI complexity)
    const figmaCount = jiraTask.figmaLinks?.length || 0;
    if (figmaCount > 2) complexityScore += 1;

    // Component factor
    if (jiraTask.components.length > 2) complexityScore += 1;

    if (complexityScore <= 2) return 'Simple';
    if (complexityScore <= 4) return 'Medium';
    return 'Complex';
  }

  /**
   * Recommend development approach based on task analysis
   */
  private recommendApproach(jiraTask: JiraTask): string[] {
    const recommendations: string[] = [];

    // Based on issue type
    if (jiraTask.issueType === 'Bug') {
      recommendations.push('Focus on debugging and testing existing functionality');
      recommendations.push('Implement comprehensive test coverage for the fix');
    } else if (jiraTask.issueType === 'Story' || jiraTask.issueType === 'New Feature') {
      recommendations.push('Start with component design and mockups');
      recommendations.push('Implement modular, reusable components');
      recommendations.push('Consider responsive design from the beginning');
    }

    // Based on Figma links
    if (jiraTask.figmaLinks && jiraTask.figmaLinks.length > 0) {
      recommendations.push('Extract design tokens from Figma designs');
      recommendations.push('Implement pixel-perfect UI matching the designs');
    }

    // Based on components
    if (jiraTask.components.includes('Frontend')) {
      recommendations.push('Use modern frontend framework (React/Vue/Angular)');
      recommendations.push('Implement state management if needed');
    }

    // Based on priority
    if (jiraTask.priority === 'Critical' || jiraTask.priority === 'High') {
      recommendations.push('Prioritize core functionality over advanced features');
      recommendations.push('Implement thorough error handling');
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Follow established coding standards and patterns');
      recommendations.push('Write comprehensive tests');
      recommendations.push('Document all public APIs and components');
    }

    return recommendations;
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<boolean> {
    return this.jiraClient.testConnection();
  }
} 