"""ElevenLabs API service for MCP server"""

import logging
import httpx
import base64
from typing import Dict, Any, Optional, Tuple
import uuid
import json
import re
from datetime import datetime

import httpx
from .config import config

logger = logging.getLogger(__name__)
class ElevenLabsService:
    """Service for interacting with ElevenLabs API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = config.elevenlabs_base_url
        # Use provided API key or fall back to config
        self.api_key = api_key or config.elevenlabs_api_key
        
        if not self.api_key:
            raise ValueError("ElevenLabs API key is required. Please provide it in the request.")
    
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
        duration_seconds: Optional[int] = None,
        prompt_influence: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate music from text prompt and return base64 encoded audio"""
        
        # Use default values if not provided
        duration_seconds = duration_seconds or config.default_duration
        prompt_influence = prompt_influence or config.default_prompt_influence
        
        # Validate duration - ElevenLabs requires minimum 10 seconds for music
        if duration_seconds < 10:
            duration_seconds = 10
        if duration_seconds > config.max_duration:
            duration_seconds = config.max_duration
        
        logger.info(f"Generating music: '{prompt}' ({duration_seconds}s)")
        
        # Prepare request data for music generation
        request_data = {
            "prompt": prompt,  # Use the prompt directly (could be text or composition plan from other agent)
            "music_length_ms": duration_seconds * 1000
        }
        
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
                    
                    # Generate metadata
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    unique_id = str(uuid.uuid4())[:8]
                    filename = f"music_{timestamp}_{unique_id}.mp3"
                    
                    logger.info(f"✅ Music generated: {filename} with lyrics: {bool(lyrics)}")
                    
                    return {
                        "success": True,
                        "audio_base64": audio_base64,
                        "duration_seconds": duration_seconds,
                        "prompt": prompt,
                        "filename": filename,
                        "file_size": len(base64.b64decode(audio_base64)) if audio_base64 else 0,
                        "mime_type": "audio/mpeg"
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
        duration_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate sound effect from text prompt and return base64 encoded audio"""
        
        duration_seconds = duration_seconds or 5  # Default 5 seconds for sound effects
        
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
                    # Encode audio as base64 for MCP transport
                    audio_data = response.content
                    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    
                    # Generate metadata
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
