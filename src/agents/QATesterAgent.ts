import { BaseAgent } from './BaseAgent';
import { 
  AgentTask, 
  AgentTaskType, 
  AgentType,
  GeneratedFile,
  FigmaDesign,
  DesignSpecification
} from '../types';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface VisualTestResult {
  componentName: string;
  passed: boolean;
  similarity: number;
  screenshotPath: string;
  issues: QAIssue[];
}

export interface QAIssue {
  type: 'layout' | 'color' | 'typography' | 'spacing' | 'accessibility';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  expected: string;
  actual: string;
  suggestion: string;
}

export interface QAReport {
  overallScore: number;
  visualTests: VisualTestResult[];
  recommendations: string[];
}

export class QATesterAgent extends BaseAgent {
  private browser?: Browser;
  private tempDir: string;

  constructor(config: any) {
    super({
      ...config,
      type: AgentType.QA_TESTER,
      capabilities: [{
        name: 'Visual Quality Assurance',
        description: 'Compare generated components with Figma designs',
        requiredServices: ['Visual Testing'],
        supportedOperations: [AgentTaskType.CREATE_TESTS]
      }]
    });

    this.tempDir = path.join(process.cwd(), 'temp', 'qa-testing');
  }

  protected async performTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case AgentTaskType.CREATE_TESTS:
        return this.performVisualQA(task.input);
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }

  private async performVisualQA(input: any): Promise<QAReport> {
    const { generate_code, extract_figma_design } = input;
    
    this.logger.info('Starting visual QA testing');
    
    const visualTests = await this.compareWithFigma(
      extract_figma_design.designs,
      generate_code.files
    );
    
    const overallScore = this.calculateScore(visualTests);
    const recommendations = this.generateRecommendations(visualTests);
    
    return {
      overallScore,
      visualTests,
      recommendations
    };
  }

  private async compareWithFigma(
    designs: FigmaDesign[],
    files: GeneratedFile[]
  ): Promise<VisualTestResult[]> {
    const results: VisualTestResult[] = [];
    
    for (const design of designs) {
      const componentFile = files.find(f => 
        f.path.toLowerCase().includes(design.name.toLowerCase())
      );
      
      if (!componentFile) {
        results.push({
          componentName: design.name,
          passed: false,
          similarity: 0,
          screenshotPath: '',
          issues: [{
            type: 'layout',
            severity: 'critical',
            description: 'Component file not found',
            expected: 'Component implementation',
            actual: 'No file generated',
            suggestion: 'Generate component file'
          }]
        });
        continue;
      }
      
      const issues = await this.analyzeImplementation(design, componentFile);
      const similarity = this.calculateSimilarity(design, componentFile);
      
      results.push({
        componentName: design.name,
        passed: similarity > 95 && issues.filter(i => i.severity === 'critical').length === 0,
        similarity,
        screenshotPath: `/temp/${design.name}.png`,
        issues
      });
    }
    
    return results;
  }

  private async analyzeImplementation(
    design: FigmaDesign,
    file: GeneratedFile
  ): Promise<QAIssue[]> {
    const prompt = `
    Compare this component with Figma design:
    
    Design: ${design.name}
    Specs: ${design.specifications?.map(s => `${s.property}: ${s.value}`).join(', ')}
    
    Code: ${file.content}
    
    Find visual differences and return JSON array of issues.
    `;
    
    try {
      const response = await this.generateResponse(
        'Compare implementation with design specs.',
        prompt
      );
      
      return this.parseIssues(response);
    } catch (error) {
      return [];
    }
  }

  private parseIssues(response: string): QAIssue[] {
    try {
      const match = response.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      return [];
    }
  }

  private calculateSimilarity(design: FigmaDesign, file: GeneratedFile): number {
    if (!design.specifications) return 100;
    
    let matches = 0;
    const total = design.specifications.length;
    const code = file.content.toLowerCase();
    
    for (const spec of design.specifications) {
      if (code.includes(spec.value.toLowerCase())) {
        matches++;
      }
    }
    
    return total > 0 ? (matches / total) * 100 : 100;
  }

  private calculateScore(tests: VisualTestResult[]): number {
    if (tests.length === 0) return 100;
    
    const avgSimilarity = tests.reduce((sum, t) => sum + t.similarity, 0) / tests.length;
    const passedTests = tests.filter(t => t.passed).length;
    const passRate = (passedTests / tests.length) * 100;
    
    return Math.round((avgSimilarity * 0.6) + (passRate * 0.4));
  }

  private generateRecommendations(tests: VisualTestResult[]): string[] {
    const recommendations: string[] = [];
    const failed = tests.filter(t => !t.passed);
    
    if (failed.length > 0) {
      recommendations.push(`${failed.length} components failed visual testing`);
    }
    
    const colorIssues = tests.flatMap(t => t.issues.filter(i => i.type === 'color'));
    if (colorIssues.length > 0) {
      recommendations.push('Color mismatches detected - review design tokens');
    }
    
    const spacingIssues = tests.flatMap(t => t.issues.filter(i => i.type === 'spacing'));
    if (spacingIssues.length > 0) {
      recommendations.push('Spacing inconsistencies found - check padding/margins');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All visual tests passed!');
    }
    
    return recommendations;
  }
} 