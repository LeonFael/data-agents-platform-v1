"""
Servicio LLM con patrón Strategy — mismo enfoque que file_router.py

Permite cambiar entre Anthropic Claude y Google Gemini sin tocar
el código de negocio (routes.py). El proveedor activo se decide
por configuración (LLM_PROVIDER en .env).
"""
from abc import ABC, abstractmethod

from app.core.config import get_settings

settings = get_settings()


# ── Interfaz común ────────────────────────────────────────────────────────────

class BaseLLMClient(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, messages: list[dict], max_tokens: int = 600) -> str:
        """
        messages: [{"role": "user"|"assistant", "content": str}, ...]
        Devuelve el texto de la respuesta.
        """
        pass


# ── Cliente Anthropic ─────────────────────────────────────────────────────────

class ClaudeClient(BaseLLMClient):
    def __init__(self, api_key: str):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)

    def generate(self, system_prompt: str, messages: list[dict], max_tokens: int = 600) -> str:
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text


# ── Cliente Google Gemini ─────────────────────────────────────────────────────

class GeminiClient(BaseLLMClient):
    def __init__(self, api_key: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)

    def generate(self, system_prompt: str, messages: list[dict], max_tokens: int = 600) -> str:
        # Gemini no separa "system" de los mensajes igual que Claude;
        # lo inyectamos como instrucción de sistema explícita.
        from google.genai import types

        # Convertir historial al formato de Gemini (roles: user / model)
        contents = []
        for m in messages:
            role = "model" if m["role"] == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=m["content"])]))

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text


# ── Factory: decide qué cliente instanciar ────────────────────────────────────

_client_cache: BaseLLMClient | None = None


def get_llm_client() -> BaseLLMClient:
    """
    Devuelve el cliente LLM activo según configuración.
    Cachea la instancia para no recrear conexiones en cada request.
    """
    global _client_cache
    if _client_cache is not None:
        return _client_cache

    provider = settings.llm_provider.lower()

    if provider == "claude":
        if not settings.anthropic_api_key:
            raise ValueError("LLM_PROVIDER=claude pero ANTHROPIC_API_KEY no está configurada")
        _client_cache = ClaudeClient(settings.anthropic_api_key)

    elif provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("LLM_PROVIDER=gemini pero GEMINI_API_KEY no está configurada")
        _client_cache = GeminiClient(settings.gemini_api_key)

    else:
        raise ValueError(f"LLM_PROVIDER '{provider}' no soportado. Usa 'claude' o 'gemini'.")

    return _client_cache


def reset_llm_client():
    """Útil para tests o cuando se cambia de proveedor en caliente."""
    global _client_cache
    _client_cache = None
