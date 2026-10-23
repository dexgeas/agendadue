import json
import urllib.parse
from http.server import BaseHTTPRequestHandler
import sys
import os

# Ensure local api folder is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from portal import DeskPortalClient
from goto import GoToMeetingClient

# Shared in-memory instances (for demo / fast caching)
portal_client = DeskPortalClient()
goto_client = GoToMeetingClient()

def handle_api_request(method, path, query_params, body_data):
    """
    Route API requests and return (status_code, json_dict)
    """
    # 1. Login
    if path == "/api/login" and method == "POST":
        user = body_data.get("username", "andrea")
        pwd = body_data.get("password", "DESKitali@2021")
        global portal_client
        portal_client = DeskPortalClient(username=user, password=pwd)
        ok = portal_client.login()
        return 200, {"success": ok, "user": user}

    # 2. Get Month Calendar
    elif path == "/api/calendar/month":
        month = query_params.get("month", [None])[0] or body_data.get("month", 10)
        year = query_params.get("year", [None])[0] or body_data.get("year", 2026)
        res = portal_client.get_month_calendar(int(month), int(year))
        return 200, res

    # 3. Get Day Events
    elif path == "/api/calendar/day":
        day = query_params.get("day", [None])[0] or body_data.get("day", 23)
        month = query_params.get("month", [None])[0] or body_data.get("month", 10)
        year = query_params.get("year", [None])[0] or body_data.get("year", 2026)
        tipo = query_params.get("tipoElenco", [None])[0] or body_data.get("tipoElenco", "singolo")
        res = portal_client.get_day_events(int(day), int(month), int(year), tipo)
        return 200, res

    # 4. Generate GoTo Meeting
    elif path == "/api/goto/generate" and method == "POST":
        appointment = body_data.get("appointment", {})
        # Check custom GoTo credentials if passed in settings
        goto_settings = body_data.get("gotoSettings", {})
        c_id = goto_settings.get("clientId")
        c_sec = goto_settings.get("clientSecret")
        r_tok = goto_settings.get("refreshToken")
        
        client = GoToMeetingClient(client_id=c_id, client_secret=c_sec, refresh_token=r_tok) if c_id else goto_client
        res = client.generate_meeting(appointment)
        return 200, res

    # 5. Save GoTo link to Desk Italia intervention
    elif path == "/api/portal/save-link" and method == "POST":
        int_id = body_data.get("interventionId")
        link = body_data.get("gotoLink")
        if not int_id or not link:
            return 400, {"success": False, "error": "Missing interventionId or gotoLink"}
        res = portal_client.save_goto_link_to_intervention(int_id, link)
        return 200, res

    # 6. Status check
    elif path == "/api/status":
        return 200, {
            "status": "online",
            "app": "agenda2.0",
            "portalLogged": portal_client.logged_in
        }

    return 404, {"error": "Endpoint non trovato", "path": path}


class handler(BaseHTTPRequestHandler):
    """
    Vercel Serverless Function entry point
    """
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(parsed.query)
        status, res = handle_api_request("GET", parsed.path, q, {})
        self._send_json(status, res)

    def do_POST(self):
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

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _send_json(self, status, data):
        body_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)
