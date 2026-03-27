/**
 * Service météo — encapsule l'appel à l'API Open-Meteo
 * et la logique de décodage des codes météo.
 */

const WEATHER_CODES = {
  0: "Ciel dégagé",
  1: "Principalement dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine modérée",
  55: "Bruine dense",
  61: "Pluie légère",
  63: "Pluie modérée",
  65: "Pluie forte",
  71: "Neige légère",
  73: "Neige modérée",
  75: "Neige forte",
  80: "Averses légères",
  81: "Averses modérées",
  82: "Averses violentes",
  95: "Orage",
  96: "Orage avec grêle légère",
  99: "Orage avec grêle forte",
};

/**
 * Traduit un code météo WMO en description lisible.
 * @param {number} code
 * @returns {string}
 */
export function weatherCodeToDescription(code) {
  return WEATHER_CODES[code] ?? `Code météo inconnu (${code})`;
}

/**
 * Récupère les prévisions quotidiennes sur N jours depuis l'API Open-Meteo.
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} days  Nombre de jours (1–16)
 * @returns {Promise<object>} Données brutes de l'API
 */
export async function fetchForecast(latitude, longitude, days = 5) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset"
  );
  url.searchParams.set("forecast_days", days.toString());
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur API Open-Meteo : ${response.status}`);
  }
  return response.json();
}

/**
 * Récupère les données météo actuelles depuis l'API Open-Meteo.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>} Données brutes de l'API
 */
export async function fetchWeather(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code"
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur API Open-Meteo : ${response.status}`);
  }
  return response.json();
}
