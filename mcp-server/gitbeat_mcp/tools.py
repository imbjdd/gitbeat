"""MCP tool definitions for GitBeat music generation - Simplified (no MCP API key required)"""

from typing import Any, Dict, List
from mcp.types import Tool, TextContent
import json


def get_tool_definitions() -> List[Tool]:
    """Get all available MCP tools"""
    return [
        Tool(
            name="generate_music",
            description="Generate music from a text prompt using ElevenLabs AI",
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Text description of the music to generate (e.g., 'A cheerful upbeat electronic dance music track')",
                        "minLength": 1,
                        "maxLength": 1000
                    },
                    "duration_seconds": {
                        "type": "integer",
                        "description": "Duration of the music in seconds (1-30)",
                        "minimum": 1,
                        "maximum": 30,
                        "default": 10
                    },
                    "prompt_influence": {
                        "type": "number",
                        "description": "How much the prompt influences the generation (0.0-1.0)",
                        "minimum": 0.0,
                        "maximum": 1.0,
                        "default": 0.3
                    },
                    "elevenlabs_api_key": {
                        "type": "string",
                        "description": "Your ElevenLabs API key (get from elevenlabs.io)",
                        "minLength": 1
                    }
                },
                "required": ["prompt", "elevenlabs_api_key"]
            }
        ),
        
        Tool(
            name="generate_sound_effect",
            description="Generate sound effects from a text prompt using ElevenLabs AI",
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Text description of the sound effect to generate (e.g., 'Gentle rain falling on leaves')",
                        "minLength": 1,
                        "maxLength": 500
                    },
                    "duration_seconds": {
                        "type": "integer",
                        "description": "Duration of the sound effect in seconds (1-15)",
                        "minimum": 1,
                        "maximum": 15,
                        "default": 5
                    },
                    "elevenlabs_api_key": {
                        "type": "string",
                        "description": "Your ElevenLabs API key (get from elevenlabs.io)",
                        "minLength": 1
                    }
                },
                "required": ["prompt", "elevenlabs_api_key"]
            }
        ),
        
        Tool(
            name="test_elevenlabs_connection",
            description="Test connection to ElevenLabs API and verify service availability",
            inputSchema={
                "type": "object",
                "properties": {
                    "elevenlabs_api_key": {
                        "type": "string",
                        "description": "Your ElevenLabs API key (get from elevenlabs.io)",
                        "minLength": 1
                    }
                },
                "required": ["elevenlabs_api_key"]
            }
        ),
        
        Tool(
            name="get_available_models",
            description="Get list of available ElevenLabs models for music generation",
            inputSchema={
                "type": "object",
                "properties": {
                    "elevenlabs_api_key": {
                        "type": "string",
                        "description": "Your ElevenLabs API key (get from elevenlabs.io)",
                        "minLength": 1
                    }
                },
                "required": ["elevenlabs_api_key"]
            }
        ),
        
        Tool(
            name="get_music_examples",
            description="Get example prompts for music and sound effect generation (no API key required)",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        )
    ]


def get_example_prompts() -> Dict[str, List[str]]:
    """Get example prompts for music generation"""
    return {
        "music_examples": [
            "A cheerful upbeat electronic dance music track with synthesizers",
            "Relaxing ambient music with soft piano and nature sounds",
            "Energetic rock guitar riff with drums",
            "Classical orchestral piece with strings and woodwinds",
            "Jazz saxophone melody with walking bass line",
            "Lo-fi hip hop beat with vinyl crackle",
            "Cinematic epic orchestral music with brass and timpani",
            "Acoustic folk guitar with harmonica",
            "Synthwave retro 80s electronic music",
            "Peaceful meditation music with Tibetan bowls"
        ],
        "sound_effect_examples": [
            "Gentle rain falling on leaves",
            "Ocean waves crashing on the shore",
            "Birds chirping in a forest",
            "Crackling campfire",
            "Thunder and lightning storm",
            "City traffic and car horns",
            "Footsteps on gravel",
            "Wind blowing through trees",
            "Coffee shop ambient noise",
            "Mechanical keyboard typing sounds"
        ]
    }


def format_audio_response(result: Dict[str, Any]) -> List[TextContent]:
    """Format audio generation response for MCP"""
    if result.get("success"):
        # Create a response with both metadata and base64 audio data
        response_data = {
            "success": True,
            "filename": result.get("filename"),
            "file_size": result.get("file_size"),
            "duration_seconds": result.get("duration_seconds"),
            "prompt": result.get("prompt"),
            "mime_type": result.get("mime_type", "audio/mpeg"),
            "audio_base64": result.get("audio_base64")
        }
        
        response_text = f"✅ Music generated successfully!\n\n"
        response_text += f"**🎵 Audio:** {result.get('filename')}\n"
        response_text += f"**⏱️ Duration:** {result.get('duration_seconds')} seconds\n"
        response_text += f"**📝 Prompt:** {result.get('prompt')}\n"
        response_text += f"**📊 File Size:** {result.get('file_size')} bytes\n"
        response_text += f"**🎵 Type:** {result.get('mime_type')}\n"
        
        response_text += f"\n**🎵 Audio Data (Base64):**\n"
        response_text += f"```\n{result.get('audio_base64')}\n```\n\n"
        response_text += f"**💡 Usage:**\n"
        response_text += f"1. Copy the base64 data above\n"
        response_text += f"2. Decode it to get the MP3 file\n"
        response_text += f"3. Save as `{result.get('filename')}`"
        
        return [
            TextContent(
                type="text",
                text=response_text
            )
        ]


async def handle_tool_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle tool calls for direct MCP JSON-RPC endpoint"""
    try:
        if tool_name == "generate_music":
            from .elevenlabs_service import ElevenLabsService
            
            api_key = arguments.get("elevenlabs_api_key")
            if not api_key:
                return {"error": "ElevenLabs API key is required"}
            
            service = ElevenLabsService(api_key=api_key)
            result = await service.generate_music(
                prompt=arguments.get("prompt"),
                duration_seconds=arguments.get("duration_seconds"),
                prompt_influence=arguments.get("prompt_influence")
            )
            
            return {"content": format_audio_response(result)}
            
        elif tool_name == "generate_sound_effect":
            from .elevenlabs_service import ElevenLabsService
            
            api_key = arguments.get("elevenlabs_api_key")
            if not api_key:
                return {"error": "ElevenLabs API key is required"}
            
            service = ElevenLabsService(api_key=api_key)
            result = await service.generate_sound_effect(
                prompt=arguments.get("prompt"),
                duration_seconds=arguments.get("duration_seconds")
            )
            
            return {"content": format_audio_response(result)}
            
        elif tool_name == "test_elevenlabs_connection":
            from .elevenlabs_service import ElevenLabsService
            
            api_key = arguments.get("elevenlabs_api_key")
            if not api_key:
                return {"error": "ElevenLabs API key is required"}
            
            service = ElevenLabsService(api_key=api_key)
            result = await service.test_connection()
            
            return {"content": format_connection_test_response(result)}
            
        elif tool_name == "get_available_models":
            from .elevenlabs_service import ElevenLabsService
            
            api_key = arguments.get("elevenlabs_api_key")
            if not api_key:
                return {"error": "ElevenLabs API key is required"}
            
            service = ElevenLabsService(api_key=api_key)
            result = await service.get_available_models()
            
            return {"content": format_models_response(result)}
            
        elif tool_name == "get_music_examples":
            result = {"success": True, "examples": "Music generation examples"}
            return {"content": format_examples_response(result)}
            
        else:
            return {"error": f"Unknown tool: {tool_name}"}
            
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}


def format_connection_test_response(result: Dict[str, Any]) -> List[TextContent]:
    """Format connection test response for MCP"""
    if result.get("success"):
        return [
            TextContent(
                type="text",
                text="✅ ElevenLabs API connection successful! The service is available and ready to generate music."
            )
        ]
    else:
        return [
            TextContent(
                type="text",
                text=f"❌ ElevenLabs API connection failed: {result.get('message', 'Unknown error')}"
            )
        ]


def format_models_response(result: Dict[str, Any]) -> List[TextContent]:
    """Format models list response for MCP"""
    if result.get("success"):
        models = result.get("models", [])
        if models:
            models_text = "🎵 **Available ElevenLabs Models:**\n\n"
            for i, model in enumerate(models, 1):
                name = model.get("name", "Unknown")
                model_id = model.get("model_id", "")
                description = model.get("description", "No description available")
                models_text += f"**{i}. {name}** (`{model_id}`)\n"
                models_text += f"   {description}\n\n"
            
            return [TextContent(type="text", text=models_text)]
        else:
            return [TextContent(type="text", text="No models found.")]
    else:
        return [
            TextContent(
                type="text",
                text=f"❌ Failed to get models: {result.get('error', 'Unknown error')}"
            )
        ]


def format_examples_response() -> List[TextContent]:
    """Format example prompts response for MCP"""
    examples = get_example_prompts()
    
    response_text = "🎵 **Music Generation Examples:**\n\n"
    
    response_text += "**Music Prompts:**\n"
    for i, example in enumerate(examples["music_examples"], 1):
        response_text += f"{i}. {example}\n"
    
    response_text += "\n**Sound Effect Prompts:**\n"
    for i, example in enumerate(examples["sound_effect_examples"], 1):
        response_text += f"{i}. {example}\n"
    
    response_text += "\n**Usage Tips:**\n"
    response_text += "- Be descriptive about the style, instruments, and mood\n"
    response_text += "- Specify tempo (slow, medium, fast, upbeat, etc.)\n"
    response_text += "- Mention specific instruments or sounds you want\n"
    response_text += "- Include emotional descriptors (happy, sad, energetic, calm)\n"
    response_text += "- For sound effects, be specific about the environment and action\n"
    response_text += "- **Important**: You need your own ElevenLabs API key to use this service"
    
    return [TextContent(type="text", text=response_text)]
