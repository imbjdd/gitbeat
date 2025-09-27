import { NextRequest, NextResponse } from 'next/server';
import { DustAPI } from "@dust-tt/client";

interface ToolUsed {
  type: string;
  name: string;
  params: any;
  output: any;
}

interface AgentResponse {
  content: string;
  toolsUsed: ToolUsed[];
  toolsBreakdown: Array<{
    tool: string;
    type: string;
    success: boolean;
  }>;
}

async function streamAgentResponse(dustAPI: DustAPI, conversationId: string, userMessageId: string): Promise<AgentResponse> {
  const conversation = await dustAPI.getConversation({ conversationId });
  if (conversation.isErr()) {
    throw new Error(`Failed to get conversation: ${conversation.error.message}`);
  }

  const streamResult = await dustAPI.streamAgentAnswerEvents({
    conversation: conversation.value,
    userMessageId: userMessageId,
  });

  if (streamResult.isErr()) {
    throw new Error(`Failed to start stream: ${streamResult.error.message}`);
  }

  const toolsUsed: ToolUsed[] = [];
  let messageContent = "";
  let isFinished = false;

  console.log("🔄 Starting to stream agent response...");

  for await (const event of streamResult.value.eventStream) {
    console.log(`📡 Event type: ${event.type}`, event);
    switch (event.type) {
      case "agent_action_success":
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
        messageContent = event.message.content || "";
        isFinished = true;
        break;
        
      case "agent_error":
        throw new Error(`Agent error: ${event.content.message}`);
        
      case "agent_generation_cancelled":
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

export async function POST(request: NextRequest) {
  try {
    const { message, mentions, github_repo } = await request.json();

    console.log("📥 Received request:", { message, github_repo, mentions });

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!github_repo) {
      return NextResponse.json({ error: 'GitHub repository is required' }, { status: 400 });
    }

    const dustAPI = new DustAPI(
      { url: "https://dust.tt" },
      {
        workspaceId: process.env.DUST_WORKSPACE_ID || "tKnROPZ670",
        apiKey: process.env.DUST_API_KEY || "sk-1e8feb8f63e368ddc080b4fafd422e0a",
      },
      console
    );

    // Get available agents
    const agentsResult = await dustAPI.getAgentConfigurations({});
    if (agentsResult.isErr()) {
      throw new Error(`Failed to get agents: ${agentsResult.error.message}`);
    }

    const activeAgents = agentsResult.value.filter(
      (agent) => agent.status === "active"
    );
    if (activeAgents.length === 0) {
      throw new Error("No active agents found");
    }

    // Use the first active agent or specified mentions
    const selectedAgent = activeAgents[0];

    // Create a conversation with a message
    const conversationResult = await dustAPI.createConversation({
      title: "GitHub Repository Analysis",
      visibility: "unlisted",
      skipToolsValidation: true,
      message: {
        content: `${message} - Repository: ${github_repo}`,
        mentions: mentions || [
          {
            configurationId: "BoEHsavtwb",
          },
        ],
        context: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          username: "api_user",
          email: "user@example.com",
          fullName: "API User",
          profilePictureUrl: null,
          origin: "api",
        },
      },
    });

    if (conversationResult.isErr()) {
      throw new Error(
        `Failed to create conversation: ${conversationResult.error.message}`
      );
    }

    const { conversation, message: createdMessage } = conversationResult.value;

    if (!createdMessage) {
      throw new Error("No message was created");
    }

    // Stream the agent's response
    const agentResponse = await streamAgentResponse(dustAPI, conversation.sId, createdMessage.sId);

    return NextResponse.json({
      conversationId: conversation.sId,
      messageId: createdMessage.sId,
      conversationUrl: `https://dust.tt/w/${process.env.DUST_WORKSPACE_ID || "tKnROPZ670"}/assistant/${conversation.sId}`,
      content: agentResponse.content,
      toolsBreakdown: agentResponse.toolsBreakdown,
      toolsUsed: agentResponse.toolsUsed,
    });

  } catch (error: any) {
    console.error("Error in Dust API:", error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}