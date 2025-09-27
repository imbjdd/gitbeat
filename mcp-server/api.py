#!/usr/bin/env python3
"""
GitBeat MCP Server with SSE (Server-Sent Events) support
This allows the MCP server to be accessed over HTTP/SSE instead of just stdio
"""

import asyncio
import json
import logging
import sys
import os
from typing import Any, Dict

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Import our MCP tools (without MCP dependencies for Vercel)
try:
    from gitbeat_mcp.tools import get_tool_definitions, handle_tool_call
    TOOLS_AVAILABLE = True
except ImportError:
    TOOLS_AVAILABLE = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="GitBeat MCP Server (SSE)",
    description="MCP Server with Server-Sent Events support for remote access",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with MCP server information"""
    return {
        "name": "GitBeat MCP Server",
        "version": "0.1.0",
        "protocol": "MCP 2024-11-05",
        "protocolVersion": "2024-11-05",
        "description": "Music generation server using ElevenLabs API",
        "tools": [
            "generate_music",
            "generate_sound_effect", 
            "test_elevenlabs_connection",
            "get_available_models",
            "get_music_examples"
        ],
        "status": "healthy",
        "endpoints": {
            "mcp": "/mcp",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "gitbeat-mcp-sse"}

@app.get("/sse")
async def sse_endpoint(request: Request):
    """SSE endpoint for MCP communication"""
    
    async def event_stream():
        try:
            # Send MCP server capabilities on connection
            capabilities = {
                "jsonrpc": "2.0",
                "id": "server-init",
                "method": "initialize",
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "GitBeat MCP Server",
                        "version": "0.1.0"
                    }
                }
            }
            yield f"data: {json.dumps(capabilities)}\n\n"
            
            # Send tools list
            if TOOLS_AVAILABLE:
                tools = get_tool_definitions()
                tools_message = {
                    "jsonrpc": "2.0",
                    "id": "tools-list",
                    "method": "tools/list",
                    "result": {
                        "tools": [
                            {
                                "name": tool.name,
                                "description": tool.description,
                                "inputSchema": tool.inputSchema
                            } for tool in tools
                        ]
                    }
                }
            else:
                tools_message = {
                    "jsonrpc": "2.0",
                    "id": "tools-list", 
                    "method": "tools/list",
                    "result": {
                        "tools": [
                            {
                                "name": "generate_music",
                                "description": "Generate music from a text prompt using ElevenLabs AI",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "prompt": {"type": "string", "description": "Music description"},
                                        "elevenlabs_api_key": {"type": "string", "description": "ElevenLabs API key"}
                                    },
                                    "required": ["prompt", "elevenlabs_api_key"]
                                }
                            }
                        ]
                    }
                }
            
            yield f"data: {json.dumps(tools_message)}\n\n"
            
            # Keep connection alive with periodic pings
            while not await request.is_disconnected():
                try:
                    ping_message = {
                        "jsonrpc": "2.0",
                        "method": "notifications/ping",
                        "params": {"timestamp": asyncio.get_event_loop().time()}
                    }
                    yield f"data: {json.dumps(ping_message)}\n\n"
                    await asyncio.sleep(30)  # Ping every 30 seconds
                except Exception as e:
                    logger.error(f"SSE error: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            error_message = {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
            yield f"data: {json.dumps(error_message)}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@app.post("/mcp")
async def mcp_endpoint(request: Request):
    """MCP JSON-RPC endpoint"""
    try:
        data = await request.json()
        
        if data.get("method") == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": data.get("id"),
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "experimental": {},
                        "prompts": {"listChanged": False},
                        "resources": {"subscribe": False, "listChanged": False},
                        "tools": {"listChanged": True}
                    },
                    "serverInfo": {
                        "name": "GitBeat MCP Server",
                        "version": "0.1.0"
                    }
                }
            }
        
        elif data.get("method") == "tools/list":
            if TOOLS_AVAILABLE:
                tools = get_tool_definitions()
                tools_list = []
                for tool in tools:
                    tools_list.append({
                        "name": tool.name,
                        "description": tool.description,
                        "inputSchema": tool.inputSchema
                    })
            else:
                tools_list = [
                    {
                        "name": "generate_music",
                        "description": "Generate music from a text prompt using ElevenLabs AI",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "prompt": {
                                    "type": "string",
                                    "description": "Text description of the music to generate"
                                },
                                "duration_seconds": {
                                    "type": "integer",
                                    "description": "Duration of the music in seconds (10-30)",
                                    "minimum": 10,
                                    "maximum": 30,
                                    "default": 15
                                },
                                "elevenlabs_api_key": {
                                    "type": "string",
                                    "description": "Your ElevenLabs API key"
                                }
                            },
                            "required": ["prompt", "elevenlabs_api_key"]
                        }
                    },
                    {
                        "name": "generate_sound_effect",
                        "description": "Generate sound effects from a text prompt using ElevenLabs AI",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "prompt": {
                                    "type": "string",
                                    "description": "Text description of the sound effect to generate"
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
                                    "description": "Your ElevenLabs API key"
                                }
                            },
                            "required": ["prompt", "elevenlabs_api_key"]
                        }
                    }
                ]
            
            return {
                "jsonrpc": "2.0",
                "id": data.get("id"),
                "result": {
                    "tools": tools_list
                }
            }
        
        elif data.get("method") == "tools/call":
            tool_name = data.get("params", {}).get("name")
            arguments = data.get("params", {}).get("arguments", {})
            
            if TOOLS_AVAILABLE:
                result = await handle_tool_call(tool_name, arguments)
                return {
                    "jsonrpc": "2.0",
                    "id": data.get("id"),
                    "result": result
                }
            else:
                # Fallback: direct API call
                if tool_name == "generate_music":
                    from gitbeat_mcp.elevenlabs_service import ElevenLabsService
                    
                    api_key = arguments.get("elevenlabs_api_key")
                    if not api_key:
                        return {
                            "jsonrpc": "2.0",
                            "id": data.get("id"),
                            "result": {
                                "content": [{"type": "text", "text": "❌ ElevenLabs API key is required"}]
                            }
                        }
                    
                    try:
                        service = ElevenLabsService(api_key=api_key)
                        result = await service.generate_music(
                            prompt=arguments.get("prompt"),
                            duration_seconds=arguments.get("duration_seconds", 15)
                        )
                        
                        if result.get("success"):
                            response_text = f"✅ Music generated successfully!\n\n"
                            response_text += f"**🎵 Audio:** {result.get('filename')}\n"
                            response_text += f"**⏱️ Duration:** {result.get('duration_seconds')} seconds\n"
                            response_text += f"**📝 Prompt:** {result.get('prompt')}\n"
                            response_text += f"**📊 File Size:** {result.get('file_size')} bytes\n"
                            response_text += f"\n**🎵 Audio Data (Base64):**\n"
                            response_text += f"```\n{result.get('audio_base64')}\n```"
                        else:
                            response_text = f"❌ Music generation failed: {result.get('error', 'Unknown error')}"
                        
                        return {
                            "jsonrpc": "2.0",
                            "id": data.get("id"),
                            "result": {
                                "content": [{"type": "text", "text": response_text}]
                            }
                        }
                        
                    except Exception as e:
                        return {
                            "jsonrpc": "2.0",
                            "id": data.get("id"),
                            "result": {
                                "content": [{"type": "text", "text": f"❌ Error: {str(e)}"}]
                            }
                        }
                
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": data.get("id"),
                        "error": {
                            "code": -32601,
                            "message": f"Unknown tool: {tool_name}"
                        }
                    }
        
        else:
            return {
                "jsonrpc": "2.0",
                "id": data.get("id"),
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {data.get('method')}"
                }
            }
            
    except Exception as e:
        logger.error(f"MCP endpoint error: {e}")
        return {
            "jsonrpc": "2.0",
            "id": data.get("id") if 'data' in locals() else None,
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }

# Export the app for Vercel
# Vercel will automatically handle the ASGI server
