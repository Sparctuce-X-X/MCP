# Weather MCP Server

Serveur [MCP (Model Context Protocol)](https://modelcontextprotocol.io) qui expose des outils météo à un LLM (Claude, etc.).
Données fournies par [Open-Meteo](https://open-meteo.com/) — API gratuite, sans clé.

---

## Fonctionnalités

| Outil | Description |
|-------|-------------|
| `get_weather` | Météo actuelle : température, ressenti, humidité, vent, conditions |
| `get_forecast` | Prévisions quotidiennes sur 1 à 16 jours : min/max, précipitations, vent, lever/coucher du soleil |

---

## Structure du projet

```
mcp-server-demo/
├── index.js                  # Point d'entrée — démarre le transport (HTTP ou stdio)
├── server.js                 # Factory createServer() — instancie et configure le serveur MCP
├── services/
│   └── weatherService.js     # Appels API Open-Meteo + décodage des codes météo WMO
└── tools/
    ├── weatherTool.js        # Enregistrement de l'outil get_weather
    └── forecastTool.js       # Enregistrement de l'outil get_forecast
```

---

## Installation

```bash
git clone <url-du-repo>
cd mcp-server-demo
npm install
```

---

## Utilisation

### Mode HTTP

Le mode par défaut. Le serveur démarre un serveur Express. Chaque requête `POST /mcp` est traitée de façon **stateless** (une instance MCP par requête).

```bash
npm start
# → http://localhost:3000
```

Port personnalisé :

```bash
HTTP_PORT=8080 npm run start:http:port
# → http://localhost:8080
```

**Variables d'environnement**

| Variable | Valeur | Défaut |
|----------|--------|--------|
| `MCP_TRANSPORT` | `http` \| `stdio` | `http` |
| `HTTP_PORT` | numéro de port | `3000` |

---

### Mode stdio (Claude Desktop)

Pour forcer le mode `stdio` (par exemple avec Claude Desktop), définissez `MCP_TRANSPORT=stdio`.

```bash
MCP_TRANSPORT=stdio npm start
```

**Configuration Claude Desktop** — éditer `~/Library/Application Support/Claude/claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/chemin/absolu/vers/mcp-server-demo/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

---

## Routes HTTP

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/mcp` | Point d'entrée MCP (JSON-RPC 2.0) |
| `GET` | `/health` | Vérification que le serveur est en ligne |

> **Important :** les requêtes vers `/mcp` doivent inclure l'en-tête :
> ```
> Accept: application/json, text/event-stream
> ```

---

## Exemples curl

### Santé du serveur

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "server": "weather-mcp-server", "version": "1.0.0" }
```

---

### Lister les outils disponibles

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

### Météo actuelle — Paris

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {
        "latitude": 48.85,
        "longitude": 2.35
      }
    }
  }'
```

**Réponse :**
```
🌡️ Température : 14°C
🤔 Ressenti : 12°C
💧 Humidité : 68%
💨 Vent : 18 km/h
☁️ Conditions : Partiellement nuageux
📍 Coordonnées : 48.85, 2.35
🕐 Fuseau horaire : Europe/Paris
```

---

### Prévisions 5 jours — Paris

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_forecast",
      "arguments": {
        "latitude": 48.85,
        "longitude": 2.35,
        "days": 5
      }
    }
  }'
```

**Réponse :**
```
📍 Prévisions sur 5 jour(s) — Europe/Paris

📅 Aujourd'hui
   🌡️  Min 8°C / Max 15°C
   ☁️  Partiellement nuageux
   🌧️  Précipitations : 0.2 mm
   💨  Vent max : 22 km/h
   🌅  Lever 07:23 — Coucher 19:41

📅 Vendredi 27 mars
   🌡️  Min 7°C / Max 17°C
   ☁️  Ciel dégagé
   🌧️  Précipitations : 0.0 mm
   💨  Vent max : 14 km/h
   🌅  Lever 07:21 — Coucher 19:43

...
```

Le paramètre `days` accepte une valeur de **1 à 16**.

---

## Architecture

### Flux stdio

```
Claude Desktop
    │  stdin/stdout
    ▼
index.js (StdioServerTransport)
    │
    ▼
server.js → createServer()
    ├── tools/weatherTool.js  →  get_weather
    └── tools/forecastTool.js →  get_forecast
              │
              ▼
    services/weatherService.js
        ├── fetchWeather()
        ├── fetchForecast()
        └── weatherCodeToDescription()
              │
              ▼
    API Open-Meteo (HTTPS)
```

### Flux HTTP

```
Client HTTP
    │  POST /mcp
    ▼
index.js (Express)
    │  nouvelle instance par requête
    ▼
StreamableHTTPServerTransport
    │
    ▼
server.js → createServer()  (même pipeline que stdio)
```

> Chaque requête HTTP crée une **nouvelle instance** de `McpServer` + `StreamableHTTPServerTransport`. Cela permet de gérer plusieurs clients simultanément sans état partagé (architecture stateless).

---

## Dépendances

| Package | Rôle |
|---------|------|
| `@modelcontextprotocol/sdk` | Implémentation du protocole MCP |
| `express` | Serveur HTTP pour le transport HTTP |
| `zod` | Validation des paramètres d'entrée des outils |
