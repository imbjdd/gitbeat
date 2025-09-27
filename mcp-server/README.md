# 🎵 GitBeat MCP Server

A simple HTTP API for music generation using ElevenLabs. Users provide their own ElevenLabs API key.

**🔗 Live API**: https://mcp-server-aik6nfog8-ykzou1214-4122s-projects.vercel.app

## 🚀 Quick Start

### Generate Music
```bash
curl -X POST "https://mcp-server-aik6nfog8-ykzou1214-4122s-projects.vercel.app/generate-music" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cheerful upbeat electronic dance music track",
    "duration_seconds": 10,
    "elevenlabs_api_key": "sk_your_api_key_here"
  }'
```

### Generate Sound Effect
```bash
curl -X POST "https://mcp-server-aik6nfog8-ykzou1214-4122s-projects.vercel.app/generate-sound" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Gentle rain falling on leaves",
    "duration_seconds": 5,
    "elevenlabs_api_key": "sk_your_api_key_here"
  }'
```

## 📡 API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /examples` - Get example prompts (no API key needed)
- `POST /generate-music` - Generate music
- `POST /generate-sound` - Generate sound effects  
- `POST /test-connection` - Test your ElevenLabs API key
- `POST /models` - Get available ElevenLabs models

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
