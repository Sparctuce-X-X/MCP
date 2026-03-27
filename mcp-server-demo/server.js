/**
 * Fabrique de serveur MCP.
 * Crée une nouvelle instance McpServer et y enregistre tous les outils.
 * Exporté comme factory (et non comme singleton) pour permettre
 * la création d'une instance par requête HTTP (mode stateless).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWeatherTool } from "./tools/weatherTool.js";
import { registerForecastTool } from "./tools/forecastTool.js";

/**
 * Crée et retourne un serveur MCP prêt à être connecté à un transport.
 * @returns {McpServer}
 */
export function createServer() {
  const server = new McpServer({
    name: "weather-mcp-server",
    version: "1.0.0",
  });

  // Enregistrement des outils
  registerWeatherTool(server);
  registerForecastTool(server);

  return server;
}
