import time
import json
import logging
from typing import Optional, List, Dict, Any
from openai import OpenAI
from backend.app.config import settings

logger = logging.getLogger(__name__)

class NebiusAIService:
    _client: Optional[OpenAI] = None

    @classmethod
    def get_client(cls) -> OpenAI:
        if not settings.NEBIUS_API_KEY:
            raise ValueError(
                "Nebius API key is not configured. Please set NEBIUS_API_KEY in backend/.env "
                "or export it in your environment."
            )
        if cls._client is None:
            cls._client = OpenAI(
                base_url=settings.NEBIUS_BASE_URL,
                api_key=settings.NEBIUS_API_KEY,
                timeout=float(settings.AGENT_TIMEOUT_SECONDS),
                max_retries=2,
            )
        return cls._client

    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.NEBIUS_API_KEY and len(settings.NEBIUS_API_KEY.strip()) > 5)

    @classmethod
    def list_available_models(cls) -> List[str]:
        """
        Dynamically fetches available models from Nebius Token Factory catalog.
        """
        if not cls.is_configured():
            return [settings.NEBIUS_MODEL_ID] + settings.NEBIUS_FALLBACK_MODELS
        try:
            client = cls.get_client()
            models_page = client.models.list()
            return [m.id for m in models_page.data]
        except Exception as e:
            logger.warning(f"Could not fetch models dynamically from Nebius: {e}")
            return [settings.NEBIUS_MODEL_ID] + settings.NEBIUS_FALLBACK_MODELS

    @classmethod
    def generate_chat_completion(
        cls,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        response_format: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Performs live inference with NVIDIA Nemotron on Nebius Token Factory.
        Captures latency and usage tokens.
        """
        client = cls.get_client()
        target_model = model or settings.NEBIUS_MODEL_ID

        start_time = time.time()
        try:
            kwargs: Dict[str, Any] = {
                "model": target_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = client.chat.completions.create(**kwargs)
            latency_ms = round((time.time() - start_time) * 1000, 2)
            content = response.choices[0].message.content or ""
            
            usage_info = {}
            if response.usage:
                usage_info = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            logger.info(
                f"Nebius inference successful with model {target_model} in {latency_ms}ms. "
                f"Tokens: {usage_info}"
            )

            return {
                "content": content,
                "latency_ms": latency_ms,
                "model_used": target_model,
                "usage": usage_info,
            }
        except Exception as e:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            logger.error(f"Nebius inference failed ({target_model}) after {latency_ms}ms: {e}")
            raise RuntimeError(f"Nebius AI inference error ({target_model}): {str(e)}")
