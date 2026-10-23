#!/usr/bin/env python3
"""
agenda2.0 - Local Development & Production Server
Zero-dependency server that runs directly with Python 3.
Serves static frontend (HTML5/CSS/JS) and proxies /api/* requests to Desk Italia & GoTo Meeting.
"""
import http.server
import socketserver
import urllib.parse
import json
import os
import sys

# Add api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))
from index import handle_api_request

PORT = int(os.environ.get("PORT", 3000))
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")

class AgendaServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            parsed = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(parsed.query)
            status, res = handle_api_request("GET", parsed.path, q, {})
            self._send_json(status, res)
        else:
            if self.path in ("/", ""):
                self.path = "/index.html"
            else:
                target = os.path.join(PUBLIC_DIR, self.path.lstrip("/"))
                if not os.path.exists(target) or not os.path.isfile(target):
                    self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            parsed = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(parsed.query)
            content_len = int(self.headers.get('Content-Length', 0))
            body_raw = self.rfile.read(content_len) if content_len > 0 else b'{}'
            try:
                body = json.loads(body_raw.decode('utf-8'))
            except Exception:
                body = {}
            status, res = handle_api_request("POST", parsed.path, q, body)
            self._send_json(status, res)
        else:
            self.send_error(405, "Method not allowed")

    def _send_json(self, status, data):
        body_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)

    def log_message(self, format, *args):
        # Friendly concise logging
        sys.stderr.write(f"[agenda2.0] {args[0]} {args[1]} -> {args[2]}\n")

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), AgendaServerHandler) as httpd:
        print(f"\n==================================================")
        print(f"🚀 agenda2.0 è attiva!")
        print(f"📱 Accesso Locale:  http://localhost:{PORT}")
        print(f"🌐 Accesso da Rete: http://0.0.0.0:{PORT}")
        print(f"==================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer arrestato.")

if __name__ == "__main__":
    run()
