# 📅 agenda2.0

> **Webapp Mobile-First per la gestione degli interventi Desk Italia e la generazione istantanea di stanze GoTo Meeting.**

---

## ✨ Caratteristiche Principali

* 📱 **Mobile-First con Apple Glass Design & Material 3:**
  * Schede traslucide in vetro satinato (*frosted glass*), angoli arrotondati ultra-fluidi, ombre morbide e colori freschi e chiari.
  * Barra di navigazione inferiore ergonomica a portata di pollice (*Thumb-friendly*).
  * Design reattivo per desktop: si trasforma in una dashboard a due colonne con calendario interattivo e statistiche.
* 🏢 **Integrazione Completa Portale Desk Italia:**
  * Sincronizzazione automatica degli appuntamenti giornalieri e mensili.
  * Switch con 1 tap tra **"👤 I Miei Interventi"** (Andrea Selvatici) e **"🌐 Tutti i Tecnici"** (Azienda, Bancone, Moscardini, Riccioni, ecc.).
  * Riconoscimento intelligente di:
    * Codice Meccanografico scuola (con copia rapida).
    * Stato / Colore intervento (Giallo = Confermato, Verde = Eseguito, Rosso = Attenzione/Occupata).
    * Natura dell'intervento (Tecnico 🔧 vs Commerciale 💼).
    * Presenza Contratto di Assistenza (`SI` / `NO`).
    * Indirizzo con link rapido ad **Apple Maps** / **Google Maps**.
    * Note e dettagli evidenziati (es. `WEBINAR`, `DM 219`, `TAGLIANDO`, `PASSWEB`).
* 📹 **Hub GoTo Meeting Integrato:**
  * **Genera GoTo Meeting con 1 tap:** crea all'istante il link della stanza associato all'appuntamento.
  * **Copia link rapida:** con notifica toast su schermo.
  * **Avvia Riunione:** apre direttamente la stanza GoTo.
  * **💬 Condividi su WhatsApp:** apre WhatsApp con messaggio precompilato e professionale pronto per la scuola/cliente.
  * **💾 Salva su Portale Desk Italia:** con un tap salva il link generato direttamente nelle note dell'intervento sul portale aziendale.
* 📲 **PWA (Progressive Web App):**
  * Icona ad alta risoluzione, manifest e service worker per il salvataggio sulla schermata Home dello smartphone come una vera app nativa a schermo intero.
  * Cache offline: carica istantaneamente gli appuntamenti anche in assenza temporanea di rete.

---

## 🚀 Come provarla subito sul tuo Mac / Rete Locale

Il server locale è già pronto e non richiede nessuna installazione esterna (gira direttamente con Python 3):

```bash
python3 server.py
```

* **Sul tuo computer:** apri nel browser `http://localhost:3000`
* **Dal tuo smartphone (stesso Wi-Fi):** apri `http://<IL_TUO_IP_LOCALE>:3000`

---

## ☁️ Deploy Online 24/7 (Senza PC Acceso) con Vercel

Per avere **agenda2.0** sempre attiva e accessibile ovunque dal tuo telefono a PC spento con dominio sicuro HTTPS (es. `https://agenda2-italia.vercel.app`):

### Opzione 1: Con la CLI di Vercel (1 minuto)
1. Installa Vercel CLI (oppure usa l'interfaccia web di Vercel):
   ```bash
   npm i -g vercel  # oppure brew install vercel
   vercel
   ```
2. Segui le istruzioni guidate a schermo (premi Invio per confermare i default).
3. Riceverai subito il link pubblico online 24/7!

### Opzione 2: Con GitHub (Consigliata)
1. Crea un repository GitHub (es. `agenda2.0`) e carica questa cartella:
   ```bash
   git init
   git add .
   git commit -m "feat: agenda2.0 mobile-first app"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/agenda2.0.git
   git push -u origin main
   ```
2. Vai su [vercel.com](https://vercel.com) e accedi con GitHub.
3. Clicca su **"Add New Project"** e seleziona `agenda2.0`.
4. Clicca su **"Deploy"**: Vercel leggerà automaticamente il file `vercel.json` e la cartella `api/` distribuendo il sito globalmente su CDN e funzioni serverless gratuite.

---

## 📱 Come aggiungerla alla Schermata Home dello Smartphone

* **Su iPhone (Safari):**
  1. Apri l'indirizzo del sito (es. `https://tua-agenda.vercel.app`).
  2. Tocca l'icona di **Condivisione** (il quadrato con la freccia in su in basso).
  3. Scorri e tocca **"Aggiungi alla schermata Home"**.
  4. Tocca **Aggiungi**: apparirà l'icona di **agenda2.0** con il logo ufficiale e si aprirà come un'app nativa senza barre del browser!

* **Su Android (Chrome):**
  1. Apri l'indirizzo del sito.
  2. Tocca i tre puntini in alto a destra.
  3. Tocca **"Aggiungi a schermata Home"** o **"Installa app"**.
