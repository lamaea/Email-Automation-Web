from __future__ import annotations

import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from email_service import send_email, smtp_config

app = Flask(__name__)

allowed_origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "").split(",") if item.strip()]
if allowed_origins:
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
else:
    CORS(app)


def require_api_key():
    expected = os.getenv("SEND_API_KEY", "").strip()
    if not expected:
        return None
    provided = request.headers.get("X-API-Key", "").strip()
    if provided != expected:
        return jsonify({"error": "API 口令无效"}), 401
    return None


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/email/config")
def email_config():
    config = smtp_config()
    return jsonify(
        {
            "configured": config["configured"],
            "host": config["host"],
            "port": config["port"],
            "from": config["from"],
            "user": config["user"],
            "useTls": config["use_tls"],
            "apiKeyRequired": bool(os.getenv("SEND_API_KEY", "").strip()),
        }
    )


@app.post("/api/email/send")
def email_send():
    auth_error = require_api_key()
    if auth_error:
        return auth_error

    body = request.get_json(silent=True) or {}
    to_addrs = [item.strip() for item in body.get("to", []) if item and str(item).strip()]
    cc_addrs = [item.strip() for item in body.get("cc", []) if item and str(item).strip()]
    subject = str(body.get("subject", "")).strip()
    text_body = str(body.get("text", "")).strip()
    html_body = str(body.get("html", "")).strip()

    try:
        result = send_email(
            to_addrs=to_addrs,
            cc_addrs=cc_addrs,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"发送失败: {exc}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    app.run(host="0.0.0.0", port=port)
