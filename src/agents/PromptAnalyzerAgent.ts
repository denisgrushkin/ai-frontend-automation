import { BaseAgent } from './BaseAgent';
import { 
  AgentTask, 
  AgentTaskType, 
  AgentType,
  PromptTask
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface PromptAnalysisResult {
  promptTask: PromptTask;
  analysis: {
    mainGoal: string;
    technicalRequirements: string[];
    uiRequirements: string[];
    functionalRequirements: string[];
    complexity: 'Simple' | 'Medium' | 'Complex';
    estimatedTime: string;
    suggestedFramework: string;
    suggestedStyling: string;
  };
  figmaLinks: string[];
  components: string[];
  features: string[];
}

export class PromptAnalyzerAgent extends BaseAgent {
  constructor(config: any) {
    super({
      ...config,
      type: AgentType.PROMPT_ANALYZER,
      capabilities: [{
        name: 'Prompt Analysis',
        description: 'Analyze text prompts to extract requirements, Figma links, and development specifications',
        requiredServices: ['AI Analysis'],
        supportedOperations: [AgentTaskType.ANALYZE_PROMPT]
      }]
    });
  }

  protected async performTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case AgentTaskType.ANALYZE_PROMPT:
        return this.analyzePrompt(task.input);
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }

  /**
   * Analyze text prompt and extract requirements, Figma links, and specifications
   */
  private async analyzePrompt(input: any): Promise<PromptAnalysisResult> {
    const { prompt } = input;
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    this.logger.info('Starting prompt analysis', { promptLength: prompt.length });

    try {
      // Extract Figma links from prompt
      const figmaLinks = this.extractFigmaLinks(prompt);
      
      // Analyze prompt using AI
      const analysis = await this.performAIAnalysis(prompt);
      
      // Create prompt task
      const promptTask: PromptTask = {
        id: uuidv4(),
        prompt: prompt.trim(),
        figmaLinks,
        requirements: analysis.technicalRequirements,
        acceptanceCriteria: analysis.functionalRequirements,
        priority: this.determinePriority(analysis.complexity),
        framework: analysis.suggestedFramework,
        styling: analysis.suggestedStyling
      };

      const result: PromptAnalysisResult = {
        promptTask,
        analysis,
        figmaLinks,
        components: this.extractComponents(analysis),
        features: this.extractFeatures(analysis)
      };

      this.logger.info('Prompt analysis completed', { 
        complexity: analysis.complexity,
        componentsCount: result.components.length,
        figmaLinksCount: figmaLinks.length
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to analyze prompt', { error, prompt: prompt.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Extract Figma links from prompt text
   */
  private extractFigmaLinks(prompt: string): string[] {
    const figmaRegex = /https?:\/\/(?:www\.)?figma\.com\/(?:file|design|proto)\/[A-Za-z0-9]+\/[^?\s]*/g;
    const matches = prompt.match(figmaRegex) || [];
    
    // Remove duplicates and clean URLs
    const uniqueLinks = [...new Set(matches)].map(link => link.trim());
    
    this.logger.debug('Extracted Figma links', { count: uniqueLinks.length, links: uniqueLinks });
    
    return uniqueLinks;
  }

  /**
   * Perform AI analysis of the prompt
   */
  private async performAIAnalysis(prompt: string): Promise<PromptAnalysisResult['analysis']> {
    const analysisPrompt = `
    Analyze this frontend development prompt and extract detailed requirements:

    PROMPT:
    ${prompt}

    Please provide a comprehensive analysis in the following JSON format:
    {
      "mainGoal": "Brief description of the main objective",
      "technicalRequirements": ["Array of technical requirements"],
      "uiRequirements": ["Array of UI/UX requirements"],
      "functionalRequirements": ["Array of functional requirements"],
      "complexity": "Simple|Medium|Complex",
      "estimatedTime": "Estimated development time",
      "suggestedFramework": "React|Vue|Angular|Vanilla",
      "suggestedStyling": "CSS|SCSS|Styled-Components|Tailwind|Material-UI"
    }

    Consider:
    - Component complexity and interaction patterns
    - State management needs
    - API integration requirements
    - Responsive design needs
    - Accessibility requirements
    - Performance considerations

    Focus on extracting specific, actionable requirements that can be used for development.
    `;

    try {
      const aiResponse = await this.generateResponse(
        'You are an expert technical analyst specializing in frontend development requirements analysis. Extract specific, actionable requirements from user prompts.',
        analysisPrompt
      );

      return this.parseAnalysisResponse(aiResponse);
    } catch (error) {
      this.logger.warn('AI analysis failed, using fallback analysis', { error });
      return this.createFallbackAnalysis(prompt);
    }
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAnalysisResponse(response: string): PromptAnalysisResult['analysis'] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize the response
        return {
          mainGoal: parsed.mainGoal || 'Frontend development task',
          technicalRequirements: Array.isArray(parsed.technicalRequirements) ? parsed.technicalRequirements : [],
          uiRequirements: Array.isArray(parsed.uiRequirements) ? parsed.uiRequirements : [],
          functionalRequirements: Array.isArray(parsed.functionalRequirements) ? parsed.functionalRequirements : [],
          complexity: ['Simple', 'Medium', 'Complex'].includes(parsed.complexity) ? parsed.complexity : 'Medium',
          estimatedTime: parsed.estimatedTime || '2-4 hours',
          suggestedFramework: parsed.suggestedFramework || 'React',
          suggestedStyling: parsed.suggestedStyling || 'CSS'
        };
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      this.logger.warn('Failed to parse AI analysis response', { error });
      return this.createFallbackAnalysis(response);
    }
  }

  /**
   * Create fallback analysis when AI analysis fails
   */
  private createFallbackAnalysis(prompt: string): PromptAnalysisResult['analysis'] {
    const lowerPrompt = prompt.toLowerCase();
    
    // Simple keyword-based analysis
    const hasForm = lowerPrompt.includes('form') || lowerPrompt.includes('input');
    const hasModal = lowerPrompt.includes('modal') || lowerPrompt.includes('popup');
    const hasTable = lowerPrompt.includes('table') || lowerPrompt.includes('list');
    const hasChart = lowerPrompt.includes('chart') || lowerPrompt.includes('graph');
    const hasAPI = lowerPrompt.includes('api') || lowerPrompt.includes('fetch') || lowerPrompt.includes('backend');
    
    let complexity: 'Simple' | 'Medium' | 'Complex' = 'Simple';
    if ((hasForm && hasModal) || hasChart || hasAPI) {
      complexity = 'Complex';
    } else if (hasForm || hasModal || hasTable) {
      complexity = 'Medium';
    }

    const suggestedFramework = lowerPrompt.includes('vue') ? 'Vue' : 
                              lowerPrompt.includes('angular') ? 'Angular' : 'React';
    
    const suggestedStyling = lowerPrompt.includes('tailwind') ? 'Tailwind' :
                            lowerPrompt.includes('material') ? 'Material-UI' :
                            lowerPrompt.includes('styled') ? 'Styled-Components' : 'CSS';

    return {
      mainGoal: 'Frontend component development based on prompt',
      technicalRequirements: [
        'Modern browser support',
        'Responsive design',
        ...(hasAPI ? ['API integration'] : []),
        ...(hasForm ? ['Form validation'] : [])
      ],
      uiRequirements: [
        'Clean and intuitive interface',
        'Consistent styling',
        ...(hasModal ? ['Modal interactions'] : []),
        ...(hasTable ? ['Data display'] : [])
      ],
      functionalRequirements: [
        'Core functionality implementation',
        ...(hasForm ? ['Form submission handling'] : []),
        ...(hasModal ? ['Modal open/close logic'] : [])
      ],
      complexity,
      estimatedTime: complexity === 'Simple' ? '1-2 hours' : 
                     complexity === 'Medium' ? '2-4 hours' : '4-8 hours',
      suggestedFramework,
      suggestedStyling
    };
  }

  /**
   * Determine task priority based on complexity
   */
  private determinePriority(complexity: string): string {
    switch (complexity) {
      case 'Simple':
        return 'LOW';
      case 'Medium':
        return 'MEDIUM';
      case 'Complex':
        return 'HIGH';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Extract component names from analysis
   */
  private extractComponents(analysis: PromptAnalysisResult['analysis']): string[] {
    const components: string[] = [];
    const text = `${analysis.mainGoal} ${analysis.uiRequirements.join(' ')} ${analysis.functionalRequirements.join(' ')}`.toLowerCase();
    
    // Common component patterns
    const componentPatterns = [
      { pattern: /button/g, component: 'Button' },
      { pattern: /form/g, component: 'Form' },
      { pattern: /input/g, component: 'Input' },
      { pattern: /modal/g, component: 'Modal' },
      { pattern: /table/g, component: 'Table' },
      { pattern: /list/g, component: 'List' },
      { pattern: /card/g, component: 'Card' },
      { pattern: /header/g, component: 'Header' },
      { pattern: /footer/g, component: 'Footer' },
      { pattern: /sidebar/g, component: 'Sidebar' },
      { pattern: /navigation|nav/g, component: 'Navigation' },
      { pattern: /dropdown/g, component: 'Dropdown' },
      { pattern: /checkbox/g, component: 'Checkbox' },
      { pattern: /radio/g, component: 'RadioButton' },
      { pattern: /slider/g, component: 'Slider' },
      { pattern: /tab/g, component: 'Tabs' },
      { pattern: /accordion/g, component: 'Accordion' },
      { pattern: /chart|graph/g, component: 'Chart' },
      { pattern: /calendar/g, component: 'Calendar' },
      { pattern: /tooltip/g, component: 'Tooltip' }
    ];

    for (const { pattern, component } of componentPatterns) {
      if (pattern.test(text) && !components.includes(component)) {
        components.push(component);
      }
    }

    // If no specific components found, add a generic App component
    if (components.length === 0) {
      components.push('App');
    }

    return components;
  }

  /**
   * Extract feature names from analysis
   */
  private extractFeatures(analysis: PromptAnalysisResult['analysis']): string[] {
    const allRequirements = [
      ...analysis.technicalRequirements,
      ...analysis.uiRequirements,
      ...analysis.functionalRequirements
    ].join(' ').toLowerCase();

    const features: string[] = [];
    
    const featurePatterns = [
      { pattern: /responsive/g, feature: 'Responsive Design' },
      { pattern: /validation/g, feature: 'Form Validation' },
      { pattern: /api|fetch|ajax/g, feature: 'API Integration' },
      { pattern: /routing/g, feature: 'Client-side Routing' },
      { pattern: /state management/g, feature: 'State Management' },
      { pattern: /authentication|auth/g, feature: 'Authentication' },
      { pattern: /accessibility|a11y/g, feature: 'Accessibility' },
      { pattern: /animation/g, feature: 'Animations' },
      { pattern: /drag.*drop/g, feature: 'Drag & Drop' },
      { pattern: /search/g, feature: 'Search Functionality' },
      { pattern: /filter/g, feature: 'Filtering' },
      { pattern: /sort/g, feature: 'Sorting' },
      { pattern: /pagination/g, feature: 'Pagination' },
      { pattern: /real.?time/g, feature: 'Real-time Updates' },
      { pattern: /offline/g, feature: 'Offline Support' },
      { pattern: /theme|dark mode/g, feature: 'Theme Support' }
    ];

    for (const { pattern, feature } of featurePatterns) {
      if (pattern.test(allRequirements) && !features.includes(feature)) {
        features.push(feature);
      }
    }

    return features;
  }
} 