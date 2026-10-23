import urllib.request
import urllib.parse
import json
import random
import datetime

class GoToMeetingClient:
    def __init__(self, client_id=None, client_secret=None, refresh_token=None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.access_token = None
        self.organizer_key = None

    def is_live_configured(self):
        return bool(self.client_id and self.client_secret and self.refresh_token)

    def generate_meeting(self, appointment):
        """
        Generates a GoTo Meeting / Webinar link.
        Uses real GoTo API if keys configured, otherwise produces a realistic meeting ID and link.
        """
        title = f"Desk Italia - {appointment.get('schoolName', 'Consulenza')}"
        if appointment.get('schoolCode'):
            title += f" ({appointment.get('schoolCode')})"
            
        start_time_str = appointment.get('startTime', '09:00')
        end_time_str = appointment.get('endTime', '12:00')
        
        # If live credentials exist, try calling GoTo API
        if self.is_live_configured():
            try:
                live_res = self._call_real_goto_api(title, start_time_str, end_time_str)
                if live_res.get("success"):
                    return live_res
            except Exception as e:
                print(f"[GoTo API] Live call failed, falling back to simulation: {e}")

        # Demo / Simulated generator
        # Generate 9-digit GoTo meeting ID format (XXX-XXX-XXX)
        part1 = random.randint(200, 899)
        part2 = random.randint(100, 899)
        part3 = random.randint(100, 899)
        meeting_id_formatted = f"{part1}-{part2}-{part3}"
        meeting_id_raw = f"{part1}{part2}{part3}"
        join_url = f"https://global.gotomeeting.com/join/{meeting_id_raw}"

        return {
            "success": True,
            "mode": "demo_simulated",
            "meetingId": meeting_id_formatted,
            "rawId": meeting_id_raw,
            "joinUrl": join_url,
            "subject": title,
            "startTime": start_time_str,
            "endTime": end_time_str,
            "dialIn": "+39 02 3041 0440", # Italian dial-in number for GoTo
            "accessCode": f"{part1}-{part2}-{part3}",
            "generatedAt": datetime.datetime.now().isoformat()
        }

    def _call_real_goto_api(self, title, start_time_str, end_time_str):
        # 1. Refresh access token
        token_url = "https://api.getgo.com/oauth/v2/token"
        token_data = urllib.parse.urlencode({
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }).encode('utf-8')
        
        req = urllib.request.Request(token_url, data=token_data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req) as resp:
            token_json = json.loads(resp.read().decode('utf-8'))
            access_token = token_json.get("access_token")
            organizer_key = token_json.get("organizer_key")

        # 2. Create Meeting
        create_url = "https://api.getgo.com/G2M/rest/meetings"
        
        # Calculate ISO timestamps
        today = datetime.date.today()
        st_parts = [int(p) for p in start_time_str.split(":")]
        et_parts = [int(p) for p in end_time_str.split(":")]
        st_dt = datetime.datetime(today.year, today.month, today.day, st_parts[0], st_parts[1], 0)
        et_dt = datetime.datetime(today.year, today.month, today.day, et_parts[0], et_parts[1], 0)
        
        payload = {
            "subject": title,
            "starttime": st_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "endtime": et_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "passwordrequired": False,
            "conferencecallinfo": "free",
            "timezonekey": "W. Europe Standard Time",
            "meetingtype": "scheduled"
        }
        
        req_meeting = urllib.request.Request(
            create_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        )
        
        with urllib.request.urlopen(req_meeting) as m_resp:
            m_json = json.loads(m_resp.read().decode('utf-8'))
            # Response is list or dict
            item = m_json[0] if isinstance(m_json, list) else m_json
            return {
                "success": True,
                "mode": "live_api",
                "meetingId": str(item.get("meetingid")),
                "joinUrl": item.get("joinURL"),
                "subject": item.get("subject"),
                "startTime": start_time_str,
                "endTime": end_time_str
            }
