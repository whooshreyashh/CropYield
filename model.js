/* model.js
   Contains mock logic for predicting yield (simple formula) and generating AI-style summaries.
   Works fully offline.
*/

const Model = (() => {
  // Baseline yields (tons/ha) for each crop
  const baseline = {
    Wheat: 3.0,
    Rice: 4.0,
    Maize: 5.0,
    Soybean: 2.2,
    Cotton: 1.5
  };

  // --- Mock ML Yield Prediction ---
  function predict({ crop, rainfall, temp, soil, fert, weather }) {
    const base = baseline[crop] || 2.5;

    // Rainfall factor: ideal range around 200 mm
    const rfIdeal = 200;
    const rfFactor = 1 - Math.abs(rainfall - rfIdeal) / Math.max(rfIdeal, 1) * 0.5;

    // Temperature factor: optimal around 25°C
    const tIdeal = 25;
    const tFactor = 1 - Math.max(0, Math.abs(temp - tIdeal) - 3) / 40;

    // Soil quality factor (0–100 → 0.5 – 1.3)
    const soilFactor = 0.5 + (soil / 100) * 0.8;

    // Fertilizer factor (diminishing returns)
    const fertFactor = 1 + Math.min(200, fert) / 300;

    // Optional weather adjustment (rain bonus)
    let rainAdj = 1;
    if (weather && weather.rain !== null) {
      rainAdj = 1 + Math.min(200, weather.rain) / 500;
    }

    // Compose prediction
    let predicted = base * rfFactor * tFactor * soilFactor * fertFactor * rainAdj;

    // Clamp to positive values & round
    predicted = Math.max(0.1, predicted);
    predicted = Math.round(predicted * 100) / 100;
    return predicted;
  }

  // --- AI Summary Generation (Offline Heuristics) ---
  function generateSummary({ rainfall, temp, soil, fert, weather }) {
    const parts = [];

    if (rainfall < 50) parts.push("Low rainfall may reduce yield potential.");
    else if (rainfall > 350) parts.push("Excessive rainfall could cause waterlogging issues.");
    else parts.push("Rainfall levels look suitable for crop growth.");

    if (temp > 35) parts.push("High temperature could stress the crop and lower yield.");
    else if (temp < 10) parts.push("Low temperatures may slow crop development.");
    else parts.push("Temperature falls within an optimal range.");

    if (soil < 40) parts.push("Soil quality is low — consider organic amendments or compost.");
    else parts.push("Soil quality appears sufficient for good yield.");

    if (fert < 50) parts.push("Fertilizer usage seems low; balanced nutrients may improve yield.");
    else if (fert > 300) parts.push("Fertilizer usage is high — check for diminishing returns or runoff.");

    if (weather && weather.humidity) {
      if (weather.humidity < 30) parts.push("Low humidity may increase water loss through evapotranspiration.");
      else if (weather.humidity > 85) parts.push("High humidity may encourage diseases — monitor crop health.");
    }

    return parts.slice(0, 3).join(" ");
  }

  return { predict, generateSummary };
})();

window.Model = Model;
