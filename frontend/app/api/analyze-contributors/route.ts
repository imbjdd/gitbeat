import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const analysisTone = data.analysisTone || 'fun';
    
    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare different prompts based on analysis tone
    const funPrompt = `You are a brutally honest and hilarious GitHub repository analyst. Your job is to roast developers based on their commit patterns while being entertaining. You must respond with ONLY valid JSON, no additional text or formatting.`;
    
    const seriousPrompt = `You are a professional software development analyst. Your job is to provide insightful, data-driven analysis of developer contributions and team dynamics. Focus on productivity patterns, collaboration effectiveness, and project health indicators. You must respond with ONLY valid JSON, no additional text or formatting.`;

    const prompt = analysisTone === 'fun' ? funPrompt : seriousPrompt;

    const repositoryInfo = `
Repository: ${data.repository.name}
Description: ${data.repository.description || 'No description'}
Language: ${data.repository.language || 'Unknown'}
Stars: ${data.repository.stars} | Forks: ${data.repository.forks}

Contributors to Analyze:
${data.contributors.map((contributor: { username: string; commits: number; percentage: number; additions: number; deletions: number; workPattern: string }, index: number) => `
${index + 1}. ${contributor.username}: ${contributor.commits} commits (${contributor.percentage}%), +${contributor.additions}/-${contributor.deletions} lines, ${contributor.workPattern}
`).join('')}

Activity: ${data.activityTimeline.length} weeks of data available`;

    const funInstructions = `
Be SAVAGE but funny. Call out slackers, praise workhorses, and make hilarious observations about coding patterns. Use developer humor, memes, and brutal honesty. If someone has very few commits, ROAST them. If someone dominates, call them out as the team's caffeine-powered overlord.

Respond with this exact JSON structure (no markdown, no extra text):
{
  "teamDynamics": "Brutally honest and funny analysis of how this team actually works together (or doesn't)",
  "projectHealth": "Savage but accurate assessment of whether this project is thriving or dying",
  "contributorPersonalities": [
    {
      "workingStyle": "Hilarious description of how they actually work",
      "personality": "Brutally honest personality roast based on their commit patterns",
      "strengths": ["funny strength 1", "sarcastic strength 2", "backhanded compliment 3"],
      "collaborationStyle": "How they collaborate (or avoid collaboration)",
      "workPattern": "${data.contributors[0]?.workPattern || 'Regular contributor'}"
    }
  ]
}`;

    const seriousInstructions = `
Provide a professional, data-driven analysis focusing on:
- Team collaboration patterns and effectiveness
- Individual contribution styles and productivity indicators
- Project health based on commit patterns and activity
- Technical leadership and mentorship indicators
- Code quality and maintenance patterns

Respond with this exact JSON structure (no markdown, no extra text):
{
  "teamDynamics": "Professional analysis of team collaboration patterns, communication effectiveness, and workflow dynamics",
  "projectHealth": "Data-driven assessment of project sustainability, maintenance quality, and development velocity",
  "contributorPersonalities": [
    {
      "workingStyle": "Professional description of their development approach and methodology",
      "personality": "Analytical assessment of their contribution patterns and technical leadership style",
      "strengths": ["technical strength 1", "collaboration strength 2", "productivity strength 3"],
      "collaborationStyle": "How they contribute to team success and knowledge sharing",
      "workPattern": "${data.contributors[0]?.workPattern || 'Regular contributor'}"
    }
  ]
}`;

    const fullPrompt = prompt + repositoryInfo + (analysisTone === 'fun' ? funInstructions : seriousInstructions);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: analysisTone === 'fun' 
              ? 'You are a savage, hilarious developer roast master. Think of yourself as the Gordon Ramsay of code reviews. Be brutally honest, funny, and entertaining while analyzing developers. You must respond with ONLY valid JSON that can be parsed with JSON.parse(). Do not use markdown code blocks, backticks, or any formatting. Start directly with { and end with }.'
              : 'You are a professional software development analyst with expertise in team dynamics and productivity assessment. Provide insightful, data-driven analysis based on contribution patterns. You must respond with ONLY valid JSON that can be parsed with JSON.parse(). Do not use markdown code blocks, backticks, or any formatting. Start directly with { and end with }.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to analyze with OpenAI' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    let analysisText = openaiData.choices[0].message.content;

    // Clean up the response text
    analysisText = analysisText.trim();
    
    // Remove markdown code blocks if present
    if (analysisText.startsWith('```json')) {
      analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (analysisText.startsWith('```')) {
      analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      // Parse the JSON response from OpenAI
      const analysis = JSON.parse(analysisText);
      
      // Validate required fields
      if (!analysis.teamDynamics || !analysis.projectHealth || !analysis.contributorPersonalities) {
        throw new Error('Missing required fields in AI response');
      }
      
      // Ensure the contributor personalities have the correct user data and proper structure
      if (analysis.contributorPersonalities && Array.isArray(analysis.contributorPersonalities)) {
        analysis.contributorPersonalities = analysis.contributorPersonalities.map((personality: { workingStyle?: string; personality?: string; strengths?: string[]; collaborationStyle?: string; workPattern?: string }, index: number) => {
          const contributor = data.contributors[index];
          if (contributor) {
            return {
              user: {
                login: contributor.username,
                avatar_url: `https://github.com/${contributor.username}.png`,
                html_url: `https://github.com/${contributor.username}`
              },
              workingStyle: personality.workingStyle || "Active contributor",
              personality: personality.personality || "Dedicated team member",
              strengths: Array.isArray(personality.strengths) ? personality.strengths : ["Team collaboration"],
              collaborationStyle: personality.collaborationStyle || "Team contributor",
              workPattern: personality.workPattern || contributor.workPattern
            };
          }
          return personality;
        }).filter(Boolean); // Remove any null/undefined entries
      }

      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response length:', analysisText.length);
      console.error('Raw response preview:', analysisText.substring(0, 200));
      console.error('Response starts with:', analysisText.substring(0, 10));
      console.error('Response ends with:', analysisText.substring(-10));
      
      // Return a structured fallback response based on analysis tone
      const generateAnalysis = (contributor: { username: string; commits: number; percentage: number; additions: number; deletions: number; workPattern: string }) => {
        if (analysisTone === 'serious') {
          if (contributor.percentage > 50) {
            return {
              workingStyle: "Primary maintainer and technical lead",
              personality: `${contributor.username} demonstrates strong ownership and consistent contribution patterns with ${contributor.commits} commits, indicating high engagement and project leadership.`,
              strengths: ["Technical leadership", "Consistent delivery", "Project ownership"],
              collaborationStyle: "Lead contributor and mentor"
            };
          } else if (contributor.percentage > 20) {
            return {
              workingStyle: "Regular contributor with steady productivity",
              personality: `${contributor.username} shows reliable contribution patterns with ${contributor.commits} commits, demonstrating consistent engagement and team collaboration.`,
              strengths: ["Reliable delivery", "Team collaboration", "Consistent productivity"],
              collaborationStyle: "Collaborative team member"
            };
          } else {
            return {
              workingStyle: "Specialized or part-time contributor",
              personality: `${contributor.username} contributes ${contributor.commits} commits in a focused manner, potentially indicating specialized expertise or part-time involvement.`,
              strengths: ["Focused contributions", "Specialized expertise", "Quality over quantity"],
              collaborationStyle: "Targeted contributor"
            };
          }
        } else {
          // Fun analysis
          if (contributor.percentage > 50) {
            return {
              workingStyle: "The coding overlord who probably dreams in semicolons",
              personality: `${contributor.username} is clearly the team's caffeine-powered code machine. With ${contributor.commits} commits, they've basically adopted this repo as their firstborn child.`,
              strengths: ["Commit addiction", "Code ownership issues", "Probably needs a vacation"],
              collaborationStyle: "Benevolent dictator of the codebase"
            };
          } else if (contributor.percentage > 20) {
            return {
              workingStyle: "Solid contributor who actually shows up to work",
              personality: `${contributor.username} is that reliable team member who gets stuff done without drama. ${contributor.commits} commits of pure, unfiltered competence.`,
              strengths: ["Actually productive", "Doesn't break everything", "Team player vibes"],
              collaborationStyle: "The backbone of the team"
            };
          } else {
            return {
              workingStyle: "Occasional visitor to the land of productivity",
              personality: `${contributor.username} has mastered the art of minimal effort maximum impact. Or they're just really good at avoiding work. ${contributor.commits} commits? That's cute.`,
              strengths: ["Selective participation", "Conservation of energy", "Mystery contributor"],
              collaborationStyle: "Ghosts the team but somehow still gets credit"
            };
          }
        }
      };

      return NextResponse.json({
        teamDynamics: analysisTone === 'serious' 
          ? "The team demonstrates varied contribution patterns with clear leadership roles and collaborative dynamics. Analysis shows structured development workflow with consistent engagement from core contributors."
          : "This team has more drama than a reality TV show, but somehow the code still gets written. The commit history reads like a soap opera of productivity and procrastination.",
        projectHealth: analysisTone === 'serious'
          ? "Project shows healthy development velocity with sustainable contribution patterns. The codebase appears well-maintained with active contributor engagement and consistent delivery cycles."
          : "The project is alive and kicking, mostly because someone is doing all the work while others are probably on coffee breaks. Classic software development dynamics.",
        contributorPersonalities: data.contributors.slice(0, 3).map((contributor: { username: string; commits: number; percentage: number; additions: number; deletions: number; workPattern: string }) => ({
          user: {
            login: contributor.username,
            avatar_url: `https://github.com/${contributor.username}.png`,
            html_url: `https://github.com/${contributor.username}`
          },
          ...generateAnalysis(contributor),
          workPattern: contributor.workPattern
        }))
      });
    }

  } catch (error) {
    console.error('Error in analyze-contributors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
