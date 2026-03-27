#!/usr/bin/env node

/**
 * Point d'entrée du serveur MCP météo.
 * Supporte deux modes de transport via la variable d'environnement MCP_TRANSPORT :
 *   - "stdio" (défaut) : communication par stdin/stdout, utilisé par Claude Desktop
 *   - "http"           : serveur Express sur HTTP_PORT (défaut 3000), utilisé par les clients HTTP
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createServer } from "./server.js";

const HTTP_PORT = parseInt(process.env.HTTP_PORT ?? "3000", 10);

// ─── Transport STDIO ─────────────────────────────────────────────────────────

async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Serveur MCP météo démarré (transport stdio)");
}

// ─── Transport HTTP ───────────────────────────────────────────────────────────

async function startHttp() {
  const app = express();
  app.use(express.json());

  /**
   * POST /mcp — point d'entrée unique pour les messages MCP.
   * Une nouvelle instance serveur + transport est créée par requête (mode stateless),
   * ce qui permet de gérer plusieurs clients simultanément sans état partagé.
   */
  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless : pas de session persistante
    });

    // Nettoyage du transport à la fermeture de la connexion
    res.on("close", () => transport.close());

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Toute autre méthode sur /mcp → erreur explicite
  app.all("/mcp", (_req, res) => {
    res.status(405).json({ error: "Méthode non supportée. Utilisez POST /mcp." });
  });

  // Route de santé optionnelle
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "weather-mcp-server", version: "1.0.0" });
  });

  app.listen(HTTP_PORT, () => {
    console.error(`✅ Serveur MCP météo démarré (transport HTTP sur le port ${HTTP_PORT})`);
    console.error(`   → POST http://localhost:${HTTP_PORT}/mcp`);
    console.error(`   → GET  http://localhost:${HTTP_PORT}/health`);
  });
}

// ─── Démarrage ────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.env.MCP_TRANSPORT ?? "stdio";

  if (mode === "http") {
    await startHttp();
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error("❌ Erreur fatale :", error);
  process.exit(1);
});
