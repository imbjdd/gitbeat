import { DustAPI } from "@dust-tt/client";

async function streamAgentResponse(dustAPI, conversationId, userMessageId) {
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

  const toolsUsed = [];
  let messageContent = "";
  let isFinished = false;

  console.log("🔄 Streaming agent response...");

  for await (const event of streamResult.value.eventStream) {
    console.log(`📡 Event type: ${event.type}`);
    
    switch (event.type) {
      case "agent_action_success":
        console.log("🔧 Tool used:", event.action);
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

async function createConversationExample() {
  // Initialize the Dust API client
  const dustAPI = new DustAPI(
    { url: "https://dust.tt" },
    {
      workspaceId: "tKnROPZ670", // Replace with your workspace ID
      apiKey: "sk-1e8feb8f63e368ddc080b4fafd422e0a", // Replace with your API key
    },
    console
  );

  try {
    // First, get available agents to mention
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

    // Use the first active agent
    const selectedAgent = activeAgents[0];
    console.log(`Using agent: ${selectedAgent.name} (${selectedAgent.sId})`);

    // Create a conversation with a message
    const conversationResult = await dustAPI.createConversation({
      title: "My API Test Conversation",
      visibility: "unlisted", // or "workspace"
      skipToolsValidation: true,
      message: {
        content: `juSt-jeLLy/Clash-of-Clout`,
        mentions: [
          {
            configurationId: "BoEHsavtwb", // selectedAgent.sId,
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

    const { conversation, message } = conversationResult.value;
    console.log(`✅ Conversation created: ${conversation.sId}`);
    console.log(`📝 Message created: ${message?.sId}`);

    if (!message) {
      throw new Error("No message was created");
    }

    // Show conversation URL for manual checking
    console.log(`🔗 View conversation at: https://dust.tt/w/tKnROPZ670/assistant/${conversation.sId}`);

    // Stream the agent's response and get tools breakdown
    console.log("⏳ Streaming agent response...");
    const agentResponse = await streamAgentResponse(dustAPI, conversation.sId, message.sId);
    
    console.log("\n🛠️ Tools breakdown:");
    console.log("📊 Tools used during generation:");
    agentResponse.toolsBreakdown.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.tool} (${tool.type}) - ${tool.success ? '✅ Success' : '❌ Failed'}`);
    });
    
    if (agentResponse.toolsBreakdown.length === 0) {
      console.log("  No tools were used during this generation.");
    }

    return {
      conversationId: conversation.sId,
      messageId: message.sId,
      conversationUrl: `https://dust.tt/w/tKnROPZ670/assistant/${conversation.sId}`,
      content: agentResponse.content,
      toolsBreakdown: agentResponse.toolsBreakdown,
      toolsUsed: agentResponse.toolsUsed,
    };
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Run the example
createConversationExample()
  .then((result) => {
    console.log("\n🎉 Conversation created successfully!");
    console.log(`Conversation ID: ${result?.conversationId}`);
    console.log(`\n📝 Agent Response:\n${result?.content || "No content received"}`);
    console.log(`\n🔧 Total tools used: ${result?.toolsBreakdown?.length || 0}`);
    if (result?.toolsBreakdown?.length > 0) {
      console.log("📋 Tools summary:", result.toolsBreakdown.map(t => t.tool).join(", "));
    }
  })
  .catch((error) => {
    console.error("💥 Script failed:", error.message);
    process.exit(1);
  });

export { createConversationExample };
