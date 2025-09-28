// GitHub Repository Analysis Utilities

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  owner: GitHubUser;
}

export interface ContributorStats {
  author: GitHubUser;
  total: number;
  weeks: Array<{
    w: number; // week timestamp
    a: number; // additions
    d: number; // deletions
    c: number; // commits
  }>;
}

export interface LanguageStats {
  [language: string]: number; // bytes of code
}

export interface ContributorPersonality {
  user: GitHubUser;
  workingStyle: string;
  personality: string;
  strengths: string[];
  collaborationStyle: string;
  workPattern: string;
}

export interface RepositoryAnalysis {
  repository: GitHubRepository;
  contributors: ContributorStats[];
  languages: LanguageStats;
  stats: {
    totalCommits: number;
    totalContributors: number;
    topLanguage: string;
    languageBreakdown: Array<{
      language: string;
      percentage: number;
      bytes: number;
    }>;
    topContributors: Array<{
      user: GitHubUser;
      commits: number;
      additions: number;
      deletions: number;
      percentage: number;
    }>;
    activityTimeline: Array<{
      week: string;
      commits: number;
      additions: number;
      deletions: number;
    }>;
  };
  aiInsights?: {
    teamDynamics: string;
    projectHealth: string;
    contributorPersonalities: ContributorPersonality[];
  };
}

/**
 * Analyzes a GitHub repository and returns comprehensive statistics
 */
export async function analyzeGitHubRepository(repoUrl: string, setAiAnalyzing?: (analyzing: boolean) => void, analysisTone: 'fun' | 'serious' = 'fun'): Promise<RepositoryAnalysis> {
  // Parse repository URL to get owner and repo name
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  
  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, ''); // Remove .git suffix if present

  // Fetch repository information
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
  if (!repoResponse.ok) {
    throw new Error('Repository not found');
  }
  const repoData: GitHubRepository = await repoResponse.json();

  // Fetch contributors statistics
  const contributorsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/stats/contributors`);
  let contributorsData: ContributorStats[] = [];
  
  if (contributorsResponse.ok) {
    const rawContributorsData = await contributorsResponse.json();
    // GitHub API sometimes returns 202 with empty array when stats are being computed
    if (Array.isArray(rawContributorsData) && rawContributorsData.length > 0) {
      contributorsData = rawContributorsData;
    }
  }
  
  // Fallback: if stats are not available, try basic contributors list
  if (contributorsData.length === 0) {
    try {
      const basicContributorsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contributors`);
      if (basicContributorsResponse.ok) {
        const basicContributors = await basicContributorsResponse.json();
        if (Array.isArray(basicContributors)) {
          // Convert basic contributor data to stats format with minimal info
          contributorsData = basicContributors.map(contributor => ({
            author: {
              login: contributor.login,
              avatar_url: contributor.avatar_url,
              html_url: contributor.html_url
            },
            total: contributor.contributions || 0,
            weeks: [] // Empty weeks array as we don't have detailed stats
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to fetch basic contributors:', error);
    }
  }

  // Fetch language statistics
  const languagesResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/languages`);
  let languagesData: LanguageStats = {};
  if (languagesResponse.ok) {
    languagesData = await languagesResponse.json();
  }

  // Analyze the data with safe fallbacks
  const safeContributorsData = Array.isArray(contributorsData) ? contributorsData : [];
  const topContributors = getTopContributors(safeContributorsData);
  const activityTimeline = getActivityTimeline(safeContributorsData);
  
  const analysis: RepositoryAnalysis = {
    repository: repoData,
    contributors: safeContributorsData,
    languages: languagesData,
    stats: {
      totalCommits: safeContributorsData.reduce((sum, contributor) => sum + contributor.total, 0),
      totalContributors: safeContributorsData.length,
      topLanguage: getTopLanguage(languagesData),
      languageBreakdown: getLanguageBreakdown(languagesData),
      topContributors,
      activityTimeline
    }
  };

  // Add AI insights if contributors data is available
  if (safeContributorsData.length > 0 && topContributors.length > 0) {
    try {
      if (setAiAnalyzing) setAiAnalyzing(true);
      const aiInsights = await analyzeContributorsWithAI(
        repoData,
        safeContributorsData,
        topContributors,
        activityTimeline,
        analysisTone
      );
      analysis.aiInsights = aiInsights;
    } catch (error) {
      console.warn('Failed to get AI insights:', error);
      // AI insights will remain undefined
    } finally {
      if (setAiAnalyzing) setAiAnalyzing(false);
    }
  }

  return analysis;
}

/**
 * Gets the top language by bytes of code
 */
export function getTopLanguage(languages: LanguageStats): string {
  if (Object.keys(languages).length === 0) return 'Unknown';
  
  return Object.entries(languages)
    .sort(([,a], [,b]) => b - a)[0][0];
}

/**
 * Converts language statistics to percentage breakdown
 */
export function getLanguageBreakdown(languages: LanguageStats): Array<{
  language: string;
  percentage: number;
  bytes: number;
}> {
  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  
  if (totalBytes === 0) return [];
  
  return Object.entries(languages)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 100)
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * Gets top contributors by commit count
 */
export function getTopContributors(contributors: ContributorStats[]): Array<{
  user: GitHubUser;
  commits: number;
  additions: number;
  deletions: number;
  percentage: number;
}> {
  const totalCommits = contributors.reduce((sum, contributor) => sum + contributor.total, 0);
  
  if (totalCommits === 0) return [];
  
  return contributors
    .map(contributor => {
      const additions = contributor.weeks.reduce((sum, week) => sum + week.a, 0);
      const deletions = contributor.weeks.reduce((sum, week) => sum + week.d, 0);
      
      return {
        user: contributor.author,
        commits: contributor.total,
        additions,
        deletions,
        percentage: Math.round((contributor.total / totalCommits) * 100)
      };
    })
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10); // Top 10 contributors
}

/**
 * Creates activity timeline from contributor data
 */
export function getActivityTimeline(contributors: ContributorStats[]): Array<{
  week: string;
  commits: number;
  additions: number;
  deletions: number;
}> {
  const weeklyData: { [week: number]: { commits: number; additions: number; deletions: number } } = {};
  
  contributors.forEach(contributor => {
    contributor.weeks.forEach(week => {
      if (!weeklyData[week.w]) {
        weeklyData[week.w] = { commits: 0, additions: 0, deletions: 0 };
      }
      weeklyData[week.w].commits += week.c;
      weeklyData[week.w].additions += week.a;
      weeklyData[week.w].deletions += week.d;
    });
  });
  
  return Object.entries(weeklyData)
    .map(([timestamp, data]) => ({
      week: new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0],
      ...data
    }))
    .sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime())
    .slice(0, 12); // Last 12 weeks
}

/**
 * Analyzes contributors using OpenAI to provide personality insights
 */
export async function analyzeContributorsWithAI(
  repository: GitHubRepository,
  contributors: ContributorStats[],
  topContributors: Array<{
    user: GitHubUser;
    commits: number;
    additions: number;
    deletions: number;
    percentage: number;
  }>,
  activityTimeline: Array<{
    week: string;
    commits: number;
    additions: number;
    deletions: number;
  }>,
  analysisTone: 'fun' | 'serious' = 'fun'
): Promise<{
  teamDynamics: string;
  projectHealth: string;
  contributorPersonalities: ContributorPersonality[];
}> {
  try {
    // Prepare data for AI analysis
    const analysisData = {
      repository: {
        name: repository.name,
        description: repository.description,
        language: repository.language,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        size: repository.size,
        created: repository.created_at,
        updated: repository.updated_at
      },
      contributors: topContributors.slice(0, 5).map(contributor => ({
        username: contributor.user.login,
        commits: contributor.commits,
        additions: contributor.additions,
        deletions: contributor.deletions,
        percentage: contributor.percentage,
        // Calculate work patterns from contributor stats
        workPattern: analyzeWorkPattern(contributors.find(c => c.author.login === contributor.user.login))
      })),
      activityTimeline: activityTimeline.slice(0, 8) // Last 8 weeks
    };

    const response = await fetch('/api/analyze-contributors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...analysisData,
        analysisTone
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze contributors with AI');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing contributors with AI:', error);
    // Return fallback data if AI analysis fails
    return {
      teamDynamics: "AI analysis unavailable - please check your OpenAI configuration.",
      projectHealth: "Unable to assess project health without AI analysis.",
      contributorPersonalities: topContributors.slice(0, 3).map(contributor => ({
        user: contributor.user,
        workingStyle: "Analysis unavailable",
        personality: "Unable to determine without AI analysis",
        strengths: ["Data unavailable"],
        collaborationStyle: "Unknown",
        workPattern: "Unable to analyze"
      }))
    };
  }
}

/**
 * Analyzes work patterns from contributor statistics
 */
function analyzeWorkPattern(contributor: ContributorStats | undefined): string {
  if (!contributor || contributor.weeks.length === 0) {
    return "Insufficient data";
  }

  const recentWeeks = contributor.weeks.slice(-12); // Last 12 weeks
  const activeWeeks = recentWeeks.filter(week => week.c > 0).length;
  const avgCommitsPerActiveWeek = recentWeeks.reduce((sum, week) => sum + week.c, 0) / Math.max(activeWeeks, 1);
  const consistency = activeWeeks / recentWeeks.length;

  if (consistency > 0.8) {
    return "Highly consistent contributor";
  } else if (consistency > 0.5) {
    return "Regular contributor";
  } else if (avgCommitsPerActiveWeek > 5) {
    return "Burst contributor (high intensity, sporadic)";
  } else {
    return "Occasional contributor";
  }
}
