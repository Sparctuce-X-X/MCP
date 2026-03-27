/**
 * Outil MCP "get_forecast" — prévisions météo sur N jours (max 16).
 */

import { z } from "zod";
import { fetchForecast, weatherCodeToDescription } from "../services/weatherService.js";

// Noms des jours en français
const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Formate une date ISO (YYYY-MM-DD) en "Lundi 24 mars"
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  const date = new Date(isoDate + "T12:00:00Z"); // midi UTC pour éviter les décalages TZ
  const jour = JOURS[date.getUTCDay()];
  const mois = date.toLocaleString("fr-FR", { month: "long", timeZone: "UTC" });
  return `${jour} ${date.getUTCDate()} ${mois}`;
}

/**
 * Extrait uniquement l'heure HH:MM depuis un datetime ISO.
 * @param {string} isoDatetime  ex: "2026-03-26T07:23"
 * @returns {string}            ex: "07:23"
 */
function extractTime(isoDatetime) {
  return isoDatetime?.slice(11, 16) ?? "–";
}

/**
 * Enregistre l'outil get_forecast sur un serveur MCP.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 */
export function registerForecastTool(server) {
  server.registerTool(
    "get_forecast",
    {
      title: "Prévisions météo",
      description:
        "Retourne les prévisions météorologiques journalières pour les N prochains jours " +
        "(températures min/max, précipitations, vent, lever/coucher de soleil, conditions). " +
        "Nécessite les coordonnées GPS. Le LLM peut déduire les coordonnées depuis un nom de ville.",
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
        days: z
          .number()
          .int()
          .min(1)
          .max(16)
          .default(5)
          .describe("Nombre de jours de prévision (1 à 16, défaut : 5)"),
      },
    },
    async ({ latitude, longitude, days }) => {
      try {
        const data = await fetchForecast(latitude, longitude, days);
        const d = data.daily;

        // Construire un bloc par jour
        const lignes = d.time.map((date, i) => {
          const label = i === 0 ? "Aujourd'hui" : formatDate(date);
          return [
            `📅 ${label}`,
            `   🌡️  Min ${d.temperature_2m_min[i]}°C / Max ${d.temperature_2m_max[i]}°C`,
            `   ☁️  ${weatherCodeToDescription(d.weather_code[i])}`,
            `   🌧️  Précipitations : ${d.precipitation_sum[i]} mm`,
            `   💨  Vent max : ${d.wind_speed_10m_max[i]} km/h`,
            `   🌅  Lever ${extractTime(d.sunrise[i])} — Coucher ${extractTime(d.sunset[i])}`,
          ].join("\n");
        });

        const text = [
          `📍 Prévisions sur ${days} jour(s) — ${data.timezone}`,
          "",
          ...lignes,
        ].join("\n\n");

        return {
          content: [{ type: "text", text }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erreur lors de la récupération des prévisions : ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
