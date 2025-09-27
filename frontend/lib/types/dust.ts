export interface ToolUsed {
  type: string;
  name: string;
  params: any;
  output: any;
}

export interface ToolBreakdown {
  tool: string;
  type: string;
  success: boolean;
}

export interface AgentResponse {
  content: string;
  toolsUsed: ToolUsed[];
  toolsBreakdown: ToolBreakdown[];
}

export interface ConversationResponse {
  conversationId: string;
  messageId: string;
  conversationUrl: string;
  content: string;
  toolsBreakdown: ToolBreakdown[];
  toolsUsed: ToolUsed[];
}

export interface CreateConversationRequest {
  message: string;
  github_repo: string;
  mentions?: Array<{
    configurationId: string;
  }>;
}

export interface DustAPIError {
  error: string;
}