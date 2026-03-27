/**
 * Outil MCP "get_weather" — enregistre le tool sur l'instance serveur reçue.
 * Séparé du service : il ne sait pas comment récupérer les données,
 * il sait seulement comment les exposer via le protocole MCP.
 */

import { z } from "zod";
import { fetchWeather, weatherCodeToDescription } from "../services/weatherService.js";

/**
 * Enregistre l'outil get_weather sur un serveur MCP.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 */
export function registerWeatherTool(server) {
  server.registerTool(
    "get_weather",
    {
      title: "Météo actuelle",
      description:
        "Récupère les conditions météorologiques actuelles pour un lieu donné " +
        "(température, humidité, vent, conditions). " +
        "Nécessite les coordonnées GPS (latitude/longitude). " +
        "Le LLM peut déduire les coordonnées à partir d'un nom de ville.",
      inputSchema: {
        latitude: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude du lieu (ex: 48.85 pour Paris)"),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude du lieu (ex: 2.35 pour Paris)"),
      },
    },
    async ({ latitude, longitude }) => {
      try {
        const data = await fetchWeather(latitude, longitude);
        const current = data.current;

        const result = [
          `🌡️ Température : ${current.temperature_2m}°C`,
          `🤔 Ressenti : ${current.apparent_temperature}°C`,
          `💧 Humidité : ${current.relative_humidity_2m}%`,
          `💨 Vent : ${current.wind_speed_10m} km/h`,
          `☁️ Conditions : ${weatherCodeToDescription(current.weather_code)}`,
          `📍 Coordonnées : ${latitude}, ${longitude}`,
          `🕐 Fuseau horaire : ${data.timezone}`,
        ].join("\n");

        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erreur lors de la récupération météo : ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
