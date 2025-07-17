import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import chokidar from 'chokidar';
import { GitHubService } from './github.service';
import { GitHubConfigBackupConfig } from './interfaces';

export class GitHubConfigBackupPlatform implements DynamicPlatformPlugin {
  private githubService?: GitHubService;
  private watcher?: chokidar.FSWatcher;
  private backupTimer?: NodeJS.Timeout;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    if (!this.validateConfig()) return;

    try {
      this.githubService = new GitHubService(
        (this.config as GitHubConfigBackupConfig).github_token,
        (this.config as GitHubConfigBackupConfig).github_repo,
        (this.config as GitHubConfigBackupConfig).branch || 'main',
        (this.config as GitHubConfigBackupConfig).file_path || 'homebridge-config.json',
        log
      );

      this.setupBackup();
      this.setupShutdownHandler();

      log.info('GitHub Config Backup platform initialized');
    } catch (error) {
      log.error('Platform initialization failed:', error.message);
    }
  }

  configureAccessory(accessory: PlatformAccessory): void {
    // No accessories needed
  }

  private validateConfig(): boolean {
    const cfg = this.config as GitHubConfigBackupConfig;
    if (!cfg.github_token || !cfg.github_repo) {
      this.log.error('Missing required configuration: github_token and github_repo');
      return false;
    }
    return true;
  }

  private setupBackup(): void {
    const configPath = this.api.user.configPath();
    const backupInterval = (this.config as GitHubConfigBackupConfig).backup_interval || 1440;

    // Initial backup
    this.backupToGitHub();

    // Watch for config changes (debounced)
    this.watcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 5000,
        pollInterval: 100
      }
    });

    this.watcher.on('change', () => {
      this.log('Config change detected. Backing up...');
      this.backupToGitHub();
    });

    // Scheduled backups
    this.backupTimer = setInterval(
      () => this.backupToGitHub(),
      backupInterval * 60 * 1000
    );

    this.log(`Watching config for changes. Backups every ${backupInterval} minutes.`);
  }

  private async backupToGitHub(): Promise<void> {
    try {
      await this.githubService!.backupConfig(this.api.user.configPath());
    } catch (error) {
      this.log.error('Backup failed:', error.message);
    }
  }

  private setupShutdownHandler(): void {
    this.api.on('shutdown', () => {
      this.log('Shutting down. Cleaning up...');
      if (this.watcher) {
        this.watcher.close();
      }
      if (this.backupTimer) {
        clearInterval(this.backupTimer);
      }
    });
  }
}