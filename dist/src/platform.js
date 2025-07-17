"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubConfigBackupPlatform = void 0;
const chokidar_1 = __importDefault(require("chokidar"));
const github_service_1 = require("./github.service");
class GitHubConfigBackupPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        if (!this.validateConfig())
            return;
        try {
            this.githubService = new github_service_1.GitHubService(this.config.github_token, this.config.github_repo, this.config.branch || 'main', this.config.file_path || 'homebridge-config.json', log);
            this.setupBackup();
            this.setupShutdownHandler();
            log.info('GitHub Config Backup platform initialized');
        }
        catch (error) {
            log.error('Platform initialization failed:', error.message);
        }
    }
    configureAccessory(accessory) {
        // No accessories needed
    }
    validateConfig() {
        const cfg = this.config;
        if (!cfg.github_token || !cfg.github_repo) {
            this.log.error('Missing required configuration: github_token and github_repo');
            return false;
        }
        return true;
    }
    setupBackup() {
        const configPath = this.api.user.configPath();
        const backupInterval = this.config.backup_interval || 1440;
        // Initial backup
        this.backupToGitHub();
        // Watch for config changes (debounced)
        this.watcher = chokidar_1.default.watch(configPath, {
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
        this.backupTimer = setInterval(() => this.backupToGitHub(), backupInterval * 60 * 1000);
        this.log(`Watching config for changes. Backups every ${backupInterval} minutes.`);
    }
    backupToGitHub() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.githubService.backupConfig(this.api.user.configPath());
            }
            catch (error) {
                this.log.error('Backup failed:', error.message);
            }
        });
    }
    setupShutdownHandler() {
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
exports.GitHubConfigBackupPlatform = GitHubConfigBackupPlatform;
