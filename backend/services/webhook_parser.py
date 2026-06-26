import logging
from dataclasses import dataclass
from typing import Any


logger = logging.getLogger(__name__)


@dataclass
class ParsedMessage:
    phone_number_id: str
    from_number: str
    customer_name: str
    wa_message_id: str
    message_type: str
    text_content: str | None
    timestamp: int


@dataclass
class ParsedStatusUpdate:
    phone_number_id: str
    wa_message_id: str
    status: str
    recipient_number: str
    timestamp: int


def _safe_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _contact_name(contacts: list[dict[str, Any]], wa_id: str) -> str:
    for contact in contacts:
        if str(contact.get("wa_id") or "") == wa_id:
            profile = contact.get("profile") or {}
            name = profile.get("name")
            return str(name).strip() if name else ""
    return ""


def _message_text(message: dict[str, Any], message_type: str) -> str | None:
    if message_type == "text":
        text = message.get("text") or {}
        body = text.get("body")
        return str(body) if body is not None else None
    if message_type == "button":
        button = message.get("button") or {}
        return button.get("text")
    if message_type == "interactive":
        interactive = message.get("interactive") or {}
        button_reply = interactive.get("button_reply") or {}
        list_reply = interactive.get("list_reply") or {}
        return button_reply.get("title") or list_reply.get("title")
    return None


def parse_webhook_payload(payload: dict) -> tuple[list[ParsedMessage], list[ParsedStatusUpdate]]:
    messages: list[ParsedMessage] = []
    status_updates: list[ParsedStatusUpdate] = []

    try:
        entries = payload.get("entry") or []
        if not isinstance(entries, list):
            return messages, status_updates

        for entry in entries:
            for change in entry.get("changes") or []:
                try:
                    value = change.get("value") or {}
                    metadata = value.get("metadata") or {}
                    phone_number_id = str(metadata.get("phone_number_id") or "")
                    contacts = value.get("contacts") or []

                    for message in value.get("messages") or []:
                        message_type = str(message.get("type") or "unknown")
                        from_number = str(message.get("from") or "")
                        wa_message_id = str(message.get("id") or "")
                        if not phone_number_id or not from_number or not wa_message_id:
                            continue

                        messages.append(
                            ParsedMessage(
                                phone_number_id=phone_number_id,
                                from_number=from_number,
                                customer_name=_contact_name(contacts, from_number),
                                wa_message_id=wa_message_id,
                                message_type=message_type,
                                text_content=_message_text(message, message_type),
                                timestamp=_safe_int(message.get("timestamp")),
                            )
                        )

                    for status in value.get("statuses") or []:
                        wa_message_id = str(status.get("id") or "")
                        if not wa_message_id:
                            continue
                        status_updates.append(
                            ParsedStatusUpdate(
                                phone_number_id=phone_number_id,
                                wa_message_id=wa_message_id,
                                status=str(status.get("status") or "unknown"),
                                recipient_number=str(status.get("recipient_id") or ""),
                                timestamp=_safe_int(status.get("timestamp")),
                            )
                        )
                except Exception:
                    logger.exception("Could not parse WhatsApp webhook change.")
                    continue
    except Exception:
        logger.exception("Could not parse WhatsApp webhook payload.")

    return messages, status_updates
