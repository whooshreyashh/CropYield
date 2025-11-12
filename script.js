/* script.js
   Handles map selection, weather fetch, model prediction,
   AI summary generation, localStorage history, and navigation.
*/

// === CONFIG ===
const OWM_API_KEY = "80d99cf3b42e21f2bf6fe272a24a1f14"; // Add your key here
const useOnlineAI = false; // true = integrate AI API manually
// =================

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

const isResultPage = location.pathname.includes("result.html");

// ===============================
// INDEX PAGE LOGIC
// ===============================
if (!isResultPage) {
  document.addEventListener("DOMContentLoaded", () => {
    // Initialize Leaflet map
    const map = L.map("map").setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    let marker = null;

    // Handle map click for region selection
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      if (marker) marker.setLatLng(e.latlng);
      else marker = L.marker(e.latlng).addTo(map);

      qs("#locationDisplay").value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      showLoading(true, "Fetching weather...");
      const weather = await fetchWeather(lat, lng);
      showLoading(false);

      if (weather) {
        qs("#rainfall").value = weather.rain ?? qs("#rainfall").value;
        qs("#temp").value = weather.temp;
      }
    });

    // Preview previous predictions
    refreshHistoryPreview();

    // History button
    qs("#historyBtn").addEventListener("click", () => {
      const hist = JSON.parse(localStorage.getItem("crop_history") || "[]");
      if (hist.length === 0) alert("No saved predictions yet.");
      else {
        const list = hist.map(h => `${h.date} • ${h.crop} • ${h.pred} t/ha`).join("\n");
        alert("Saved Predictions:\n\n" + list);
      }
    });

    // Predict button
    qs("#predictForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      showLoading(true, "Predicting...");

      const payload = collectForm();

      // If lat/lng exists but missing temp/rain, auto-fetch weather
      if (payload.lat && (!payload.temp || !payload.rainfall)) {
        const w = await fetchWeather(payload.lat, payload.lng);
        if (w) payload.weather = w;
      }

      const predicted = window.Model.predict(payload);
      const summary = window.Model.generateSummary(payload);

      // Store result temporarily
      const resultObj = { ...payload, pred: predicted, summary, date: new Date().toLocaleString() };
      sessionStorage.setItem("last_prediction", JSON.stringify(resultObj));

      // Save to history
      const hist = JSON.parse(localStorage.getItem("crop_history") || "[]");
      hist.unshift({ crop: payload.crop, pred: predicted, date: resultObj.date });
      localStorage.setItem("crop_history", JSON.stringify(hist.slice(0, 50)));

      showLoading(false);
      location.href = "result.html";
    });
  });

  // ===== Helper Functions =====
  async function fetchWeather(lat, lng) {
    if (!OWM_API_KEY || OWM_API_KEY.includes("PUT_YOUR")) return null;
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OWM_API_KEY}`;
      const res = await fetch(url);
      const d = await res.json();
      const rain = d.rain ? (d.rain["1h"] || d.rain["3h"]) : null;
      return { temp: Math.round(d.main.temp * 10) / 10, humidity: d.main.humidity, rain };
    } catch (err) {
      console.warn("Weather fetch failed", err);
      return null;
    }
  }

  function collectForm() {
    const crop = qs("#crop").value;
    const rainfall = parseFloat(qs("#rainfall").value) || 0;
    const temp = parseFloat(qs("#temp").value) || 25;
    const soil = parseFloat(qs("#soil").value) || 50;
    const fert = parseFloat(qs("#fert").value) || 100;
    const loc = qs("#locationDisplay").value || "";
    let lat = null, lng = null;
    if (loc.includes(",")) {
      const parts = loc.split(",").map(s => s.trim());
      lat = parseFloat(parts[0]); lng = parseFloat(parts[1]);
    }
    return { crop, rainfall, temp, soil, fert, lat, lng, weather: null };
  }

  function showLoading(show, msg) {
    const el = qs("#loading");
    if (!el) return;
    if (show) {
      el.classList.remove("hidden");
      el.textContent = msg || "Loading...";
    } else {
      el.classList.add("hidden");
    }
  }

  function refreshHistoryPreview() {
    const pr = qs("#historyPreview");
    const hist = JSON.parse(localStorage.getItem("crop_history") || "[]");
    if (hist.length === 0) {
      pr.innerHTML = '<p class="small-note">No saved predictions yet.</p>';
    } else {
      pr.innerHTML = "<ul>" + hist.slice(0, 5)
        .map(h => `<li>${h.date.split(",")[0]} • <strong>${h.crop}</strong> — ${h.pred} t/ha</li>`).join("") + "</ul>";
    }
  }
}

// ===============================
// RESULT PAGE LOGIC
// ===============================
else {
  document.addEventListener("DOMContentLoaded", () => {
    const dataRaw = sessionStorage.getItem("last_prediction");
    if (!dataRaw) {
      const hist = JSON.parse(localStorage.getItem("crop_history") || "[]");
      if (hist.length === 0) return;
      const f = hist[0];
      qs("#predictedText").textContent = f.pred;
      qs("#aiSummary").textContent = "Loaded from history.";
      return;
    }

    const payload = JSON.parse(dataRaw);
    renderResult(payload);
    qs("#backHome").addEventListener("click", () => location.href = "index.html");
  });

  function renderResult(payload) {
    // Dynamic crop background
    const bgMap = {
      Rice: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&h=900&q=60",
      Wheat: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&h=900&q=60",
      Maize: "https://images.unsplash.com/photo-1501005771327-2cf4c8f4a6b4?auto=format&fit=crop&w=1600&h=900&q=60",
      Soybean: "https://images.unsplash.com/photo-1599058917215-d6221f5f7d3e?auto=format&fit=crop&w=1600&h=900&q=60",
      Cotton: "https://images.unsplash.com/photo-1580910051071-3f2c2956c7f3?auto=format&fit=crop&w=1600&h=900&q=60"
    };

    const wrapper = document.getElementById("resultWrapper");
    const bg = bgMap[payload.crop] || bgMap["Wheat"];
    wrapper.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.9)), url(${bg})`;
    wrapper.style.backgroundSize = "cover";
    wrapper.style.backgroundPosition = "center";

    qs("#resultCrop").textContent = `${payload.crop} • ${payload.date}`;
    qs("#predictedText").textContent = `${payload.pred} t/ha`;
    qs("#predictedSub").textContent = `${payload.pred} tons / hectare`;

    // AI Summary
    const aiEl = qs("#aiSummary");
    if (useOnlineAI)
      aiEl.textContent = "Online AI mode enabled — connect to your API in script.js.";
    else
      aiEl.textContent = payload.summary || window.Model.generateSummary(payload);

    // Charts using Chart.js
    const lineCtx = document.getElementById("lineChart");
    const barCtx = document.getElementById("barChart");
    const radarCtx = document.getElementById("radarChart");

    const rVals = [Math.max(0, payload.rainfall - 50), payload.rainfall, payload.rainfall + 50];
    const yieldVals = rVals.map(r => window.Model.predict({ ...payload, rainfall: r }));

    new Chart(lineCtx, {
      type: "line",
      data: { labels: ["Low", "Current", "High"], datasets: [{ label: "Rainfall vs Yield", data: yieldVals, tension: 0.3 }] },
      options: { responsive: true }
    });

    const fVals = [Math.max(0, payload.fert - 50), payload.fert, payload.fert + 100];
    const fertVals = fVals.map(f => window.Model.predict({ ...payload, fert: f }));

    new Chart(barCtx, {
      type: "bar",
      data: { labels: ["Low", "Current", "High"], datasets: [{ label: "Fertilizer vs Yield", data: fertVals }] },
      options: { responsive: true }
    });

    new Chart(radarCtx, {
      type: "radar",
      data: {
        labels: ["Soil", "Rainfall", "Temperature", "Fertilizer"],
        datasets: [{ label: "Input Comparison", data: [payload.soil, payload.rainfall, payload.temp, payload.fert] }]
      },
      options: { responsive: true }
    });

    // Show saved history
    const saved = JSON.parse(localStorage.getItem("crop_history") || "[]");
    const sl = qs("#savedList");
    sl.innerHTML = saved.map(s =>
      `<div class="card"><strong>${s.crop}</strong> — ${s.pred} t/ha <span class="muted">(${s.date || ""})</span></div>`
    ).join("");
  }
}
