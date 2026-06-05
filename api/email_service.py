from __future__ import annotations

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from dotenv import load_dotenv

load_dotenv()


def smtp_config() -> dict[str, Any]:
    return {
        "host": os.getenv("SMTP_HOST", ""),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "from": os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "")),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
        "configured": bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD")),
    }


def send_email(
    *,
    to_addrs: list[str],
    subject: str,
    text_body: str,
    html_body: str,
    cc_addrs: list[str] | None = None,
) -> dict[str, Any]:
    if not to_addrs:
        raise ValueError("收件人不能为空")
    if not subject.strip():
        raise ValueError("主题不能为空")
    if not text_body.strip():
        raise ValueError("正文不能为空")

    config = smtp_config()
    if not config["configured"]:
        raise ValueError("SMTP 未配置。请在服务端环境变量中填写 SMTP 信息。")

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = config["from"]
    message["To"] = ", ".join(to_addrs)
    if cc_addrs:
        message["Cc"] = ", ".join(cc_addrs)
    message.attach(MIMEText(text_body, "plain", "utf-8"))
    message.attach(MIMEText(html_body or text_body, "html", "utf-8"))

    recipients = to_addrs + (cc_addrs or [])
    with smtplib.SMTP(config["host"], config["port"], timeout=30) as server:
        if config["use_tls"]:
            server.starttls()
        server.login(config["user"], os.getenv("SMTP_PASSWORD", ""))
        server.sendmail(config["from"], recipients, message.as_string())

    return {
        "message": "Email sent successfully.",
        "to": to_addrs,
        "cc": cc_addrs or [],
        "subject": subject,
    }
