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
exports.GitHubService = void 0;
const rest_1 = require("@octokit/rest");
const promises_1 = __importDefault(require("fs/promises"));
class GitHubService {
    constructor(token, repository, branch, filePath, log) {
        this.token = token;
        this.branch = branch;
        this.filePath = filePath;
        this.log = log;
        [this.owner, this.repo] = repository.split('/');
        this.octokit = new rest_1.Octokit({ auth: this.token });
    }
    backupConfig(configPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const content = yield promises_1.default.readFile(configPath, 'utf8');
                const message = `Backup homebridge config: ${new Date().toISOString()}`;
                // Get current SHA if file exists
                let sha;
                try {
                    const { data } = yield this.octokit.repos.getContent({
                        owner: this.owner,
                        repo: this.repo,
                        path: this.filePath,
                        ref: this.branch
                    });
                    sha = 'sha' in data ? data.sha : undefined;
                }
                catch (error) {
                    if (error.status !== 404)
                        throw error;
                }
                yield this.octokit.repos.createOrUpdateFileContents({
                    owner: this.owner,
                    repo: this.repo,
                    path: this.filePath,
                    message,
                    content: Buffer.from(content).toString('base64'),
                    branch: this.branch,
                    sha
                });
                this.log('Config backed up to GitHub successfully');
            }
            catch (error) {
                this.log.error('GitHub backup failed:', error.message);
                throw error;
            }
        });
    }
}
exports.GitHubService = GitHubService;
