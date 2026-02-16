
import React, { useState, useEffect, useRef } from 'react';
import { GithubService } from './services/githubService';
import { GeminiService } from './services/geminiService';
import { WikiData, WikiPage } from './types';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const App: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [activePageId, setActivePageId] = useState<string>('home');
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const contentRef = useRef<HTMLElement>(null);

  // Auto-build from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedRepo = params.get('repo');
    const sharedPage = params.get('page');
    
    if (sharedRepo) {
      setRepoUrl(decodeURIComponent(sharedRepo));
      if (sharedPage) setActivePageId(sharedPage);
      // Trigger build after a short delay to ensure state is set
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleBuildWiki(fakeEvent, decodeURIComponent(sharedRepo), sharedPage);
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }
  }, [activePageId]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBuildWiki = async (e: React.FormEvent, overrideUrl?: string, overridePage?: string) => {
    e.preventDefault();
    const targetUrl = overrideUrl || repoUrl;
    if (!targetUrl) return;

    setLoading(true);
    setError(null);
    setWikiData(null);

    try {
      const parsed = GithubService.parseUrl(targetUrl);
      if (!parsed) throw new Error("Invalid GitHub URL format.");

      setLoadingStep("Fetching repository details...");
      const repoDetails = await GithubService.getRepoDetails(parsed.owner, parsed.repo);
      const branch = repoDetails.default_branch || 'main';

      setLoadingStep("Analyzing file structure...");
      const tree = await GithubService.getTree(parsed.owner, parsed.repo, branch);
      const fileTreeString = tree
        .filter(f => !f.path.includes('node_modules') && !f.path.startsWith('.'))
        .map(f => f.path)
        .slice(0, 150)
        .join('\n');

      setLoadingStep("Reading key configuration files...");
      const keyFilesToFetch = ['README.md', 'package.json', 'src/index.ts', 'src/App.tsx', 'requirements.txt', 'main.py', 'go.mod'];
      const fetchedFiles: Record<string, string> = {};

      for (const path of keyFilesToFetch) {
        const found = tree.find(f => f.path.toLowerCase() === path.toLowerCase());
        if (found) {
          const content = await GithubService.getFileContent(parsed.owner, parsed.repo, found.path);
          if (content) fetchedFiles[found.path] = content;
        }
      }

      setLoadingStep("AI is crafting your documentation (this may take a minute)...");
      const generatedWiki = await GeminiService.generateWiki(repoDetails, fileTreeString, fetchedFiles);
      
      setWikiData(generatedWiki);
      if (overridePage && generatedWiki.pages.some(p => p.id === overridePage)) {
        setActivePageId(overridePage);
      } else {
        setActivePageId(generatedWiki.pages[0]?.id || 'home');
      }

      // Update URL without refreshing
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('repo', targetUrl);
      window.history.replaceState({}, '', newUrl);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!wikiData) return;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?repo=${encodeURIComponent(repoUrl)}&page=${activePageId}`;
    const shareText = `Check out the AI-generated wiki for ${wikiData.projectName}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `GitWiki: ${wikiData.projectName}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard!");
      } catch (err) {
        showToast("Failed to copy link", "error");
      }
    }
  };

  const handleNavigate = (pageId: string) => {
    const exists = wikiData?.pages.some(p => p.id === pageId);
    if (exists) {
      setActivePageId(pageId);
      setIsSidebarOpen(false);
      
      // Update URL page param
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('page', pageId);
      window.history.replaceState({}, '', newUrl);
    }
  };

  const activePage = wikiData?.pages.find(p => p.id === activePageId) || wikiData?.pages[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {wikiData && (
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">GitWiki <span className="text-indigo-600">Builder</span></h1>
          </div>
        </div>
        
        {!wikiData && !loading && (
          <div className="text-sm text-slate-500 font-medium">Turn repos into docs in seconds</div>
        )}

        {wikiData && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              <span>Share</span>
            </button>
            <button 
              onClick={() => {
                setWikiData(null);
                const newUrl = new URL(window.location.origin + window.location.pathname);
                window.history.replaceState({}, '', newUrl);
              }}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Start New
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto relative">
        {!wikiData && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
            <div className="mb-8 p-4 bg-indigo-50 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Build your Wiki instantly</h2>
            <p className="text-slate-600 mb-8 text-lg">
              Paste a public GitHub repository URL and let our AI generate a comprehensive, 
              structured Wiki documentation site for your project.
            </p>
            
            <form onSubmit={handleBuildWiki} className="w-full space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="https://github.com/facebook/react"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-6 py-4 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg pr-32"
                />
                <button
                  type="submit"
                  disabled={!repoUrl}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Generate
                </button>
              </div>
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}
            </form>
            
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 className="font-semibold text-slate-800">Auto-Structure</h3>
                <p className="text-sm text-slate-500">Intelligently groups documentation into logical sections.</p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 2a10 10 0 0 1 10 10h-10V2z"></path><path d="M12 12L2.2 9"></path><path d="M12 12L19 21"></path></svg>
                </div>
                <h3 className="font-semibold text-slate-800">Code Analysis</h3>
                <p className="text-sm text-slate-500">Gemini Pro analyzes your code to write accurate docs.</p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                </div>
                <h3 className="font-semibold text-slate-800">Markdown Ready</h3>
                <p className="text-sm text-slate-500">Perfectly formatted markdown you can copy anywhere.</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800">Building your wiki...</h3>
              <p className="text-slate-500 animate-pulse">{loadingStep}</p>
            </div>
          </div>
        )}

        {wikiData && (
          <>
            <aside className={`
              fixed md:static inset-0 z-30 transform md:translate-x-0 transition-transform duration-300 ease-in-out
              w-64 bg-white border-r border-slate-200 overflow-y-auto pt-2 pb-8
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <div className="px-6 py-4 flex flex-col space-y-1">
                <div className="mb-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Navigation</h2>
                  <nav className="space-y-1">
                    {wikiData.pages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => handleNavigate(page.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                          ${activePageId === page.id 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                        `}
                      >
                        <span className="text-lg">{page.icon || '📄'}</span>
                        {page.title}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resources</h2>
                  <div className="space-y-2">
                    <a 
                      href={repoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                      GitHub Repo
                    </a>
                  </div>
                </div>
              </div>
            </aside>

            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              ></div>
            )}

            <article ref={contentRef} className="flex-1 overflow-y-auto bg-white">
              <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
                <div className="mb-8 border-b border-slate-100 pb-8">
                  <div className="flex items-center gap-3 text-sm text-indigo-600 font-semibold mb-2 uppercase tracking-wide">
                    <span>Wiki</span>
                    <span className="text-slate-300">•</span>
                    <span>{wikiData.projectName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-4xl font-extrabold text-slate-900">{activePage?.title}</h1>
                  </div>
                  <p className="text-lg text-slate-500 mt-4">{wikiData.description}</p>
                </div>
                
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <MarkdownRenderer content={activePage?.content || ''} onNavigate={handleNavigate} />
                </div>

                <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between text-sm text-slate-400">
                  <p>© {new Date().getFullYear()} AI-Generated Documentation</p>
                  <p>Powered by Gemini 3 Pro</p>
                </div>
              </div>
            </article>
          </>
        )}
      </main>

      {/* Floating Buttons for Mobile */}
      {wikiData && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 md:hidden">
          <button
            onClick={handleShare}
            className="w-14 h-14 bg-white text-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 border border-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          </button>
          <button
            onClick={() => {
              setWikiData(null);
              setError(null);
              setRepoUrl('');
              const newUrl = new URL(window.location.origin + window.location.pathname);
              window.history.replaceState({}, '', newUrl);
            }}
            className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      )}

      {/* Simple Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl text-white font-medium text-sm animate-in fade-in slide-in-from-bottom-8 duration-300 z-[100] ${
          toast.type === 'success' ? 'bg-slate-900' : 'bg-red-600'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
