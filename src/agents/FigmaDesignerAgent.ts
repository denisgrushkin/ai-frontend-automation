import { BaseAgent } from './BaseAgent';
import { FigmaMCPClient, FigmaMCPConfig } from '../mcp/FigmaMCPClient';
import { 
  AgentTask, 
  AgentTaskType, 
  AgentType,
  FigmaDesign,
  DesignSpecification
} from '../types';

export interface FigmaAnalysisResult {
  designs: FigmaDesign[];
  designTokens: DesignToken[];
  componentSpecs: ComponentSpecification[];
  styleGuide: StyleGuide;
  implementationGuidance: string[];
}

export interface DesignToken {
  name: string;
  category: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
  value: string;
  cssProperty: string;
  description?: string;
}

export interface ComponentSpecification {
  name: string;
  type: 'button' | 'input' | 'card' | 'modal' | 'layout' | 'navigation' | 'other';
  specifications: DesignSpecification[];
  variants?: string[];
  states?: string[];
  responsiveBreakpoints?: { [key: string]: DesignSpecification[] };
}

export interface StyleGuide {
  colors: { [key: string]: string };
  typography: { [key: string]: any };
  spacing: { [key: string]: string };
  breakpoints: { [key: string]: string };
  animations?: { [key: string]: any };
}

export class FigmaDesignerAgent extends BaseAgent {
  private figmaClient: FigmaMCPClient;

  constructor(config: any, figmaConfig: FigmaMCPConfig) {
    super({
      ...config,
      type: AgentType.FIGMA_DESIGNER,
      capabilities: [{
        name: 'Figma Design Analysis',
        description: 'Extract design specifications and tokens from Figma designs',
        requiredServices: ['Figma API'],
        supportedOperations: [AgentTaskType.EXTRACT_FIGMA_DESIGN]
      }]
    });

    this.figmaClient = new FigmaMCPClient(figmaConfig);
  }

  protected async performTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case AgentTaskType.EXTRACT_FIGMA_DESIGN:
        return this.extractFigmaDesigns(task.input);
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }

  /**
   * Extract design specifications from Figma URLs
   */
  private async extractFigmaDesigns(input: any): Promise<FigmaAnalysisResult> {
    const { figmaLinks, analyze_jira_task } = input;
    
    // Get Figma links from previous step if available
    const links = figmaLinks || analyze_jira_task?.figmaLinks || [];
    
    if (links.length === 0) {
      this.logger.warn('No Figma links provided for design extraction');
      return this.createEmptyResult();
    }

    this.logger.info(`Extracting designs from ${links.length} Figma links`);

    const designs: FigmaDesign[] = [];
    
    try {
      // Extract designs from all Figma links
      for (const link of links) {
        try {
          const design = await this.figmaClient.getDesignFromUrl(link);
          designs.push(design);
          this.logger.info(`Successfully extracted design: ${design.name}`);
        } catch (error) {
          this.logger.warn(`Failed to extract design from ${link}`, { error });
        }
      }

      if (designs.length === 0) {
        throw new Error('No designs could be extracted from provided Figma links');
      }

      // Analyze designs and extract tokens
      const designTokens = this.extractDesignTokens(designs);
      const componentSpecs = this.extractComponentSpecifications(designs);
      const styleGuide = this.createStyleGuide(designs, designTokens);
      const implementationGuidance = await this.generateImplementationGuidance(designs, componentSpecs);

      this.logger.info(`Design extraction completed. Found ${designs.length} designs, ${designTokens.length} tokens, ${componentSpecs.length} components`);

      return {
        designs,
        designTokens,
        componentSpecs,
        styleGuide,
        implementationGuidance
      };
    } catch (error) {
      this.logger.error('Failed to extract Figma designs', { error });
      throw error;
    }
  }

  /**
   * Extract design tokens from design specifications
   */
  private extractDesignTokens(designs: FigmaDesign[]): DesignToken[] {
    const tokens: DesignToken[] = [];
    const seenTokens = new Set<string>();

    for (const design of designs) {
      if (!design.specifications) continue;

      for (const spec of design.specifications) {
        const token = this.convertSpecToToken(spec, design.name);
        
        if (token && !seenTokens.has(token.name)) {
          tokens.push(token);
          seenTokens.add(token.name);
        }
      }
    }

    // Sort tokens by category
    return tokens.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Convert design specification to design token
   */
  private convertSpecToToken(spec: DesignSpecification, componentName: string): DesignToken | null {
    const { property, value, unit, description } = spec;

    // Color tokens
    if (property.includes('color') || property.includes('background') || property.includes('border')) {
      if (value.startsWith('#')) {
        return {
          name: `${componentName.toLowerCase()}-${property}`,
          category: 'color',
          value,
          cssProperty: property,
          description: description || `Color token for ${componentName} ${property}`
        };
      }
    }

    // Typography tokens
    if (['font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing'].includes(property)) {
      return {
        name: `${componentName.toLowerCase()}-${property}`,
        category: 'typography',
        value: unit ? `${value}${unit}` : value,
        cssProperty: property,
        description: description || `Typography token for ${componentName} ${property}`
      };
    }

    // Spacing tokens
    if (['padding', 'margin', 'gap', 'width', 'height'].includes(property) || property.includes('padding') || property.includes('margin')) {
      if (unit === 'px' && !isNaN(Number(value))) {
        return {
          name: `${componentName.toLowerCase()}-${property}`,
          category: 'spacing',
          value: `${value}${unit}`,
          cssProperty: property,
          description: description || `Spacing token for ${componentName} ${property}`
        };
      }
    }

    // Border tokens
    if (property.includes('border') && property !== 'border-color') {
      return {
        name: `${componentName.toLowerCase()}-${property}`,
        category: 'border',
        value: unit ? `${value}${unit}` : value,
        cssProperty: property,
        description: description || `Border token for ${componentName} ${property}`
      };
    }

    return null;
  }

  /**
   * Extract component specifications from designs
   */
  private extractComponentSpecifications(designs: FigmaDesign[]): ComponentSpecification[] {
    const components: ComponentSpecification[] = [];

    for (const design of designs) {
      if (!design.specifications) continue;

      const componentType = this.determineComponentType(design);
      const variants = this.extractVariants(design);
      const states = this.extractStates(design);

      components.push({
        name: design.name,
        type: componentType,
        specifications: design.specifications,
        variants: variants.length > 0 ? variants : undefined,
        states: states.length > 0 ? states : undefined
      });
    }

    return components;
  }

  /**
   * Determine component type based on design characteristics
   */
  private determineComponentType(design: FigmaDesign): ComponentSpecification['type'] {
    const name = design.name.toLowerCase();
    const type = design.type.toLowerCase();

    if (name.includes('button') || name.includes('btn')) return 'button';
    if (name.includes('input') || name.includes('field') || name.includes('form')) return 'input';
    if (name.includes('card') || name.includes('tile')) return 'card';
    if (name.includes('modal') || name.includes('dialog') || name.includes('popup')) return 'modal';
    if (name.includes('nav') || name.includes('menu') || name.includes('header') || name.includes('footer')) return 'navigation';
    if (name.includes('layout') || name.includes('container') || name.includes('wrapper')) return 'layout';
    
    return 'other';
  }

  /**
   * Extract component variants from design name
   */
  private extractVariants(design: FigmaDesign): string[] {
    const variants: string[] = [];
    const name = design.name.toLowerCase();

    // Common variant patterns
    const variantPatterns = [
      'primary', 'secondary', 'tertiary',
      'small', 'medium', 'large',
      'outlined', 'filled', 'text',
      'light', 'dark',
      'success', 'warning', 'error', 'info'
    ];

    for (const pattern of variantPatterns) {
      if (name.includes(pattern)) {
        variants.push(pattern);
      }
    }

    return variants;
  }

  /**
   * Extract component states from design name
   */
  private extractStates(design: FigmaDesign): string[] {
    const states: string[] = [];
    const name = design.name.toLowerCase();

    // Common state patterns
    const statePatterns = [
      'default', 'active', 'hover', 'focus', 'disabled', 'loading', 'pressed'
    ];

    for (const pattern of statePatterns) {
      if (name.includes(pattern)) {
        states.push(pattern);
      }
    }

    return states.length > 0 ? states : ['default'];
  }

  /**
   * Create style guide from designs and tokens
   */
  private createStyleGuide(designs: FigmaDesign[], tokens: DesignToken[]): StyleGuide {
    const colors: { [key: string]: string } = {};
    const typography: { [key: string]: any } = {};
    const spacing: { [key: string]: string } = {};
    const breakpoints: { [key: string]: string } = {
      mobile: '320px',
      tablet: '768px',
      desktop: '1024px',
      wide: '1440px'
    };

    // Extract colors from tokens
    tokens.filter(t => t.category === 'color').forEach(token => {
      colors[token.name] = token.value;
    });

    // Extract typography from tokens
    const typographyGroups: { [key: string]: any } = {};
    tokens.filter(t => t.category === 'typography').forEach(token => {
      const baseName = token.name.split('-')[0];
      if (!typographyGroups[baseName]) {
        typographyGroups[baseName] = {};
      }
      typographyGroups[baseName][token.cssProperty] = token.value;
    });

    Object.assign(typography, typographyGroups);

    // Extract spacing from tokens
    tokens.filter(t => t.category === 'spacing').forEach(token => {
      spacing[token.name] = token.value;
    });

    return {
      colors,
      typography,
      spacing,
      breakpoints
    };
  }

  /**
   * Generate implementation guidance using AI
   */
  private async generateImplementationGuidance(designs: FigmaDesign[], components: ComponentSpecification[]): Promise<string[]> {
    const prompt = `
    Based on the extracted Figma designs and component specifications, provide implementation guidance for frontend developers.

    DESIGNS:
    ${designs.map(d => `- ${d.name} (${d.type})`).join('\n')}

    COMPONENTS:
    ${components.map(c => `- ${c.name} (${c.type}): ${c.specifications.length} specifications`).join('\n')}

    Please provide specific, actionable guidance including:
    1. Recommended HTML structure for each component
    2. CSS/SCSS implementation approach
    3. JavaScript behavior requirements
    4. Responsive design considerations
    5. Accessibility requirements
    6. Performance optimization tips
    7. Testing recommendations

    Format as a bulleted list of specific recommendations.
    `;

    try {
      const response = await this.generateResponse(
        'You are an expert Frontend Developer providing implementation guidance based on design specifications. Focus on practical, actionable advice.',
        prompt
      );

      return response.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      this.logger.warn('Failed to generate implementation guidance', { error });
      return [
        'Implement components using modern CSS Grid and Flexbox',
        'Ensure all components are responsive and accessible',
        'Use semantic HTML elements for better accessibility',
        'Implement proper focus management and keyboard navigation',
        'Add loading states and error handling for interactive components',
        'Write unit tests for component logic and integration tests for user interactions'
      ];
    }
  }

  /**
   * Create empty result when no Figma links are provided
   */
  private createEmptyResult(): FigmaAnalysisResult {
    return {
      designs: [],
      designTokens: [],
      componentSpecs: [],
      styleGuide: {
        colors: {},
        typography: {},
        spacing: {},
        breakpoints: {
          mobile: '320px',
          tablet: '768px',
          desktop: '1024px',
          wide: '1440px'
        }
      },
      implementationGuidance: [
        'No Figma designs provided - implement using standard design patterns',
        'Follow accessibility best practices',
        'Ensure responsive design across all screen sizes',
        'Use semantic HTML and proper ARIA labels'
      ]
    };
  }

  /**
   * Test connection to Figma
   */
  async testConnection(): Promise<boolean> {
    return this.figmaClient.testConnection();
  }
} 