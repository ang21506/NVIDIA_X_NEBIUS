"""Email provider abstraction.

Configure EMAIL_PROVIDER in .env:
- 'log'  (default): prints to server console — safe for development and tests
- 'smtp': sends via SMTP; requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

Never return email tokens in API responses (even for 'log' provider).
"""
import logging
from backend.app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    @classmethod
    def send(cls, to: str, subject: str, body_text: str) -> bool:
        """
        Send an email. Returns True if sent (or logged), False on error.

        The 'log' provider prints the email to the server log.
        This is suitable for development and test environments.
        For production, configure EMAIL_PROVIDER=smtp.
        """
        provider = getattr(settings, "EMAIL_PROVIDER", "log")
        if not provider:
            provider = "log"

        if provider == "log":
            # Safe for development — never logs credentials
            logger.info(
                "[EMAIL LOG] To: %s | Subject: %s | Body preview: %s",
                to,
                subject,
                body_text[:120].replace("\n", " "),
            )
            return True

        if provider == "smtp":
            return cls._send_smtp(to, subject, body_text)

        logger.warning("Unknown EMAIL_PROVIDER '%s', falling back to log transport", provider)
        logger.info("[EMAIL LOG] To: %s | Subject: %s", to, subject)
        return True

    @classmethod
    def _send_smtp(cls, to: str, subject: str, body_text: str) -> bool:
        import smtplib
        from email.message import EmailMessage

        from_addr = getattr(settings, "EMAIL_FROM", "noreply@learnloop.ai")
        host = getattr(settings, "SMTP_HOST", "localhost")
        port = int(getattr(settings, "SMTP_PORT", "587"))
        use_tls = str(getattr(settings, "SMTP_TLS", "true")).lower() == "true"
        smtp_user = getattr(settings, "SMTP_USER", "")
        smtp_pass = getattr(settings, "SMTP_PASSWORD", "")

        msg = EmailMessage()
        msg["From"] = from_addr
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body_text)

        try:
            with smtplib.SMTP(host, port, timeout=15) as s:
                if use_tls:
                    s.starttls()
                if smtp_user:
                    s.login(smtp_user, smtp_pass)
                s.send_message(msg)
            logger.info("Email sent via SMTP to %s", to)
            return True
        except Exception as e:
            # Log error without revealing credentials or internal stack trace
            logger.error("SMTP send failed for %s: %s", to, type(e).__name__)
            return False

