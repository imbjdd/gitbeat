# 🎵 GitBeat MCP Server

A Model Context Protocol (MCP) server for music generation using ElevenLabs API. Users provide their own ElevenLabs API key.

**🔗 Live MCP Server**: https://mcp-server-ten-kappa.vercel.app/mcp

## 🚀 Quick Start

### MCP Protocol Usage

This server implements the Model Context Protocol (MCP) 2024-11-05. Use it with MCP-compatible clients:

**MCP Endpoint**: `https://mcp-server-ten-kappa.vercel.app/mcp`

### Available Tools

1. **generate_music** - Generate music from text prompts
2. **generate_sound_effect** - Generate sound effects from text prompts

### Example MCP Request

```bash
curl -X POST "https://mcp-server-ten-kappa.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generate_music",
      "arguments": {
        "prompt": "A cheerful upbeat electronic dance music track",
        "duration_seconds": 15,
        "elevenlabs_api_key": "sk_your_api_key_here"
      }
    }
  }'
```

## 📡 MCP Endpoints

- `GET /` - Server information
- `GET /health` - Health check
- `POST /mcp` - MCP JSON-RPC endpoint
  - `initialize` - Initialize MCP connection
  - `tools/list` - List available tools
  - `tools/call` - Call a specific tool

## 🔑 Requirements

- Your own ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io)
- That's it! No registration or authentication needed.

## 📁 Project Structure

```
mcp-server/
├── gitbeat_mcp/
│   ├── __init__.py
│   ├── config.py              # Configuration
│   ├── elevenlabs_service.py  # ElevenLabs API integration
│   ├── server.py              # MCP server (optional)
│   └── tools.py               # Tool definitions
├── vercel_app.py              # HTTP API (main)
├── vercel.json                # Vercel config
├── requirements.txt           # Dependencies
├── pyproject.toml            # Project config
└── README.md                 # This file
```

## 🎼 Example Prompts

**Music:**
- "A cheerful upbeat electronic dance music track with synthesizers"
- "Relaxing ambient music with soft piano and nature sounds"
- "Energetic rock guitar riff with drums"

**Sound Effects:**
- "Gentle rain falling on leaves"
- "Ocean waves crashing on the shore"
- "Birds chirping in a forest"

## 🔧 Local Development

```bash
# Install dependencies
uv sync

# Run locally
uv run python vercel_app.py
```

## 📄 License

Part of the GitBeat application for the Tech Europe Hackathon.
