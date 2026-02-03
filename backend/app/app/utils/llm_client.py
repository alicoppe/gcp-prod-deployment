from typing import Any

from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage

from app.core.config import settings

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
except Exception:  # pragma: no cover - handled via runtime config
    vertexai = None
    GenerativeModel = None


class ChatClient:
    def __init__(self) -> None:
        self.provider = settings.CHAT_PROVIDER.lower()
        if self.provider == "mock":
            self.client = None
        elif self.provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise RuntimeError("OPENAI_API_KEY must be set when using OpenAI.")
            self.client = ChatOpenAI(
                temperature=0,
                openai_api_key=settings.OPENAI_API_KEY,
                model_name=settings.OPENAI_MODEL,
            )
        elif self.provider in ("vertex", "gemini"):
            if vertexai is None or GenerativeModel is None:
                raise RuntimeError(
                    "Vertex AI libraries are not available. "
                    "Install google-cloud-aiplatform to use Gemini."
                )
            if not settings.VERTEX_PROJECT_ID or not settings.VERTEX_REGION:
                raise RuntimeError(
                    "VERTEX_PROJECT_ID and VERTEX_REGION must be set for Gemini."
                )
            vertexai.init(
                project=settings.VERTEX_PROJECT_ID,
                location=settings.VERTEX_REGION,
            )
            self.client = GenerativeModel(settings.VERTEX_MODEL)
        else:
            raise RuntimeError(
                f"Unsupported CHAT_PROVIDER '{settings.CHAT_PROVIDER}'. "
                "Use 'vertex', 'openai', or 'mock'."
            )

    def generate(self, prompt: str) -> str:
        if self.provider == "mock":
            return "LLM is not configured for local dev. Set CHAT_PROVIDER to 'vertex' or 'openai' to enable responses."

        if self.provider == "openai":
            result = self.client([HumanMessage(content=prompt)])
            return result.content
        try:
            response: Any = self.client.generate_content(prompt)
        except Exception as exc:  # pragma: no cover - runtime provider failures
            return (
                "LLM request failed. Configure credentials for the selected "
                f"provider. Details: {exc}"
            )
        text = getattr(response, "text", None)
        return text if text is not None else str(response)
