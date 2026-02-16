
import { GithubFileInfo, GithubRepoInfo } from '../types';

export class GithubService {
  static parseUrl(url: string): GithubRepoInfo | null {
    try {
      // More robust cleaning of the URL
      const cleanUrl = url.trim().replace(/\/$/, '');
      const path = cleanUrl.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
      const parts = path.split('/').filter(Boolean);
      
      if (parts.length >= 2) {
        return {
          owner: parts[0],
          repo: parts[1],
          defaultBranch: 'main'
        };
      }
    } catch (e) {
      console.error("Failed to parse GitHub URL", e);
    }
    return null;
  }

  static async getRepoDetails(owner: string, repo: string): Promise<any> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Repository not found or private");
    }
    return await response.json();
  }

  static async getTree(owner: string, repo: string, branch: string): Promise<GithubFileInfo[]> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    if (!response.ok) throw new Error("Failed to fetch repository tree");
    const data = await response.json();
    return data.tree;
  }

  static async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
      if (!response.ok) return "";
      const data = await response.json();
      if (data.content) {
        // Robust Base64 decoding for UTF-8 content
        const base64 = data.content.replace(/\n/g, '');
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      }
    } catch (e) {
      console.error(`Error fetching file content for ${path}:`, e);
    }
    return "";
  }
}
