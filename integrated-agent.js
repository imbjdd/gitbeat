import { DustAPI } from "@dust-tt/client";
import TeamAnalysisAgent from './team-analysis-agent.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class IntegratedGitBeatAgent {
  constructor(dustConfig, openaiApiKey) {
    // Initialize Dust API
    this.dustAPI = new DustAPI(
      { url: "https://dust.tt" },
      {
        workspaceId: dustConfig.workspaceId || "tKnROPZ670",
        apiKey: dustConfig.apiKey || process.env.DUST_API_KEY,
      },
      console
    );

    // Initialize OpenAI Team Analysis Agent
    this.teamAnalysisAgent = new TeamAnalysisAgent(openaiApiKey || process.env.OPENAI_API_KEY);
    
    this.agentConfigId = dustConfig.agentConfigId || "BoEHsavtwb";
  }

  /**
   * Complete GitBeat analysis workflow
   */
  async analyzeRepository(repoName, options = {}) {
    console.log(`🚀 Starting comprehensive analysis for repository: ${repoName}`);
    
    try {
      // Step 1: Fetch GitHub repository data via Dust API
      console.log("\n📡 Step 1: Fetching repository data via Dust API...");
      const dustAnalysis = await this.fetchRepositoryDataWithDust(repoName);
      
      // Step 2: Parse and structure Dust API response
      console.log("\n🔄 Step 2: Processing Dust API response...");
      const structuredRepoData = await this.parseAndStructureRepoData(dustAnalysis);
      
      // Step 3: Perform deep team analysis with OpenAI GPT
      console.log("\n🧠 Step 3: Performing deep team analysis with OpenAI GPT...");
      const teamAnalysis = await this.teamAnalysisAgent.analyzeTeamFromGitHubData(structuredRepoData);
      
      // Step 4: Generate comprehensive dashboard
      console.log("\n📊 Step 4: Generating comprehensive dashboard...");
      const dashboard = await this.teamAnalysisAgent.generateDashboard(teamAnalysis, structuredRepoData);
      
      // Step 5: Save results
      console.log("\n💾 Step 5: Saving results...");
      await this.saveResults(dashboard, repoName, options);
      
      console.log("\n🎉 Analysis completed successfully!");
      
      return {
        dustAnalysis,
        structuredRepoData,
        teamAnalysis,
        dashboard,
        summary: this.generateAnalysisSummary(dashboard)
      };
      
    } catch (error) {
      console.error("❌ Error in integrated analysis:", error);
      throw error;
    }
  }

  /**
   * Fetch repository data with Dust API
   */
  async fetchRepositoryDataWithDust(repoName) {
    try {
      // Create conversation and get repository analysis
      const conversationResult = await this.dustAPI.createConversation({
        title: `GitBeat Analysis: ${repoName}`,
        visibility: "unlisted",
        skipToolsValidation: true,
        message: {
          content: `Please analyze the GitHub repository: ${repoName}. 
          
          I need comprehensive data including:
          - Repository overview and statistics
          - Contributor information and commit patterns
          - Code statistics and language breakdown
          - Issue and pull request data
          - Project timeline and milestones
          - Team collaboration patterns
          
          Please provide detailed technical analysis that can be used for team assessment.`,
          mentions: [
            {
              configurationId: this.agentConfigId,
            },
          ],
          context: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            username: "gitbeat_analyzer",
            email: "analyzer@gitbeat.com",
            fullName: "GitBeat Analyzer",
            profilePictureUrl: null,
            origin: "api",
          },
        },
      });

      if (conversationResult.isErr()) {
        throw new Error(`Failed to create conversation: ${conversationResult.error.message}`);
      }

      const { conversation, message } = conversationResult.value;
      console.log(`✅ Conversation created: ${conversation.sId}`);

      if (!message) {
        throw new Error("No message was created");
      }

      // Stream agent response
      const agentResponse = await this.streamAgentResponse(conversation.sId, message.sId);
      
      return {
        conversationId: conversation.sId,
        messageId: message.sId,
        conversationUrl: `https://dust.tt/w/${this.dustAPI.config.workspaceId}/assistant/${conversation.sId}`,
        content: agentResponse.content,
        toolsUsed: agentResponse.toolsUsed,
        toolsBreakdown: agentResponse.toolsBreakdown
      };
      
    } catch (error) {
      console.error("❌ Error fetching repository data with Dust:", error);
      throw error;
    }
  }

  /**
   * Stream agent response processing
   */
  async streamAgentResponse(conversationId, userMessageId) {
    const conversation = await this.dustAPI.getConversation({ conversationId });
    if (conversation.isErr()) {
      throw new Error(`Failed to get conversation: ${conversation.error.message}`);
    }

    const streamResult = await this.dustAPI.streamAgentAnswerEvents({
      conversation: conversation.value,
      userMessageId: userMessageId,
    });

    if (streamResult.isErr()) {
      throw new Error(`Failed to start stream: ${streamResult.error.message}`);
    }

    const toolsUsed = [];
    let messageContent = "";
    let isFinished = false;

    console.log("🔄 Streaming agent response...");

    for await (const event of streamResult.value.eventStream) {
      switch (event.type) {
        case "agent_action_success":
          console.log("🔧 Tool used:", event.action.name || event.action.type);
          toolsUsed.push({
            type: event.action.type,
            name: event.action.name || "unknown",
            params: event.action.params || {},
            output: event.action.output || null
          });
          break;
          
        case "generation_tokens":
          if (event.content?.text) {
            messageContent += event.content.text;
          }
          break;
          
        case "agent_message_success":
          console.log("✅ Agent message completed");
          messageContent = event.message.content || "";
          isFinished = true;
          break;
          
        case "agent_error":
          console.error("❌ Agent error:", event.content);
          throw new Error(`Agent error: ${event.content.message}`);
          
        case "agent_generation_cancelled":
          console.log("⏹️ Generation cancelled");
          isFinished = true;
          break;
      }
      
      if (isFinished) break;
    }

    return {
      content: messageContent,
      toolsUsed: toolsUsed,
      toolsBreakdown: toolsUsed.map(tool => ({
        tool: tool.name,
        type: tool.type,
        success: true
      }))
    };
  }

  /**
   * Parse and structure repository data
   */
  async parseAndStructureRepoData(dustAnalysis) {
    console.log("🔍 Parsing Dust API response...");
    
    // Try to extract structured data from Dust API response
    const content = dustAnalysis.content;
    
    // This needs to be adjusted based on actual Dust API response format to parse data
    // Currently using mock data structure, needs to be adjusted based on real response in practice
    const structuredData = {
      name: this.extractRepoName(content),
      description: this.extractDescription(content),
      contributors: this.extractContributors(content, dustAnalysis.toolsUsed),
      commitPatterns: this.extractCommitPatterns(content, dustAnalysis.toolsUsed),
      codeStats: this.extractCodeStats(content, dustAnalysis.toolsUsed),
      issuesAndPRs: this.extractIssuesAndPRs(content, dustAnalysis.toolsUsed),
      milestones: this.extractMilestones(content, dustAnalysis.toolsUsed),
      rawDustResponse: dustAnalysis // Keep original response for debugging
    };
    
    console.log("✅ Repository data structured");
    return structuredData;
  }

  /**
   * Extract repository name from Dust response
   */
  extractRepoName(content) {
    // Simplified extraction logic, needs to be adjusted based on Dust API response format
    const repoMatch = content.match(/repository[:\s]+([^\s\n]+)/i);
    return repoMatch ? repoMatch[1] : "Unknown Repository";
  }

  /**
   * Extract description information
   */
  extractDescription(content) {
    const descMatch = content.match(/description[:\s]+([^\n]+)/i);
    return descMatch ? descMatch[1] : "No description available";
  }

  /**
   * Extract contributor information
   */
  extractContributors(content, toolsUsed) {
    // Mock data, needs to be parsed from Dust API tool output in practice
    const contributors = [];
    
    // Find tool outputs that used GitHub API
    const githubTools = toolsUsed.filter(tool => 
      tool.name?.toLowerCase().includes('github') || 
      tool.type?.toLowerCase().includes('github')
    );
    
    if (githubTools.length > 0) {
      // Parse contributor data from tool output
      githubTools.forEach(tool => {
        if (tool.output && typeof tool.output === 'object') {
          // Try to parse contributor information
          if (tool.output.contributors) {
            contributors.push(...tool.output.contributors);
          }
        }
      });
    }
    
    // If no structured data found, try to parse from text
    if (contributors.length === 0) {
      const contributorMatches = content.match(/contributors?[:\s]+([^\n]+)/gi);
      if (contributorMatches) {
        contributorMatches.forEach(match => {
          const names = match.split(/[,\s]+/).filter(name => 
            name.length > 2 && !['contributors', 'contributor', ':'].includes(name.toLowerCase())
          );
          names.forEach(name => {
            contributors.push({
              name: name,
              commits: Math.floor(Math.random() * 100) + 1, // Mock data
              additions: Math.floor(Math.random() * 1000),
              deletions: Math.floor(Math.random() * 500)
            });
          });
        });
      }
    }
    
    return contributors.length > 0 ? contributors : [
      { name: "Developer 1", commits: 45, additions: 1200, deletions: 300 },
      { name: "Developer 2", commits: 32, additions: 800, deletions: 150 },
      { name: "Developer 3", commits: 28, additions: 600, deletions: 200 }
    ];
  }

  /**
   * Extract commit patterns
   */
  extractCommitPatterns(content, toolsUsed) {
    return {
      totalCommits: this.extractNumber(content, /(\d+)\s*commits?/i) || 105,
      firstCommit: "2024-01-15T10:00:00Z",
      lastCommit: new Date().toISOString(),
      timeline: this.generateMockTimeline(),
      heatmap: this.generateMockHeatmap()
    };
  }

  /**
   * Extract code statistics
   */
  extractCodeStats(content, toolsUsed) {
    return {
      totalLines: this.extractNumber(content, /(\d+)\s*lines?\s*of\s*code/i) || 15420,
      languages: {
        "JavaScript": 45,
        "TypeScript": 30,
        "Python": 15,
        "CSS": 10
      },
      fileCount: this.extractNumber(content, /(\d+)\s*files?/i) || 87
    };
  }

  /**
   * Extract issues and PR data
   */
  extractIssuesAndPRs(content, toolsUsed) {
    return {
      issues: [
        { id: 1, title: "Bug fix needed", state: "open", comments: 3 },
        { id: 2, title: "Feature request", state: "closed", comments: 5 }
      ],
      pullRequests: [
        { id: 1, title: "Add new feature", state: "merged", comments: 8 },
        { id: 2, title: "Fix styling issues", state: "open", comments: 2 }
      ]
    };
  }

  /**
   * Extract milestones
   */
  extractMilestones(content, toolsUsed) {
    return [
      { name: "v1.0 Release", date: "2024-02-01", completed: true },
      { name: "v1.1 Features", date: "2024-03-15", completed: false }
    ];
  }

  /**
   * Extract numbers from text
   */
  extractNumber(text, regex) {
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Generate mock timeline data
   */
  generateMockTimeline() {
    const timeline = [];
    const startDate = new Date('2024-01-01');
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      timeline.push({
        date: date.toISOString().split('T')[0],
        commits: Math.floor(Math.random() * 10) + 1
      });
    }
    
    return timeline;
  }

  /**
   * Generate mock heatmap data
   */
  generateMockHeatmap() {
    const heatmap = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({length: 24}, (_, i) => i);
    
    days.forEach(day => {
      hours.forEach(hour => {
        heatmap.push({
          day,
          hour,
          commits: Math.floor(Math.random() * 5)
        });
      });
    });
    
    return heatmap;
  }

  /**
   * Save analysis results
   */
  async saveResults(dashboard, repoName, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `${repoName.replace('/', '_')}_${timestamp}`;
    
    // Save JSON format dashboard
    if (options.saveJson !== false) {
      const jsonPath = `./results/${baseFileName}_dashboard.json`;
      await this.teamAnalysisAgent.saveDashboard(dashboard, jsonPath);
    }
    
    // Save HTML format dashboard
    if (options.saveHtml !== false) {
      const htmlPath = `./results/${baseFileName}_dashboard.html`;
      await this.teamAnalysisAgent.generateHTMLDashboard(dashboard, htmlPath);
    }
    
    console.log(`📁 Results saved with base name: ${baseFileName}`);
  }

  /**
   * Generate analysis summary
   */
  generateAnalysisSummary(dashboard) {
    return {
      repository: dashboard.metadata.repository,
      teamSize: dashboard.teamOverview.totalMembers,
      projectDuration: dashboard.teamOverview.projectDuration,
      totalCommits: dashboard.teamOverview.totalCommits,
      dominantMBTI: dashboard.personalityInsights.mbtiDistribution.dominantType,
      teamCompatibility: dashboard.personalityInsights.teamCompatibility.score,
      communicationScore: dashboard.collaborationMetrics.communicationScore,
      collaborationIndex: dashboard.collaborationMetrics.collaborationIndex,
      topRecommendations: dashboard.recommendations.immediate.slice(0, 3)
    };
  }
}

// Usage example and main function
async function runGitBeatAnalysis() {
  try {
    // Configuration
    const dustConfig = {
      workspaceId: "tKnROPZ670",
      apiKey: process.env.DUST_API_KEY || "sk-1e8feb8f63e368ddc080b4fafd422e0a",
      agentConfigId: "BoEHsavtwb"
    };
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error("❌ OPENAI_API_KEY environment variable is required");
      process.exit(1);
    }
    
    // Create integrated agent
    const integratedAgent = new IntegratedGitBeatAgent(dustConfig, openaiApiKey);
    
    // Analyze repository
    const repoName = "juSt-jeLLy/Clash-of-Clout"; // Can be passed via command line arguments
    const results = await integratedAgent.analyzeRepository(repoName, {
      saveJson: true,
      saveHtml: true
    });
    
    // Output summary
    console.log("\n📋 Analysis Summary:");
    console.log("==================");
    console.log(`Repository: ${results.summary.repository}`);
    console.log(`Team Size: ${results.summary.teamSize} members`);
    console.log(`Project Duration: ${results.summary.projectDuration}`);
    console.log(`Total Commits: ${results.summary.totalCommits}`);
    console.log(`Dominant MBTI: ${results.summary.dominantMBTI}`);
    console.log(`Team Compatibility: ${results.summary.teamCompatibility}%`);
    console.log(`Communication Score: ${results.summary.communicationScore}/100`);
    console.log(`Collaboration Index: ${results.summary.collaborationIndex}/100`);
    
    console.log("\n🎯 Top Recommendations:");
    results.summary.topRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    return results;
    
  } catch (error) {
    console.error("💥 Analysis failed:", error.message);
    process.exit(1);
  }
}

// If running this file directly, execute analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  runGitBeatAnalysis();
}

export { IntegratedGitBeatAgent, runGitBeatAnalysis };
