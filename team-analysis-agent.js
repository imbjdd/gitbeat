import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

class TeamAnalysisAgent {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze GitHub repository data and generate team insights
   */
  async analyzeTeamFromGitHubData(repoData) {
    console.log("🔍 Starting team analysis with OpenAI GPT...");
    
    const analysisPrompt = this.buildAnalysisPrompt(repoData);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert team analyst and organizational psychologist. 
            Analyze GitHub repository data to provide insights about team dynamics, 
            personality types, work styles, and project progress patterns.
            
            Provide your analysis in structured JSON format with the following sections:
            - teamMBTI: MBTI personality analysis for each contributor
            - workStyles: Individual work patterns and preferences
            - teamDynamics: How the team collaborates and divides work
            - progressCurve: Project timeline and development patterns
            - recommendations: Actionable insights for team improvement`
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      console.log("✅ Team analysis completed");
      
      return analysis;
    } catch (error) {
      console.error("❌ Error in team analysis:", error);
      throw error;
    }
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(repoData) {
    return `
    Please analyze the following GitHub repository data and provide comprehensive team insights:

    Repository: ${repoData.name || 'Unknown'}
    Description: ${repoData.description || 'No description'}
    
    Contributors Data:
    ${JSON.stringify(repoData.contributors, null, 2)}
    
    Commit Patterns:
    ${JSON.stringify(repoData.commitPatterns, null, 2)}
    
    Code Statistics:
    ${JSON.stringify(repoData.codeStats, null, 2)}
    
    Issue and PR Data:
    ${JSON.stringify(repoData.issuesAndPRs, null, 2)}
    
    Please provide detailed analysis covering:
    
    1. **Team MBTI Analysis**: Based on commit patterns, code style, and collaboration patterns, infer likely MBTI types for each contributor
    
    2. **Work Styles**: Analyze individual work patterns:
       - Coding frequency and timing
       - Commit message styles
       - Code complexity preferences
       - Collaboration approach
    
    3. **Team Dynamics**: 
       - Role distribution and specializations
       - Communication patterns
       - Decision-making processes
       - Conflict resolution approaches
    
    4. **Progress Curve**: 
       - Project velocity over time
       - Sprint patterns and productivity cycles
       - Milestone achievement patterns
       - Team learning curve
    
    5. **Recommendations**: 
       - Team optimization suggestions
       - Process improvements
       - Individual development areas
       - Communication enhancements
    
    Format your response as valid JSON with clear structure and actionable insights.
    `;
  }

  /**
   * Generate Dashboard data
   */
  async generateDashboard(teamAnalysis, repoData) {
    console.log("📊 Generating dashboard data...");
    
    const dashboard = {
      metadata: {
        generatedAt: new Date().toISOString(),
        repository: repoData.name,
        analysisVersion: "1.0"
      },
      
      teamOverview: {
        totalMembers: teamAnalysis.teamMBTI?.length || 0,
        projectDuration: this.calculateProjectDuration(repoData),
        totalCommits: repoData.commitPatterns?.totalCommits || 0,
        linesOfCode: repoData.codeStats?.totalLines || 0
      },
      
      personalityInsights: {
        mbtiDistribution: this.processMBTIDistribution(teamAnalysis.teamMBTI),
        workStyleMatrix: teamAnalysis.workStyles,
        teamCompatibility: this.calculateTeamCompatibility(teamAnalysis.teamMBTI)
      },
      
      collaborationMetrics: {
        teamDynamics: teamAnalysis.teamDynamics,
        communicationScore: this.calculateCommunicationScore(repoData),
        collaborationIndex: this.calculateCollaborationIndex(repoData)
      },
      
      progressAnalytics: {
        velocityTrend: teamAnalysis.progressCurve,
        productivityMetrics: this.calculateProductivityMetrics(repoData),
        milestoneTracking: this.extractMilestones(repoData)
      },
      
      recommendations: {
        immediate: teamAnalysis.recommendations?.immediate || [],
        longTerm: teamAnalysis.recommendations?.longTerm || [],
        individualGrowth: teamAnalysis.recommendations?.individualGrowth || []
      },
      
      visualizationData: {
        charts: this.prepareChartData(teamAnalysis, repoData),
        heatmaps: this.prepareHeatmapData(repoData),
        timelines: this.prepareTimelineData(repoData)
      }
    };
    
    console.log("✅ Dashboard data generated");
    return dashboard;
  }

  /**
   * Process MBTI distribution data
   */
  processMBTIDistribution(mbtiData) {
    if (!mbtiData) return {};
    
    const distribution = {};
    mbtiData.forEach(member => {
      const type = member.mbtiType;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return {
      types: distribution,
      dominantType: Object.keys(distribution).reduce((a, b) => 
        distribution[a] > distribution[b] ? a : b
      ),
      diversity: Object.keys(distribution).length
    };
  }

  /**
   * Calculate team compatibility
   */
  calculateTeamCompatibility(mbtiData) {
    if (!mbtiData || mbtiData.length < 2) return { score: 0, analysis: "Insufficient data" };
    
    // Simplified compatibility algorithm
    const compatibilityMatrix = {
      'INTJ': ['ENFP', 'ENTP', 'INFJ', 'INFP'],
      'INTP': ['ENFJ', 'ENTJ', 'INFJ', 'INFP'],
      'ENTJ': ['INFP', 'INTP', 'ENFP', 'ENTP'],
      'ENTP': ['INFJ', 'INTJ', 'ENFP', 'ENFJ'],
      // ... can be extended with more types
    };
    
    let compatibilityScore = 0;
    const totalPairs = mbtiData.length * (mbtiData.length - 1) / 2;
    
    for (let i = 0; i < mbtiData.length; i++) {
      for (let j = i + 1; j < mbtiData.length; j++) {
        const type1 = mbtiData[i].mbtiType;
        const type2 = mbtiData[j].mbtiType;
        
        if (compatibilityMatrix[type1]?.includes(type2) || 
            compatibilityMatrix[type2]?.includes(type1)) {
          compatibilityScore++;
        }
      }
    }
    
    return {
      score: Math.round((compatibilityScore / totalPairs) * 100),
      analysis: `${compatibilityScore} out of ${totalPairs} pairs show high compatibility`
    };
  }

  /**
   * Calculate project duration
   */
  calculateProjectDuration(repoData) {
    if (!repoData.commitPatterns?.firstCommit || !repoData.commitPatterns?.lastCommit) {
      return "Unknown";
    }
    
    const start = new Date(repoData.commitPatterns.firstCommit);
    const end = new Date(repoData.commitPatterns.lastCommit);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  }

  /**
   * Calculate communication score
   */
  calculateCommunicationScore(repoData) {
    const issues = repoData.issuesAndPRs?.issues || [];
    const prs = repoData.issuesAndPRs?.pullRequests || [];
    
    const totalDiscussions = issues.length + prs.length;
    const avgCommentsPerIssue = issues.reduce((sum, issue) => 
      sum + (issue.comments || 0), 0) / Math.max(issues.length, 1);
    
    // Simplified communication score algorithm
    const score = Math.min(100, (totalDiscussions * 2) + (avgCommentsPerIssue * 10));
    
    return Math.round(score);
  }

  /**
   * Calculate collaboration index
   */
  calculateCollaborationIndex(repoData) {
    const contributors = repoData.contributors || [];
    const totalCommits = repoData.commitPatterns?.totalCommits || 1;
    
    // Calculate the evenness of contribution distribution
    const contributions = contributors.map(c => c.commits || 0);
    const avgContribution = contributions.reduce((a, b) => a + b, 0) / contributions.length;
    const variance = contributions.reduce((sum, contrib) => 
      sum + Math.pow(contrib - avgContribution, 2), 0) / contributions.length;
    
    // Collaboration index: the more even the contributions, the higher the collaboration index
    const collaborationIndex = Math.max(0, 100 - (variance / avgContribution));
    
    return Math.round(collaborationIndex);
  }

  /**
   * Calculate productivity metrics
   */
  calculateProductivityMetrics(repoData) {
    const commits = repoData.commitPatterns?.totalCommits || 0;
    const duration = this.calculateProjectDuration(repoData);
    const contributors = repoData.contributors?.length || 1;
    
    return {
      commitsPerDay: duration !== "Unknown" ? 
        Math.round(commits / parseInt(duration)) : 0,
      commitsPerContributor: Math.round(commits / contributors),
      codeVelocity: repoData.codeStats?.totalLines || 0,
      issueResolutionRate: this.calculateIssueResolutionRate(repoData)
    };
  }

  /**
   * Calculate issue resolution rate
   */
  calculateIssueResolutionRate(repoData) {
    const issues = repoData.issuesAndPRs?.issues || [];
    if (issues.length === 0) return 0;
    
    const closedIssues = issues.filter(issue => issue.state === 'closed').length;
    return Math.round((closedIssues / issues.length) * 100);
  }

  /**
   * Extract milestones
   */
  extractMilestones(repoData) {
    // This can be adjusted based on actual GitHub data structure to extract milestones
    return repoData.milestones || [];
  }

  /**
   * Prepare chart data
   */
  prepareChartData(teamAnalysis, repoData) {
    return {
      mbtiChart: {
        type: 'pie',
        data: teamAnalysis.teamMBTI?.map(member => ({
          name: member.contributor,
          value: member.mbtiType
        })) || []
      },
      commitTrendChart: {
        type: 'line',
        data: repoData.commitPatterns?.timeline || []
      },
      contributorChart: {
        type: 'bar',
        data: repoData.contributors?.map(c => ({
          name: c.name,
          commits: c.commits,
          additions: c.additions,
          deletions: c.deletions
        })) || []
      }
    };
  }

  /**
   * Prepare heatmap data
   */
  prepareHeatmapData(repoData) {
    return {
      commitHeatmap: repoData.commitPatterns?.heatmap || [],
      collaborationHeatmap: this.generateCollaborationHeatmap(repoData)
    };
  }

  /**
   * Generate collaboration heatmap
   */
  generateCollaborationHeatmap(repoData) {
    const contributors = repoData.contributors || [];
    const matrix = [];
    
    contributors.forEach((contrib1, i) => {
      const row = [];
      contributors.forEach((contrib2, j) => {
        if (i === j) {
          row.push(100); // Self-collaboration is 100%
        } else {
          // Simplified collaboration calculation
          const collaboration = Math.random() * 100; // Should be based on shared file modifications in practice
          row.push(Math.round(collaboration));
        }
      });
      matrix.push(row);
    });
    
    return {
      contributors: contributors.map(c => c.name),
      matrix: matrix
    };
  }

  /**
   * Prepare timeline data
   */
  prepareTimelineData(repoData) {
    return {
      projectTimeline: repoData.commitPatterns?.timeline || [],
      milestoneTimeline: repoData.milestones || []
    };
  }

  /**
   * Save Dashboard to file
   */
  async saveDashboard(dashboard, outputPath = './team-dashboard.json') {
    try {
      await fs.writeFile(outputPath, JSON.stringify(dashboard, null, 2));
      console.log(`📁 Dashboard saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("❌ Error saving dashboard:", error);
      throw error;
    }
  }

  /**
   * Generate HTML Dashboard
   */
  async generateHTMLDashboard(dashboard, outputPath = './team-dashboard.html') {
    const htmlTemplate = this.createHTMLTemplate(dashboard);
    
    try {
      await fs.writeFile(outputPath, htmlTemplate);
      console.log(`🌐 HTML Dashboard saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("❌ Error saving HTML dashboard:", error);
      throw error;
    }
  }

  /**
   * Create HTML template
   */
  createHTMLTemplate(dashboard) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Analysis Dashboard - ${dashboard.metadata.repository}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 15px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart-container { position: relative; height: 300px; margin: 20px 0; }
        .mbti-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .mbti-type { padding: 10px; text-align: center; border-radius: 5px; background: #f0f0f0; }
        .recommendations { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .progress-bar { width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🚀 Team Analysis Dashboard</h1>
            <p>Repository: <strong>${dashboard.metadata.repository}</strong></p>
            <p>Generated: ${new Date(dashboard.metadata.generatedAt).toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 Team Overview</h3>
                <div class="metric">
                    <div class="metric-value">${dashboard.teamOverview.totalMembers}</div>
                    <div class="metric-label">Team Members</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${dashboard.teamOverview.totalCommits}</div>
                    <div class="metric-label">Total Commits</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${dashboard.teamOverview.projectDuration}</div>
                    <div class="metric-label">Project Duration</div>
                </div>
            </div>

            <div class="card">
                <h3>🧠 MBTI Distribution</h3>
                <div class="mbti-grid">
                    ${Object.entries(dashboard.personalityInsights.mbtiDistribution.types || {})
                      .map(([type, count]) => `
                        <div class="mbti-type">
                            <strong>${type}</strong><br>
                            ${count} member${count > 1 ? 's' : ''}
                        </div>
                      `).join('')}
                </div>
                <p><strong>Dominant Type:</strong> ${dashboard.personalityInsights.mbtiDistribution.dominantType || 'N/A'}</p>
                <p><strong>Team Compatibility:</strong> ${dashboard.personalityInsights.teamCompatibility.score || 0}%</p>
            </div>

            <div class="card">
                <h3>🤝 Collaboration Metrics</h3>
                <div class="metric">
                    <div class="metric-value">${dashboard.collaborationMetrics.communicationScore || 0}</div>
                    <div class="metric-label">Communication Score</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${dashboard.collaborationMetrics.collaborationIndex || 0}</div>
                    <div class="metric-label">Collaboration Index</div>
                </div>
            </div>

            <div class="card">
                <h3>⚡ Productivity Metrics</h3>
                <div class="metric">
                    <div class="metric-value">${dashboard.progressAnalytics.productivityMetrics.commitsPerDay || 0}</div>
                    <div class="metric-label">Commits/Day</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${dashboard.progressAnalytics.productivityMetrics.issueResolutionRate || 0}%</div>
                    <div class="metric-label">Issue Resolution Rate</div>
                </div>
            </div>
        </div>

        <div class="card recommendations">
            <h3>💡 Recommendations</h3>
            <h4>Immediate Actions:</h4>
            <ul>
                ${(dashboard.recommendations.immediate || []).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            <h4>Long-term Improvements:</h4>
            <ul>
                ${(dashboard.recommendations.longTerm || []).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>

    <script>
        // Chart.js chart code can be added here
        console.log('Dashboard data:', ${JSON.stringify(dashboard, null, 2)});
    </script>
</body>
</html>`;
  }
}

export default TeamAnalysisAgent;
