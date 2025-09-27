"""Configuration management for GitBeat MCP Server"""

import os
from typing import List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class MCPServerConfig(BaseModel):
    """Configuration for GitBeat MCP Server"""
    
    # ElevenLabs Configuration (optional - users can provide their own)
    elevenlabs_api_key: str = Field(
        default_factory=lambda: os.getenv("ELEVENLABS_API_KEY", ""),
        description="Default ElevenLabs API key (optional)"
    )
    elevenlabs_base_url: str = Field(
        default="https://api.elevenlabs.io",
        description="ElevenLabs API base URL"
    )
    
    # MCP Server Configuration
    server_name: str = Field(
        default_factory=lambda: os.getenv("MCP_SERVER_NAME", "gitbeat-music-generator"),
        description="MCP server name"
    )
    server_version: str = Field(
        default_factory=lambda: os.getenv("MCP_SERVER_VERSION", "0.1.0"),
        description="MCP server version"
    )
    
    # No authentication required - users provide their own ElevenLabs API keys
    
    # Music Generation Settings
    default_duration: int = Field(default=10, description="Default music duration in seconds")
    max_duration: int = Field(default=30, description="Maximum music duration in seconds")
    default_prompt_influence: float = Field(default=0.3, description="Default prompt influence")
    
    # Server Settings
    debug: bool = Field(
        default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true",
        description="Debug mode"
    )
    log_level: str = Field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"),
        description="Logging level"
    )
    
    def model_post_init(self, __context) -> None:
        """Validate configuration after initialization"""
        # No validation needed - users provide their own ElevenLabs API keys
        pass


# Global configuration instance
config = MCPServerConfig()
