import urllib.request
import urllib.parse
import http.cookiejar
import ssl
import re
from html import unescape
import datetime

DESK_BASE = "https://www.desk-italia.com/bombolone"

class DeskPortalClient:
    def __init__(self, username="andrea", password="DESKitali@2021"):
        self.username = username
        self.password = password
        self.cj = http.cookiejar.CookieJar()
        self.ctx = ssl._create_unverified_context()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cj),
            urllib.request.HTTPSHandler(context=self.ctx)
        )
        self.opener.addheaders = [
            ('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 agenda2.0')
        ]
        self.logged_in = False

    def login(self):
        login_url = f"{DESK_BASE}/login.php"
        data = urllib.parse.urlencode({
            'username': self.username,
            'password': self.password,
            'sw': 'ok'
        }).encode('utf-8')
        try:
            resp = self.opener.open(login_url, data=data)
            final_url = resp.geturl()
            self.logged_in = "areaRiservata.php" in final_url or "login.php" not in final_url
            return self.logged_in
        except Exception as e:
            print(f"[Portal] Login error: {e}")
            return False

    def ensure_logged_in(self):
        if not self.logged_in:
            return self.login()
        return True

    def get_month_calendar(self, month, year):
        self.ensure_logged_in()
        url = f"{DESK_BASE}/bg/bgcalendario.php"
        data = urllib.parse.urlencode({
            'mese': str(month),
            'anno': str(year)
        }).encode('utf-8')
        try:
            resp = self.opener.open(url, data=data)
            html = resp.read().decode('utf-8', errors='ignore')
            # Extract days with interventions
            days = {}
            matches = re.finditer(r'id="gg(\d+)"[^>]*>.*?class="n_interventi"[^>]*interventitotali="(\d+)"[^>]*>(\d+)<', html, re.DOTALL)
            for m in matches:
                gg = int(m.group(1))
                tot = int(m.group(2))
                count = int(m.group(3))
                days[str(gg)] = {
                    "total": tot,
                    "count": count
                }
            return {"success": True, "month": month, "year": year, "days": days}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_day_events(self, day, month, year, tipo_elenco="singolo"):
        self.ensure_logged_in()
        url = f"{DESK_BASE}/bg/bgeventicalendario.php"
        data = urllib.parse.urlencode({
            'giorno': str(day),
            'mese': str(month),
            'anno': str(year),
            'ninterventi': '10',
            'tipoElenco': tipo_elenco # "singolo" or "globale"
        }).encode('utf-8')
        try:
            resp = self.opener.open(url, data=data)
            html = resp.read().decode('utf-8', errors='ignore')
            appointments = self._parse_events_html(html, tipo_elenco)
            return {
                "success": True,
                "day": day,
                "month": month,
                "year": year,
                "tipoElenco": tipo_elenco,
                "count": len(appointments),
                "appointments": appointments
            }
        except Exception as e:
            return {"success": False, "error": str(e), "appointments": []}

    def _parse_events_html(self, html_content, tipo_elenco):
        appointments = []
        
        # Check if there are technician sections (globale) or single list (singolo)
        segments = re.split(r'(<tr>\s*<td[^>]*class="tdUtenteInterventi"[^>]*>.*?</td>\s*</tr>)', html_content, flags=re.DOTALL)
        current_tech = "Andrea Selvatici" if tipo_elenco == "singolo" else "Assegnato"
        
        for segment in segments:
            tech_match = re.search(r'Elenco Interventi\s*:\s*<b>([^<]+)</b>', segment)
            if tech_match:
                current_tech = tech_match.group(1).strip()
                continue
                
            # Match table rows for interventions (notice <tr ... id="interventoNNN">)
            item_matches = re.finditer(r'<tr\s+[^>]*class="siInternventi"[^>]*id="intervento(\d+)"[^>]*>(.*?)</tr>', segment, flags=re.DOTALL)
            for m in item_matches:
                int_id = m.group(1)
                row_html = m.group(2)
                
                # Orario e colore stato
                time_match = re.search(r'class="dataeora\s+([a-zA-Z]+)">\s*(\d{2}:\d{2})\s+(\d{2}:\d{2})', row_html)
                color = time_match.group(1) if time_match else "giallo"
                start_time = time_match.group(2) if time_match else "09:00"
                end_time = time_match.group(3) if time_match else "12:00"
                
                # Natura (Tec o Com)
                natura_match = re.search(r'class="naturaIntervento">([^<]+)<', row_html)
                natura = natura_match.group(1).strip() if natura_match else "Tec"
                natura_label = "Tecnico" if "tec" in natura.lower() else "Commerciale"
                
                # Dettaglio evento td
                dett_match = re.search(r'class="dettaglioEvento">(.*)$', row_html, flags=re.DOTALL)
                dett_content = dett_match.group(1) if dett_match else ""
                
                # Meccanografico e Scuola
                scuola_match = re.search(r'<b>([A-Z0-9]+)</b>\s*-\s*([^<]+)<br>', dett_content)
                cm_scuola = scuola_match.group(1).strip() if scuola_match else ""
                nome_scuola = unescape(scuola_match.group(2).strip()) if scuola_match else "Intervento"
                
                # Contratto assistenza
                contratto_match = re.search(r'Contratto Assistenza\s*:\s*(SI|NO)', dett_content, flags=re.IGNORECASE)
                contratto = contratto_match.group(1).upper() if contratto_match else "NO"
                
                # Indirizzo (ad es: Piazza del Risorgimento, 46/B - ROMA [])
                addr_match = re.search(r'<br>\s*([^<]+?\s*-\s*[^<]+?(?:\[[^\]]*\])?)<br>', dett_content)
                indirizzo_raw = addr_match.group(1).strip() if addr_match else ""
                
                # Note e descrizione pulita
                # Togliamo i blocchi già estratti
                clean_notes = re.sub(r'<b>[A-Z0-9]+</b>\s*-\s*[^<]+<br>', '', dett_content)
                clean_notes = re.sub(r'<b>\s*Contratto Assistenza\s*:\s*(?:SI|NO)\s*</b><br>', '', clean_notes, flags=re.IGNORECASE)
                if indirizzo_raw:
                    clean_notes = clean_notes.replace(indirizzo_raw, '')
                clean_notes = re.sub(r'<[^>]+>', ' ', clean_notes)
                clean_notes = unescape(clean_notes)
                # Remove excessive whitespace
                clean_notes = re.sub(r'\s+', ' ', clean_notes).strip()
                
                # GoTo Link già presente nelle note?
                goto_match = re.search(r'(https?://(?:global\.)?gotomeeting\.com/join/\d+[-\d]*)', clean_notes)
                existing_goto = goto_match.group(1) if goto_match else None
                
                # Is it explicitly marked as webinar?
                is_webinar = "webinar" in clean_notes.lower() or "online" in clean_notes.lower() or existing_goto is not None
                
                appointments.append({
                    "id": int_id,
                    "startTime": start_time,
                    "endTime": end_time,
                    "statusColor": color,
                    "statusLabel": "Confermato" if color == "giallo" else ("Eseguito" if color == "verde" else "Attenzione"),
                    "nature": natura,
                    "natureLabel": natura_label,
                    "schoolCode": cm_scuola,
                    "schoolName": nome_scuola,
                    "hasContract": contratto == "SI",
                    "address": unescape(indirizzo_raw),
                    "notes": clean_notes,
                    "technician": current_tech,
                    "gotoLink": existing_goto,
                    "isWebinar": is_webinar,
                    "portalUrl": f"{DESK_BASE}/ins_mod_intervento.php?idintervento={int_id}"
                })
                
        return appointments

    def save_goto_link_to_intervention(self, intervention_id, goto_link):
        """
        Updates the intervention detail on Desk Italia by appending the GoTo link
        """
        self.ensure_logged_in()
        fetch_url = f"{DESK_BASE}/ins_mod_intervento.php?idintervento={intervention_id}"
        try:
            resp = self.opener.open(fetch_url)
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Extract form values
            def get_val(name):
                m = re.search(r'name="' + name + r'"[^>]*value="([^"]*)"', html)
                return m.group(1) if m else ""
            
            dett_match = re.search(r'<textarea[^>]*name="dettaglio_intervento"[^>]*>(.*?)</textarea>', html, flags=re.DOTALL)
            current_detail = dett_match.group(1) if dett_match else ""
            
            # Append GoTo link if not already inside
            if goto_link not in current_detail:
                new_detail = f"{current_detail.strip()}\n\nLINK GOTO MEETING:\n{goto_link}".strip()
            else:
                new_detail = current_detail
                
            post_data = {
                'intitolazione_scuola': get_val('intitolazione_scuola'),
                'cm_scuola': get_val('cm_scuola'),
                'cf_scuola': get_val('cf_scuola'),
                'indirizzo_scuola': get_val('indirizzo_scuola'),
                'comune_scuola': get_val('comune_scuola'),
                'provincia_scuola': get_val('provincia_scuola'),
                'id_scuola': get_val('id_scuola'),
                'utente': get_val('utente'),
                'data_intervento_gg': get_val('data_intervento_gg'),
                'data_intervento_mm': get_val('data_intervento_mm'),
                'data_intervento_aa': get_val('data_intervento_aa'),
                'ora_inizio_intervento': get_val('ora_inizio_intervento'),
                'mm_inizio_intervento': get_val('mm_inizio_intervento'),
                'ora_fine_intervento': get_val('ora_fine_intervento'),
                'mm_fine_intervento': get_val('mm_fine_intervento'),
                'tipo_scheda': get_val('tipo_scheda'),
                'natura_intervento': get_val('natura_intervento'),
                'dettaglio_intervento': new_detail,
                'stato_intervento': get_val('stato_intervento'),
                'tipo_operazione': 'modifica',
                'controllo_submit': 'on',
                'id_intervento': str(intervention_id)
            }
            
            submit_data = urllib.parse.urlencode(post_data).encode('utf-8')
            submit_resp = self.opener.open(f"{DESK_BASE}/ins_mod_intervento.php", data=submit_data)
            return {"success": True, "saved": True, "newDetail": new_detail}
        except Exception as e:
            return {"success": False, "error": str(e)}
