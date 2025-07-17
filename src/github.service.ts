import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(
    private token: string,
    repository: string,
    private branch: string,
    private filePath: string,
    private log: any
  ) {
    [this.owner, this.repo] = repository.split('/');
    this.octokit = new Octokit({ auth: this.token });
  }

  async backupConfig(configPath: string): Promise<void> {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const message = `Backup homebridge config: ${new Date().toISOString()}`;

      // Get current SHA if file exists
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: this.filePath,
          ref: this.branch
        });
        sha = 'sha' in data ? data.sha : undefined;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: this.filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: this.branch,
        sha
      });

      this.log('Config backed up to GitHub successfully');
    } catch (error) {
      this.log.error('GitHub backup failed:', error.message);
      throw error;
    }
  }
}