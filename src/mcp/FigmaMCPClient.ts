import axios, { AxiosInstance } from 'axios';
import { FigmaDesign, DesignSpecification } from '../types';

export interface FigmaMCPConfig {
  accessToken: string;
  teamId?: string;
}

export class FigmaMCPClient {
  private client: AxiosInstance;
  private config: FigmaMCPConfig;

  constructor(config: FigmaMCPConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': config.accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Extract file key and node ID from Figma URL
   */
  private parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
    const patterns = [
      /https:\/\/www\.figma\.com\/file\/([a-zA-Z0-9]+)\/[^?]*\?[^#]*node-id=([^&]+)/,
      /https:\/\/www\.figma\.com\/file\/([a-zA-Z0-9]+)/,
      /https:\/\/www\.figma\.com\/design\/([a-zA-Z0-9]+)\/[^?]*\?[^#]*node-id=([^&]+)/,
      /https:\/\/www\.figma\.com\/design\/([a-zA-Z0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          fileKey: match[1],
          nodeId: match[2]?.replace(/-/g, ':')
        };
      }
    }

    throw new Error(`Invalid Figma URL: ${url}`);
  }

  /**
   * Get design information from Figma URL
   */
  async getDesignFromUrl(url: string): Promise<FigmaDesign> {
    const { fileKey, nodeId } = this.parseFigmaUrl(url);
    
    try {
      // Get file information
      const fileResponse = await this.client.get(`/files/${fileKey}`);
      const file = fileResponse.data;

      let targetNode = null;
      let nodeName = 'Root';

      // Find specific node if nodeId is provided
      if (nodeId) {
        const nodesResponse = await this.client.get(`/files/${fileKey}/nodes`, {
          params: { ids: nodeId }
        });
        
        if (nodesResponse.data.nodes[nodeId]) {
          targetNode = nodesResponse.data.nodes[nodeId];
          nodeName = targetNode.document.name;
        }
      }

      // Get node styles and properties
      const specifications = await this.extractDesignSpecifications(fileKey, nodeId);

      // Generate image URL if needed
      let imageUrl: string | undefined;
      if (nodeId) {
        try {
          const imageResponse = await this.client.get(`/images/${fileKey}`, {
            params: { 
              ids: nodeId,
              format: 'png',
              scale: 2
            }
          });
          imageUrl = imageResponse.data.images[nodeId];
        } catch (error) {
          console.warn('Failed to generate image for node:', error);
        }
      }

      return {
        fileKey,
        nodeId: nodeId || 'root',
        name: nodeName,
        type: targetNode?.document.type || 'FILE',
        url,
        imageUrl,
        specifications
      };
    } catch (error) {
      throw new Error(`Failed to fetch Figma design: ${error}`);
    }
  }

  /**
   * Extract design specifications from a node
   */
  private async extractDesignSpecifications(fileKey: string, nodeId?: string): Promise<DesignSpecification[]> {
    const specifications: DesignSpecification[] = [];

    try {
      let nodeData = null;

      if (nodeId) {
        const nodesResponse = await this.client.get(`/files/${fileKey}/nodes`, {
          params: { ids: nodeId }
        });
        nodeData = nodesResponse.data.nodes[nodeId]?.document;
      }

      if (!nodeData) {
        return specifications;
      }

      // Extract basic layout properties
      if (nodeData.absoluteBoundingBox) {
        const bounds = nodeData.absoluteBoundingBox;
        specifications.push(
          {
            property: 'width',
            value: bounds.width.toString(),
            unit: 'px',
            description: 'Element width'
          },
          {
            property: 'height',
            value: bounds.height.toString(),
            unit: 'px',
            description: 'Element height'
          }
        );
      }

      // Extract fill colors
      if (nodeData.fills && nodeData.fills.length > 0) {
        nodeData.fills.forEach((fill: any, index: number) => {
          if (fill.type === 'SOLID') {
            const color = this.rgbaToHex(fill.color, fill.opacity);
            specifications.push({
              property: `background-color${index > 0 ? `-${index}` : ''}`,
              value: color,
              description: `Fill color ${index + 1}`
            });
          }
        });
      }

      // Extract stroke properties
      if (nodeData.strokes && nodeData.strokes.length > 0) {
        nodeData.strokes.forEach((stroke: any, index: number) => {
          if (stroke.type === 'SOLID') {
            const color = this.rgbaToHex(stroke.color, stroke.opacity);
            specifications.push({
              property: `border-color${index > 0 ? `-${index}` : ''}`,
              value: color,
              description: `Stroke color ${index + 1}`
            });
          }
        });

        if (nodeData.strokeWeight) {
          specifications.push({
            property: 'border-width',
            value: nodeData.strokeWeight.toString(),
            unit: 'px',
            description: 'Border width'
          });
        }
      }

      // Extract corner radius
      if (nodeData.cornerRadius !== undefined) {
        specifications.push({
          property: 'border-radius',
          value: nodeData.cornerRadius.toString(),
          unit: 'px',
          description: 'Corner radius'
        });
      }

      // Extract text properties
      if (nodeData.type === 'TEXT' && nodeData.style) {
        const style = nodeData.style;
        
        if (style.fontSize) {
          specifications.push({
            property: 'font-size',
            value: style.fontSize.toString(),
            unit: 'px',
            description: 'Font size'
          });
        }

        if (style.fontFamily) {
          specifications.push({
            property: 'font-family',
            value: style.fontFamily,
            description: 'Font family'
          });
        }

        if (style.fontWeight) {
          specifications.push({
            property: 'font-weight',
            value: style.fontWeight.toString(),
            description: 'Font weight'
          });
        }

        if (style.lineHeightPx) {
          specifications.push({
            property: 'line-height',
            value: style.lineHeightPx.toString(),
            unit: 'px',
            description: 'Line height'
          });
        }

        if (style.letterSpacing) {
          specifications.push({
            property: 'letter-spacing',
            value: style.letterSpacing.toString(),
            unit: 'px',
            description: 'Letter spacing'
          });
        }

        if (style.textAlignHorizontal) {
          specifications.push({
            property: 'text-align',
            value: style.textAlignHorizontal.toLowerCase(),
            description: 'Text alignment'
          });
        }
      }

      // Extract padding/spacing from auto-layout
      if (nodeData.paddingLeft !== undefined) {
        specifications.push({
          property: 'padding-left',
          value: nodeData.paddingLeft.toString(),
          unit: 'px',
          description: 'Left padding'
        });
      }

      if (nodeData.paddingRight !== undefined) {
        specifications.push({
          property: 'padding-right',
          value: nodeData.paddingRight.toString(),
          unit: 'px',
          description: 'Right padding'
        });
      }

      if (nodeData.paddingTop !== undefined) {
        specifications.push({
          property: 'padding-top',
          value: nodeData.paddingTop.toString(),
          unit: 'px',
          description: 'Top padding'
        });
      }

      if (nodeData.paddingBottom !== undefined) {
        specifications.push({
          property: 'padding-bottom',
          value: nodeData.paddingBottom.toString(),
          unit: 'px',
          description: 'Bottom padding'
        });
      }

      // Extract gap from auto-layout
      if (nodeData.itemSpacing !== undefined) {
        specifications.push({
          property: 'gap',
          value: nodeData.itemSpacing.toString(),
          unit: 'px',
          description: 'Gap between items'
        });
      }

    } catch (error) {
      console.warn('Failed to extract design specifications:', error);
    }

    return specifications;
  }

  /**
   * Convert RGBA color to hex
   */
  private rgbaToHex(color: any, opacity: number = 1): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = Math.round(opacity * 255);

    if (a < 255) {
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
    } else {
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }

  /**
   * Get team projects
   */
  async getTeamProjects(teamId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/teams/${teamId}/projects`);
      return response.data.projects;
    } catch (error) {
      throw new Error(`Failed to fetch team projects: ${error}`);
    }
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/projects/${projectId}/files`);
      return response.data.files;
    } catch (error) {
      throw new Error(`Failed to fetch project files: ${error}`);
    }
  }

  /**
   * Get file components
   */
  async getFileComponents(fileKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/files/${fileKey}/components`);
      return Object.values(response.data.meta.components);
    } catch (error) {
      throw new Error(`Failed to fetch file components: ${error}`);
    }
  }

  /**
   * Get file styles
   */
  async getFileStyles(fileKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/files/${fileKey}/styles`);
      return Object.values(response.data.meta.styles);
    } catch (error) {
      throw new Error(`Failed to fetch file styles: ${error}`);
    }
  }

  /**
   * Test connection to Figma
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/me');
      return true;
    } catch (error) {
      return false;
    }
  }
} 