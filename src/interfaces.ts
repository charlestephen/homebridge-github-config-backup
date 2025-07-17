export interface GitHubConfigBackupConfig {
  github_token: string;
  github_repo: string;
  branch: string;
  backup_interval: number;
  file_path: string;
}