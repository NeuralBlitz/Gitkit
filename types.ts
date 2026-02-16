
export interface WikiPage {
  id: string;
  title: string;
  content: string;
  icon?: string;
}

export interface WikiData {
  projectName: string;
  description: string;
  pages: WikiPage[];
}

export interface GithubFileInfo {
  path: string;
  type: 'blob' | 'tree';
  url: string;
  size?: number;
}

export interface GithubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
}
