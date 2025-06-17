import axios, { AxiosInstance } from 'axios';
import { JiraTask } from '../types';

export interface JiraMCPConfig {
  host: string;
  username: string;
  apiToken: string;
  projectKey: string;
}

export class JiraMCPClient {
  private client: AxiosInstance;
  private config: JiraMCPConfig;

  constructor(config: JiraMCPConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.host}/rest/api/3`,
      auth: {
        username: config.username,
        password: config.apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Get Jira task by key/number
   */
  async getTask(taskKey: string): Promise<JiraTask> {
    try {
      const response = await this.client.get(`/issue/${taskKey}`, {
        params: {
          expand: 'description,comment,attachment'
        }
      });

      const issue = response.data;
      
      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName,
        priority: issue.fields.priority?.name || 'Medium',
        labels: issue.fields.labels || [],
        components: issue.fields.components?.map((c: any) => c.name) || [],
        issueType: issue.fields.issuetype.name,
        figmaLinks: this.extractFigmaLinks(issue),
        acceptanceCriteria: this.extractAcceptanceCriteria(issue)
      };
    } catch (error) {
      throw new Error(`Failed to fetch Jira task ${taskKey}: ${error}`);
    }
  }

  /**
   * Get multiple tasks by JQL query
   */
  async getTasksByJQL(jql: string, maxResults: number = 50): Promise<JiraTask[]> {
    try {
      const response = await this.client.post('/search', {
        jql,
        maxResults,
        expand: ['description', 'comment', 'attachment']
      });

      return response.data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName,
        priority: issue.fields.priority?.name || 'Medium',
        labels: issue.fields.labels || [],
        components: issue.fields.components?.map((c: any) => c.name) || [],
        issueType: issue.fields.issuetype.name,
        figmaLinks: this.extractFigmaLinks(issue),
        acceptanceCriteria: this.extractAcceptanceCriteria(issue)
      }));
    } catch (error) {
      throw new Error(`Failed to search Jira tasks: ${error}`);
    }
  }

  /**
   * Get tasks assigned to current user
   */
  async getMyTasks(): Promise<JiraTask[]> {
    const jql = `assignee = currentUser() AND status != Done ORDER BY priority DESC, created DESC`;
    return this.getTasksByJQL(jql);
  }

  /**
   * Get tasks for specific sprint
   */
  async getSprintTasks(sprintId: string): Promise<JiraTask[]> {
    const jql = `sprint = ${sprintId} ORDER BY priority DESC, created DESC`;
    return this.getTasksByJQL(jql);
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskKey: string, transitionId: string): Promise<void> {
    try {
      await this.client.post(`/issue/${taskKey}/transitions`, {
        transition: {
          id: transitionId
        }
      });
    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  /**
   * Add comment to task
   */
  async addComment(taskKey: string, comment: string): Promise<void> {
    try {
      await this.client.post(`/issue/${taskKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment
                }
              ]
            }
          ]
        }
      });
    } catch (error) {
      throw new Error(`Failed to add comment: ${error}`);
    }
  }

  /**
   * Get available transitions for a task
   */
  async getTransitions(taskKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/issue/${taskKey}/transitions`);
      return response.data.transitions;
    } catch (error) {
      throw new Error(`Failed to get transitions: ${error}`);
    }
  }

  /**
   * Extract Figma links from issue description and comments
   */
  private extractFigmaLinks(issue: any): string[] {
    const figmaLinks: string[] = [];
    const figmaRegex = /https:\/\/www\.figma\.com\/[^\s)]+/g;

    // Check description
    const description = issue.fields.description?.content?.[0]?.content?.[0]?.text || '';
    const descriptionLinks = description.match(figmaRegex) || [];
    figmaLinks.push(...descriptionLinks);

    // Check comments
    if (issue.fields.comment?.comments) {
      for (const comment of issue.fields.comment.comments) {
        const commentText = comment.body?.content?.[0]?.content?.[0]?.text || '';
        const commentLinks = commentText.match(figmaRegex) || [];
        figmaLinks.push(...commentLinks);
      }
    }

    // Remove duplicates
    return [...new Set(figmaLinks)];
  }

  /**
   * Extract acceptance criteria from issue description
   */
  private extractAcceptanceCriteria(issue: any): string[] {
    const description = issue.fields.description?.content?.[0]?.content?.[0]?.text || '';
    const criteria: string[] = [];

    // Look for common acceptance criteria patterns
    const patterns = [
      /acceptance criteria:?\s*\n(.*?)(?:\n\n|\n(?=[A-Z])|$)/gis,
      /given.*when.*then.*/gi,
      /user can.*/gi,
      /system should.*/gi
    ];

    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches) {
        criteria.push(...matches);
      }
    }

    return [...new Set(criteria)];
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/myself');
      return true;
    } catch (error) {
      return false;
    }
  }
} 