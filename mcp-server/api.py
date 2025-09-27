"""
Standalone HTTP API for GitBeat Music Generation - Vercel deployment
No MCP dependencies - pure FastAPI implementation
"""

import asyncio
import json
import logging
import httpx
import base64
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="GitBeat Music Generation API",
    description="Generate music and sound effects using ElevenLabs API",
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

# Pydantic models
class MusicGenerationRequest(BaseModel):
    """Request model for music generation"""
    prompt: str = Field(..., min_length=1, max_length=1000)
    duration_seconds: Optional[int] = Field(default=10, ge=1, le=30)
    prompt_influence: Optional[float] = Field(default=0.3, ge=0.0, le=1.0)
    composition_mode: Optional[bool] = Field(default=False, description="Enable composition mode for structured music")
    genre: Optional[str] = Field(default=None, description="Music genre (pop, rock, jazz, etc.)")
    mood: Optional[str] = Field(default=None, description="Music mood (happy, sad, energetic, calm, etc.)")
    tempo: Optional[str] = Field(default=None, description="Tempo (slow, medium, fast, upbeat)")
    instruments: Optional[List[str]] = Field(default=None, description="Specific instruments to include")
    elevenlabs_api_key: str = Field(..., min_length=1, description="Your ElevenLabs API key")

class SoundEffectRequest(BaseModel):
    """Request model for sound effect generation"""
    prompt: str = Field(..., min_length=1, max_length=500)
    duration_seconds: Optional[int] = Field(default=5, ge=1, le=15)
    elevenlabs_api_key: str = Field(..., min_length=1, description="Your ElevenLabs API key")

class APIKeyRequest(BaseModel):
    """Request model for API key operations"""
    elevenlabs_api_key: str = Field(..., min_length=1, description="Your ElevenLabs API key")

# ElevenLabs Service
class ElevenLabsService:
    """Service for interacting with ElevenLabs API"""
    
    def __init__(self, api_key: str):
        self.base_url = "https://api.elevenlabs.io"
        self.api_key = api_key
        
        if not self.api_key:
            raise ValueError("ElevenLabs API key is required")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for ElevenLabs API requests"""
        return {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test ElevenLabs API connection"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/v1/models",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Connection successful"}
                else:
                    return {
                        "success": False, 
                        "message": f"API test failed: {response.status_code}"
                    }
                    
            except Exception as e:
                logger.error(f"Connection test failed: {e}")
                return {"success": False, "message": f"Connection error: {str(e)}"}
    
    async def generate_music(
        self,
        prompt: str,
        duration_seconds: int = 10,
        prompt_influence: float = 0.3,
        composition_mode: bool = False,
        genre: Optional[str] = None,
        mood: Optional[str] = None,
        tempo: Optional[str] = None,
        instruments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate music from text prompt and return base64 encoded audio"""
        
        logger.info(f"Generating music: '{prompt}' ({duration_seconds}s)")
        
        request_data = {
            "prompt": prompt,
            "music_length_ms": duration_seconds * 1000  # Convert seconds to milliseconds
        }
        
        # Add composition mode parameters if enabled
        if composition_mode:
            request_data["composition_mode"] = True
            
            # Build style settings
            style_settings = {}
            if genre:
                style_settings["genre"] = genre
            if mood:
                style_settings["mood"] = mood
            if tempo:
                style_settings["tempo"] = tempo
            if instruments:
                style_settings["instruments"] = instruments
                
            if style_settings:
                request_data["style_settings"] = style_settings
        
        async with httpx.AsyncClient() as client:
            try:
                # Generate music using detailed endpoint
                logger.info("Generating music with detailed endpoint...")
                response = await client.post(
                    f"{self.base_url}/v1/music/detailed",
                    headers=self._get_headers(),
                    json=request_data,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    try:
                        # Try to parse JSON response from detailed endpoint
                        response_data = response.json()
                        
                        # Extract audio data from JSON response
                        audio_data = response_data.get("audio", b"")
                        if isinstance(audio_data, str):
                            # If it's base64 encoded string
                            audio_base64 = audio_data
                        else:
                            # If it's binary data, encode it
                            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                        
                        # Extract lyrics and metadata from detailed response
                        composition_plan = response_data.get("composition_plan", {})
                        song_metadata = response_data.get("song_metadata", {})
                        
                        # Extract lyrics from composition plan if available
                        lyrics = ""
                        if composition_plan:
                            sections = composition_plan.get("sections", [])
                            for section in sections:
                                lines = section.get("lines", [])
                                if lines:
                                    section_name = section.get("section_name", "")
                                    if section_name:
                                        lyrics += f"[{section_name}]\n"
                                    lyrics += "\n".join(lines) + "\n\n"
                        
                        logger.info(f"✅ Music generated with JSON response, lyrics: {len(lyrics)} chars")
                        
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        # Fallback: treat as binary audio
                        logger.warning("Detailed endpoint returned binary, treating as audio file")
                        audio_data = response.content
                        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                        lyrics = ""
                        composition_plan = {}
                        song_metadata = {}
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    unique_id = str(uuid.uuid4())[:8]
                    filename = f"music_{timestamp}_{unique_id}.mp3"
                    
                    logger.info(f"✅ Music generated: {filename} with lyrics: {bool(lyrics)}")
                    
                    return {
                        "success": True,
                        "audio_base64": audio_base64,
                        "filename": filename,
                        "file_size": len(base64.b64decode(audio_base64)) if audio_base64 else 0,
                        "duration_seconds": duration_seconds,
                        "prompt": prompt,
                        "mime_type": "audio/mpeg",
                        "lyrics": lyrics,
                        "composition_plan": composition_plan,
                        "song_metadata": song_metadata
                    }
                else:
                    error_msg = f"Music generation failed: HTTP {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f" - {error_detail}"
                    except:
                        error_msg += f" - {response.text}"
                    
                    logger.error(error_msg)
                    return {"success": False, "error": error_msg}
                    
            except Exception as e:
                logger.error(f"Error generating music: {e}")
                return {"success": False, "error": str(e)}
    
    async def generate_sound_effect(
        self,
        prompt: str,
        duration_seconds: int = 5
    ) -> Dict[str, Any]:
        """Generate sound effect from text prompt and return base64 encoded audio"""
        
        logger.info(f"Generating sound effect: '{prompt}' ({duration_seconds}s)")
        
        request_data = {
            "text": prompt,
            "duration_seconds": duration_seconds
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/v1/sound-generation",
                    headers=self._get_headers(),
                    json=request_data,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    audio_data = response.content
                    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    unique_id = str(uuid.uuid4())[:8]
                    filename = f"sound_{timestamp}_{unique_id}.mp3"
                    
                    logger.info(f"✅ Sound effect generated: {filename} ({len(audio_data)} bytes)")
                    
                    return {
                        "success": True,
                        "audio_base64": audio_base64,
                        "filename": filename,
                        "file_size": len(audio_data),
                        "duration_seconds": duration_seconds,
                        "prompt": prompt,
                        "mime_type": "audio/mpeg"
                    }
                else:
                    error_msg = f"Sound generation failed: HTTP {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f" - {error_detail}"
                    except:
                        error_msg += f" - {response.text}"
                    
                    logger.error(error_msg)
                    return {"success": False, "error": error_msg}
                    
            except Exception as e:
                logger.error(f"Error generating sound effect: {e}")
                return {"success": False, "error": str(e)}
    
    async def get_available_models(self) -> Dict[str, Any]:
        """Get available models from ElevenLabs"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/v1/models",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    models_data = response.json()
                    models_list = models_data if isinstance(models_data, list) else models_data.get('models', [])
                    
                    logger.info(f"Retrieved {len(models_list)} models")
                    return {"success": True, "models": models_list}
                else:
                    logger.error(f"Failed to get models: {response.status_code}")
                    return {"success": False, "error": f"HTTP {response.status_code}"}
                    
            except Exception as e:
                logger.error(f"Error getting models: {e}")
                return {"success": False, "error": str(e)}

# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "GitBeat Music Generation API",
        "version": "0.1.0",
        "description": "Generate music with lyrics and sound effects using your ElevenLabs API key",
        "endpoints": {
            "generate_music": "POST /generate-music",
            "generate_sound": "POST /generate-sound",
            "test_connection": "POST /test-connection",
            "models": "POST /models",
            "examples": "GET /examples"
        },
        "note": "All endpoints require your own ElevenLabs API key"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "gitbeat-music-api"}

@app.post("/generate-music")
async def generate_music_endpoint(request: MusicGenerationRequest):
    """Generate music from text prompt"""
    try:
        service = ElevenLabsService(api_key=request.elevenlabs_api_key)
        result = await service.generate_music(
            prompt=request.prompt,
            duration_seconds=request.duration_seconds,
            prompt_influence=request.prompt_influence,
            composition_mode=request.composition_mode,
            genre=request.genre,
            mood=request.mood,
            tempo=request.tempo,
            instruments=request.instruments
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating music: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-sound")
async def generate_sound_endpoint(request: SoundEffectRequest):
    """Generate sound effect from text prompt"""
    try:
        service = ElevenLabsService(api_key=request.elevenlabs_api_key)
        result = await service.generate_sound_effect(
            prompt=request.prompt,
            duration_seconds=request.duration_seconds
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating sound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-connection")
async def test_connection_endpoint(request: APIKeyRequest):
    """Test ElevenLabs API connection"""
    try:
        service = ElevenLabsService(api_key=request.elevenlabs_api_key)
        result = await service.test_connection()
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models")
async def get_models_endpoint(request: APIKeyRequest):
    """Get available ElevenLabs models"""
    try:
        service = ElevenLabsService(api_key=request.elevenlabs_api_key)
        result = await service.get_available_models()
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/examples")
async def get_examples_endpoint():
    """Get example prompts (no API key required)"""
    examples = {
        "basic_music_examples": [
            "A cheerful upbeat electronic dance music track with synthesizers",
            "Relaxing ambient music with soft piano and nature sounds",
            "Energetic rock guitar riff with drums",
            "Classical orchestral piece with strings and woodwinds",
            "Jazz saxophone melody with walking bass line"
        ],
        "composition_mode_examples": [
            {
                "prompt": "A romantic love song with heartfelt lyrics",
                "composition_mode": True,
                "genre": "pop",
                "mood": "romantic",
                "tempo": "slow",
                "instruments": ["piano", "strings", "soft_drums"]
            },
            {
                "prompt": "An energetic workout anthem with motivational vibes",
                "composition_mode": True,
                "genre": "electronic",
                "mood": "energetic",
                "tempo": "fast",
                "instruments": ["synthesizer", "bass", "drums"]
            },
            {
                "prompt": "A melancholic indie song about lost memories",
                "composition_mode": True,
                "genre": "indie",
                "mood": "melancholic",
                "tempo": "medium",
                "instruments": ["acoustic_guitar", "violin", "soft_vocals"]
            }
        ],
        "sound_effect_examples": [
            "Gentle rain falling on leaves",
            "Ocean waves crashing on the shore",
            "Birds chirping in a forest",
            "Crackling campfire",
            "Thunder and lightning storm"
        ],
        "usage_tips": {
            "basic_mode": "Simple text prompts work great for quick music generation",
            "composition_mode": "Enable for more structured, professional-quality music with specific genre, mood, and instrument control",
            "prompt_influence": "Higher values (0.7-1.0) follow your prompt more closely, lower values (0.1-0.3) allow more creative freedom",
            "duration": "Longer durations (20-30s) work better with composition mode for complete musical phrases",
            "lyrics": "The API now returns lyrics in the response when applicable - check the 'lyrics' field in the result",
            "metadata": "Full composition plan and song metadata are included in the response for detailed analysis"
        }
    }
    return {"success": True, "examples": examples}

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# For Vercel deployment
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
