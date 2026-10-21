import logging
import smtplib
import ssl
from email.message import EmailMessage

from fastapi.concurrency import run_in_threadpool

from config import SMTP_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_STARTTLS, SMTP_USER

logger = logging.getLogger(__name__)


def _send(message: EmailMessage) -> None:
    context = ssl.create_default_context()

    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=10) as server:
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
        if SMTP_STARTTLS:
            server.starttls(context=context)
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(message)


async def send_email(to: str, subject: str, body: str) -> bool:
    """Sends a plain-text email without ever raising: a mail failure must not undo
    the operation it confirms. Returns True when the message was handed to the server."""

    if not SMTP_HOST or not SMTP_FROM:
        logger.warning("SMTP is not configured: confirmation email '%s' not sent", subject)
        return False

    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    try:
        await run_in_threadpool(_send, message)
        logger.info("Confirmation email sent: %s", subject)
        return True
    except Exception as exc:
        logger.error("Failed to send confirmation email '%s': %s", subject, exc)
        return False