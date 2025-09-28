import { RepositoryAnalysis as RepositoryAnalysisType } from "@/lib/github-analysis";
import { AnalysisTone } from './types';
import { isValidGitHubUrl } from './utils/github';
import ErrorMessage from './ErrorMessage';
import LoadingMessage from './LoadingMessage';

interface RepositoryAnalysisProps {
  githubRepoUrl: string;
  setGithubRepoUrl: (url: string) => void;
  analysisTone: AnalysisTone;
  setAnalysisTone: (tone: AnalysisTone) => void;
  repoLoading: boolean;
  aiAnalyzing: boolean;
  loadingText: string;
  urlError: string;
  setUrlError: (error: string) => void;
  repoData: RepositoryAnalysisType | null;
  onSubmit: (e: React.FormEvent) => void;
}

export default function RepositoryAnalysis({
  githubRepoUrl,
  setGithubRepoUrl,
  analysisTone,
  setAnalysisTone,
  repoLoading,
  aiAnalyzing,
  loadingText,
  urlError,
  setUrlError,
  repoData,
  onSubmit
}: RepositoryAnalysisProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGithubRepoUrl(e.target.value);
    setUrlError("");
  };

  return (
    <div className="space-y-6 sm:space-y-8 my-12 sm:my-24 px-2 sm:px-0">
      {/* Repository Analysis Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 text-yellow-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <span>Analyze GitHub</span>
          <span className="bg-yellow-200 text-black px-2 py-1 rounded text-xl sm:text-2xl lg:text-5xl">Repository</span> 
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm px-4">Get insights into contributors, languages, and activity for any repository</p>
      </div>

      {/* Analysis Mode Toggle */}
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-center gap-4">
          <span className="text-slate-400 text-sm">Analysis Style:</span>
          <div className="flex items-center gap-3">
            <span className={`text-sm transition-colors ${analysisTone === 'fun' ? 'text-slate-400' : 'text-yellow-200 font-medium'}`}>
              Professional
            </span>
           
            <button
              onClick={() => setAnalysisTone(analysisTone === 'fun' ? 'serious' : 'fun')}
              className={`hover:cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                analysisTone === 'fun' ? 'bg-yellow-200' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  analysisTone === 'fun' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm transition-colors ${analysisTone === 'serious' ? 'text-slate-400' : 'text-yellow-200 font-medium'}`}>
              Fun
            </span>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-2">
          {analysisTone === 'fun' 
            ? 'Get a playful, creative analysis with personality insights' 
            : 'Get a professional, data-focused analysis'
          }
        </p>
      </div>

      {/* Repository Search Form */}
      <div className="max-w-2xl mx-auto px-4">
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="url"
            value={githubRepoUrl}
            onChange={handleInputChange}
            placeholder="https://github.com/username/repository"
            className="flex-1 px-3 sm:px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-yellow-200 focus:shadow-lg focus:shadow-yellow-200/50 hover:bg-slate-800 transition-all duration-300 text-sm sm:text-base"
            required
          />
          <button
            type="submit"
            disabled={repoLoading || !githubRepoUrl.trim()}
            className="px-4 sm:px-8 py-3 bg-yellow-200 text-black font-semibold rounded-md hover:bg-yellow-100 hover:scale-105 hover:shadow-lg hover:shadow-yellow-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:cursor-pointer text-sm sm:text-base w-full sm:w-auto"
          >
            {repoLoading ? `${loadingText}...` : 'Analyze Repository'}
          </button>
        </form>
        
        {/* URL Error Message for Repository Analysis */}
        {urlError && (
          <div className="mt-4">
            <ErrorMessage error={urlError} />
          </div>
        )}
        
        {/* Enhanced Loading Message for Repository Analysis */}
        {(repoLoading || aiAnalyzing) && (
          <div className="mt-6">
            <LoadingMessage
              loadingText={loadingText}
              title={aiAnalyzing ? "team dynamics" : "repository"}
              description={aiAnalyzing ? 'AI is analyzing contributor patterns and personalities' : 'Gathering repository statistics and contributor data'}
              estimatedTime={aiAnalyzing ? '1-2 minutes' : '30-60 seconds'}
              process={aiAnalyzing ? 'Analyzing commits → Identifying patterns → Generating insights' : 'Fetching data → Processing stats → Building dashboard'}
              theme="yellow"
            />
          </div>
        )}
      </div>

      {/* Repository Dashboard */}
      {repoData && (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
          {/* Repository Header */}
          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <img
                src={repoData.repository.owner.avatar_url}
                alt={repoData.repository.owner.login}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-yellow-200 shadow-lg flex-shrink-0"
              />
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {repoData.repository.name}
                </h3>
                <p className="text-yellow-200 font-medium">by @{repoData.repository.owner.login}</p>
                {repoData.repository.description && (
                  <p className="text-slate-400 mt-2 text-sm sm:text-base">{repoData.repository.description}</p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-slate-400">
                  <span>⭐ {repoData.repository.stargazers_count} stars</span>
                  <span>🍴 {repoData.repository.forks_count} forks</span>
                  <span>📅 Created {new Date(repoData.repository.created_at).getFullYear()}</span>
                  <a
                    href={repoData.repository.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-200 hover:text-yellow-100 transition-colors hover:cursor-pointer"
                  >
                    View Repository →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
              <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                {repoData.stats.totalCommits}
              </div>
              <div className="text-slate-400 text-xs sm:text-sm">Total Commits</div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
              <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                {repoData.stats.totalContributors}
              </div>
              <div className="text-slate-400 text-xs sm:text-sm">Contributors</div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
              <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                {repoData.stats.topLanguage}
              </div>
              <div className="text-slate-400 text-xs sm:text-sm">Top Language</div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
              <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                {Math.round(repoData.repository.size / 1024)} MB
              </div>
              <div className="text-slate-400 text-xs sm:text-sm">Repository Size</div>
            </div>
          </div>

          {/* Languages & Contributors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Language Breakdown */}
            <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
              <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Language Breakdown</h4>
              <div className="space-y-3">
                {repoData.stats.languageBreakdown.length > 0 ? (
                  repoData.stats.languageBreakdown.map((lang) => (
                    <div key={lang.language} className="flex items-center justify-between">
                      <span className="text-slate-300">{lang.language}</span>
                      <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow-200 h-2 rounded-full"
                          style={{
                            width: `${lang.percentage}%`
                          }}
                        ></div>
                      </div>
                        <span className="text-slate-400 text-sm w-12">{lang.percentage}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    <div className="text-sm">Language data not available</div>
                    <div className="text-xs mt-1">Repository may not have detectable languages</div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
              <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Top Contributors</h4>
              <div className="space-y-3">
                {repoData.stats.topContributors.length > 0 ? (
                  repoData.stats.topContributors.slice(0, 5).map((contributor) => (
                    <div key={contributor.user.login} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <img
                          src={contributor.user.avatar_url}
                          alt={contributor.user.login}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-slate-600 flex-shrink-0"
                        />
                        <span className="text-slate-300 text-sm sm:text-base truncate">{contributor.user.login}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm text-white">{contributor.commits} commits</div>
                          <div className="text-xs text-slate-400">{contributor.percentage}%</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    <div className="text-sm">Contributor statistics are being processed</div>
                    <div className="text-xs mt-1">This may take a few moments for large repositories</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          {repoData.aiInsights ? (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                🤖 AI Team Analysis
              </h3>
              
              {/* Team Dynamics & Project Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                  <h4 className="text-lg sm:text-xl font-bold text-yellow-200 mb-2 sm:mb-3">Team Dynamics</h4>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {repoData.aiInsights.teamDynamics}
                  </p>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                  <h4 className="text-lg sm:text-xl font-bold text-yellow-200 mb-2 sm:mb-3">Project Health</h4>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {repoData.aiInsights.projectHealth}
                  </p>
                </div>
              </div>

              {/* Contributor Personalities */}
              <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                <h4 className="text-lg sm:text-xl font-bold text-yellow-200 mb-3 sm:mb-4">Contributor Personalities</h4>
                <div className="space-y-4 sm:space-y-6">
                  {repoData.aiInsights.contributorPersonalities.map((personality) => (
                    <div key={personality.user.login} className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-600">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <img
                          src={personality.user.avatar_url}
                          alt={personality.user.login}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-200 flex-shrink-0 self-center sm:self-start"
                        />
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2 sm:mb-2">
                            <h5 className="text-base sm:text-lg font-semibold text-white text-center sm:text-left">
                              {personality.user.login}
                            </h5>
                            <span className="px-2 py-1 bg-yellow-200/20 text-yellow-200 text-xs rounded-full">
                              {personality.workPattern}
                            </span>
                          </div>
                          
                          <div className="space-y-2 sm:space-y-3 text-center sm:text-left">
                            <div>
                              <span className="text-xs sm:text-sm font-medium text-yellow-200">Working Style: </span>
                              <span className="text-xs sm:text-sm text-slate-300">{personality.workingStyle}</span>
                            </div>
                            
                            <div>
                              <span className="text-xs sm:text-sm font-medium text-yellow-200">Personality: </span>
                              <span className="text-xs sm:text-sm text-slate-300">{personality.personality}</span>
                            </div>
                            
                            <div>
                              <span className="text-xs sm:text-sm font-medium text-yellow-200">Collaboration: </span>
                              <span className="text-xs sm:text-sm text-slate-300">{personality.collaborationStyle}</span>
                            </div>
                            
                            <div>
                              <span className="text-xs sm:text-sm font-medium text-yellow-200">Strengths: </span>
                              <div className="flex flex-wrap gap-1 mt-1 justify-center sm:justify-start">
                                {personality.strengths.map((strength, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-yellow-200/20 text-yellow-200 text-xs rounded-full"
                                  >
                                    {strength}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : aiAnalyzing ? (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                🤖 AI Team Analysis
              </h3>
              <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-yellow-200 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-300 text-sm">
                  AI is analyzing contributor patterns and team dynamics...
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  This may take 10-30 seconds depending on repository complexity
                </p>
              </div>
            </div>
          ) : repoData.stats.totalContributors > 0 ? (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                🤖 AI Team Analysis
              </h3>
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center">
                <p className="text-slate-400 text-sm">
                  AI analysis requires OpenAI API key configuration
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Set OPENAI_API_KEY environment variable to enable personality insights
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
