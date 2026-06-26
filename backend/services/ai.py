import os


def is_ai_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


async def draft_reply(message: str) -> str:
    if not is_ai_configured():
        return "Thank you for your message. Our team will get back to you shortly."

    return (
        "AI reply generation is ready to be connected to Gemini. "
        f"Received message: {message}"
    )
