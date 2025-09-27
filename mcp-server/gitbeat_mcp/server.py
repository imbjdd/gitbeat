"""GitBeat MCP Server - Main server implementation"""

import asyncio
import logging
from typing import Any, Sequence

from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    Tool,
)

from .config import config
from .elevenlabs_service import ElevenLabsService
from .tools import (
    get_tool_definitions,
    format_audio_response,
    format_connection_test_response,
    format_models_response,
    format_examples_response,
)

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create MCP server instance
server = Server(config.server_name)


def validate_api_key(api_key: str) -> bool:
    """Validate API key for authentication"""
    return config.validate_api_key(api_key)


@server.list_tools()
async def list_tools() -> ListToolsResult:
    """List all available tools"""
    tools = get_tool_definitions()
    logger.info(f"Listing {len(tools)} available tools")
    return ListToolsResult(tools=tools)


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any] | None) -> CallToolResult:
    """Handle tool calls"""
    if arguments is None:
        arguments = {}
    
    logger.info(f"Tool call: {name} with arguments: {list(arguments.keys())}")
    
    # No MCP API key validation needed - users provide their own ElevenLabs key
    
    try:
        # Get ElevenLabs API key from arguments
        elevenlabs_api_key = arguments.get("elevenlabs_api_key", "")
        
        # Initialize ElevenLabs service with user-provided API key
        elevenlabs_service = ElevenLabsService(api_key=elevenlabs_api_key)
        
        if name == "generate_music":
            return await handle_generate_music(elevenlabs_service, arguments)
        elif name == "generate_sound_effect":
            return await handle_generate_sound_effect(elevenlabs_service, arguments)
        elif name == "test_elevenlabs_connection":
            return await handle_test_connection(elevenlabs_service, arguments)
        elif name == "get_available_models":
            return await handle_get_models(elevenlabs_service, arguments)
        elif name == "get_music_examples":
            return await handle_get_examples(arguments)
        else:
            logger.error(f"Unknown tool: {name}")
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"❌ Unknown tool: {name}"
                    )
                ]
            )
    
    except Exception as e:
        logger.error(f"Error in tool {name}: {e}", exc_info=True)
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=f"❌ Error executing tool {name}: {str(e)}"
                )
            ]
        )


async def handle_generate_music(service: ElevenLabsService, arguments: dict) -> CallToolResult:
    """Handle music generation tool call"""
    prompt = arguments.get("prompt", "")
    duration_seconds = arguments.get("duration_seconds", config.default_duration)
    prompt_influence = arguments.get("prompt_influence", config.default_prompt_influence)
    
    if not prompt:
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text="❌ Error: 'prompt' parameter is required for music generation"
                )
            ]
        )
    
    logger.info(f"Generating music with prompt: '{prompt}'")
    result = await service.generate_music(prompt, duration_seconds, prompt_influence)
    
    return CallToolResult(content=format_audio_response(result))


async def handle_generate_sound_effect(service: ElevenLabsService, arguments: dict) -> CallToolResult:
    """Handle sound effect generation tool call"""
    prompt = arguments.get("prompt", "")
    duration_seconds = arguments.get("duration_seconds", 5)
    
    if not prompt:
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text="❌ Error: 'prompt' parameter is required for sound effect generation"
                )
            ]
        )
    
    logger.info(f"Generating sound effect with prompt: '{prompt}'")
    result = await service.generate_sound_effect(prompt, duration_seconds)
    
    return CallToolResult(content=format_audio_response(result))


async def handle_test_connection(service: ElevenLabsService, arguments: dict) -> CallToolResult:
    """Handle connection test tool call"""
    logger.info("Testing ElevenLabs API connection")
    result = await service.test_connection()
    
    return CallToolResult(content=format_connection_test_response(result))


async def handle_get_models(service: ElevenLabsService, arguments: dict) -> CallToolResult:
    """Handle get models tool call"""
    logger.info("Getting available ElevenLabs models")
    result = await service.get_available_models()
    
    return CallToolResult(content=format_models_response(result))


async def handle_get_examples(arguments: dict) -> CallToolResult:
    """Handle get examples tool call"""
    logger.info("Getting example prompts")
    
    return CallToolResult(content=format_examples_response())


async def main():
    """Main server entry point"""
    logger.info(f"Starting GitBeat MCP Server v{config.server_version}")
    logger.info(f"Server name: {config.server_name}")
    logger.info(f"Debug mode: {config.debug}")
    
    # Validate configuration
    try:
        if not config.elevenlabs_api_key:
            raise ValueError("ElevenLabs API key is required")
        
        if not config.valid_api_keys and not config.master_api_key:
            raise ValueError("At least one valid API key must be configured")
        
        logger.info("✅ Configuration validated successfully")
        
    except Exception as e:
        logger.error(f"❌ Configuration error: {e}")
        return
    
    # Test ElevenLabs connection on startup
    try:
        service = ElevenLabsService()
        connection_result = await service.test_connection()
        
        if connection_result.get("success"):
            logger.info("✅ ElevenLabs API connection test successful")
        else:
            logger.warning(f"⚠️ ElevenLabs API connection test failed: {connection_result.get('message')}")
            
    except Exception as e:
        logger.error(f"❌ Failed to test ElevenLabs connection: {e}")
    
    # Start the MCP server
    logger.info("🚀 Starting MCP server...")
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name=config.server_name,
                server_version=config.server_version,
            ),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
