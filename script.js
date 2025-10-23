// HTML Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const cityImage = document.getElementById('city-img');
const cityWeatherImage = document.getElementById('city-weather-img');
const statusText = document.getElementById('status-text');
const cityName = document.getElementById('city-name');
const temperature = document.getElementsByClassName('temperature');
const weatherDescription = document.getElementsByClassName('weather-description');
const humidity = document.getElementsByClassName('humidity');
const windSpeed = document.getElementsByClassName('wind-speed');
const feelsLike = document.getElementsByClassName('feels-like');
const tempMin = document.getElementsByClassName('temp-min');
const tempMax = document.getElementsByClassName('temp-max');
const pressure = document.getElementsByClassName('pressure');
const visibility = document.getElementsByClassName('visibility');
const cloudiness = document.getElementsByClassName('cloudiness');
const windDirection = document.getElementsByClassName('wind-direction');
const sunriseEls = document.getElementsByClassName('sunrise');
const sunsetEls = document.getElementsByClassName('sunset');
const tempUnitEls = document.getElementsByClassName('temp-unit');

// Search button UI parts for loading state
const searchBtnSpinner = document.querySelector('#search-button .spinner-border');
const searchBtnLabel = document.querySelector('#search-button .btn-label');

function setSearching(isLoading) {
    if (!searchButton || !searchInput) return;
    searchButton.disabled = isLoading;
    searchInput.disabled = isLoading;
    if (searchBtnSpinner) searchBtnSpinner.classList.toggle('d-none', !isLoading);
    if (searchBtnLabel) searchBtnLabel.classList.toggle('d-none', isLoading);
}

function removeFavorite(city) {
  try {
    let list = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!Array.isArray(list)) list = [];
    const target = (city || '').trim().toLowerCase();
    if (!target) return;
    const next = list.filter(c => (c || '').toLowerCase() !== target);
    localStorage.setItem('favorites', JSON.stringify(next));
    loadFavorites();
  } catch {}
}

// Units toggle, favorites, and autocomplete elements
const unitCBtn = document.getElementById('unit-c');
const unitFBtn = document.getElementById('unit-f');
const favoritesSelect = document.getElementById('favorites-select');
const addFavoriteBtn = document.getElementById('add-favorite');
const deleteFavoriteBtn = document.getElementById('delete-favorite');
const autocompleteList = document.getElementById('autocomplete-list');

// App state
let currentUnits = localStorage.getItem('units') || 'metric'; // 'metric' or 'imperial'
let currentCity = '';
let currentCoords = null; // { lat, lon }

function applyUnitsUI() {
  if (unitCBtn && unitFBtn) {
    const cActive = currentUnits === 'metric';
    unitCBtn.classList.toggle('active', cActive);
    unitFBtn.classList.toggle('active', !cActive);
  }
  // Update unit labels immediately (will refetch shortly as well)
  for (let i = 0; i < tempUnitEls.length; i++) {
    tempUnitEls[i].textContent = currentUnits === 'metric' ? 'C' : 'F';
  }
}

function getUnitsParam() {
  return currentUnits; // OWM expects 'metric' or 'imperial'
}

function setUnits(units) {
  currentUnits = units;
  localStorage.setItem('units', currentUnits);
  applyUnitsUI();
  // Refetch for current city or coords to get proper units
  if (currentCoords) {
    getWeather(currentCoords.lat, currentCoords.lon);
  } else if (currentCity) {
    fetchWeatherData(currentCity);
  }
}

function loadFavorites() {
  try {
    let list = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!Array.isArray(list)) list = [];
    // Deduplicate case-insensitive and sort
    const dedup = Array.from(new Map(list.map(c => [c.toLowerCase(), c])).values()).sort();
    if (favoritesSelect) {
      favoritesSelect.innerHTML = '<option value="" selected>Favorites</option>' +
        dedup.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    // Save back normalized list
    localStorage.setItem('favorites', JSON.stringify(dedup));
  } catch {
    if (favoritesSelect) favoritesSelect.innerHTML = '<option value="" selected>Favorites</option>';
  }
}

function addFavorite(city) {
  if (!city) return;
  const name = city.trim();
  if (!name) return;
  try {
    let list = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!Array.isArray(list)) list = [];
    const exists = list.some(c => (c || '').toLowerCase() === name.toLowerCase());
    if (!exists) {
      list.push(name);
      localStorage.setItem('favorites', JSON.stringify(list));
      loadFavorites();
    }
  } catch {
    localStorage.setItem('favorites', JSON.stringify([name]));
    loadFavorites();
  }
}

// Debounce utility
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

async function fetchSuggestions(q) {
  if (!q) { renderSuggestions([]); return; }
  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${WEATHER_API_KEY}`);
    const data = await res.json();
    const items = (Array.isArray(data) ? data : []).map(item => ({
      name: item.name,
      state: item.state || '',
      country: item.country || '',
      lat: item.lat,
      lon: item.lon
    }));
    renderSuggestions(items);
  } catch {
    renderSuggestions([]);
  }
}

function renderSuggestions(items) {
  if (!autocompleteList) return;
  if (!items.length) { autocompleteList.innerHTML = ''; return; }
  autocompleteList.innerHTML = items.map((it, idx) => `
    <button type="button" class="autocomplete-item list-group-item list-group-item-action" data-lat="${it.lat}" data-lon="${it.lon}" data-name="${it.name}">
      ${it.name}${it.state ? ', ' + it.state : ''}${it.country ? ', ' + it.country : ''}
    </button>
  `).join('');
}

function degToCompass(num) {
    if (typeof num !== 'number') return '--';
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    return arr[(val % 16)] + ` (${num}°)`;
}

function formatTimeLocal(unixSeconds, tzOffsetSeconds) {
    if (!unixSeconds || typeof tzOffsetSeconds !== 'number') return '--';
    const date = new Date((unixSeconds + tzOffsetSeconds) * 1000);
    return date.toUTCString().slice(17, 22); // HH:MM
}

// ---------------- Theme Toggle ----------------
const themeToggleBtn = document.getElementById('theme-toggle');
function isDarkTheme() {
  return document.documentElement.classList.contains('dark-theme');
}
function getChartTheme() {
  const dark = isDarkTheme();
  return {
    grid: dark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.2)',
    ticks: dark ? '#e2e8f0' : '#0f172a',
  };
}
function updateChartTheme() {
  const theme = getChartTheme();
  if (window._hourlyChart) {
    window._hourlyChart.options.scales.x.ticks = { color: theme.ticks };
    window._hourlyChart.options.scales.y.ticks = { color: theme.ticks };
    window._hourlyChart.options.scales.x.grid = { display: false };
    window._hourlyChart.options.scales.y.grid = { color: theme.grid };
    window._hourlyChart.update();
  }
  if (window._dailyChart) {
    window._dailyChart.options.scales.x.ticks = { color: theme.ticks };
    window._dailyChart.options.scales.y.ticks = { color: theme.ticks };
    window._dailyChart.options.scales.x.grid = { display: false };
    window._dailyChart.options.scales.y.grid = { color: theme.grid };
    window._dailyChart.update();
  }
}
function updateThemeToggleUI() {
  if (!themeToggleBtn) return;
  const isDark = document.documentElement.classList.contains('dark-theme');
  themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  themeToggleBtn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  themeToggleBtn.setAttribute('aria-label', themeToggleBtn.title);
}
function applyThemeFromStorage() {
  let t = localStorage.getItem('theme');
  if (!t) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    t = prefersDark ? 'dark' : 'light';
    localStorage.setItem('theme', t);
  }
  document.documentElement.classList.toggle('dark-theme', t === 'dark');
  updateThemeToggleUI();
  updateChartTheme();
}
function setTheme(t) {
  localStorage.setItem('theme', t);
  document.documentElement.classList.toggle('dark-theme', t === 'dark');
  updateThemeToggleUI();
  updateChartTheme();
}
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    setTheme(isDark ? 'light' : 'dark');
  });
}

// API Keys
const WEATHER_API_KEY = "55bf45e7fef414c6fef3596eb6df0fbd";
const UNSPLASH_ACCESS_KEY = "o94Yz3KJhOMagWX5xQDE_x5gF2HXqw_o0NPQ6l1VZ5Y";

// Get Location Weather on Load
window.onload = () => {
    applyUnitsUI();
    loadFavorites();
    applyThemeFromStorage();
    navigator.geolocation.getCurrentPosition(
        pos => getWeather(pos.coords.latitude, pos.coords.longitude),
        () => {/* silently ignore; user can search */}
    );
};

// Fetch Weather by Coordinates
function getWeather(lat, lon) {
    currentCoords = { lat, lon };
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=${getUnitsParam()}`)
        .then(res => res.json())
        .then(data => updateUI(data))
        .catch(() => errorUpdates());
    // Fetch extended data in parallel
    fetchForecast(lat, lon).catch(()=>{});
    fetchAQI(lat, lon).catch(()=>{});
}

// Fetch Weather by City Name
async function fetchWeatherData(city) {
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=${getUnitsParam()}`);
        if (!res.ok) throw new Error("City not found");
        const data = await res.json();
        updateUI(data);
        if (data && data.coord) {
            currentCoords = { lat: data.coord.lat, lon: data.coord.lon };
            fetchForecast(data.coord.lat, data.coord.lon).catch(()=>{});
            fetchAQI(data.coord.lat, data.coord.lon).catch(()=>{});
        }
    } catch {
        errorUpdates();
    }
}

// Update UI with Weather Data
function updateUI(data) {
    // Fade out before updating
    cityImage.classList.remove("fade-in");
    cityWeatherImage.classList.remove("fade-in");

    cityName.classList.remove("show");
    statusText.classList.remove("show");

    setTimeout(() => {
        // Update content
        getCityImage(data.name);
        const cond = data.weather[0]?.main || "Clear";
        cityWeatherImage.src = `assets/${cond}.gif`;
        cityName.textContent = data.name;
        currentCity = data.name;
        // cityName.classList.add(data.weather[0].main);
        statusText.textContent = data.weather[0].main;

        const unitSuffix = currentUnits === 'metric' ? '°C' : '°F';
        for (let i = 0; i < temperature.length; i++) {
            temperature[i].textContent = `${data.main.temp} ${unitSuffix}`;
        }
        for (let i = 0; i < weatherDescription.length; i++) {
            weatherDescription[i].textContent = data.weather[0].description;
        }
        for (let i = 0; i < humidity.length; i++) {
            humidity[i].textContent = `Humidity: ${data.main.humidity}%`;
        }
        for (let i = 0; i < windSpeed.length; i++) {
            const windUnit = currentUnits === 'imperial' ? 'mph' : 'm/s';
            windSpeed[i].textContent = `Wind Speed: ${data.wind.speed} ${windUnit}`;
        }

        // Extended details
        for (let i = 0; i < feelsLike.length; i++) {
            const unitSuffix2 = currentUnits === 'metric' ? '°C' : '°F';
            feelsLike[i].textContent = `Feels like: ${data.main.feels_like} ${unitSuffix2}`;
        }
        for (let i = 0; i < tempMin.length; i++) {
            tempMin[i].textContent = `${data.main.temp_min}`;
        }
        for (let i = 0; i < tempMax.length; i++) {
            tempMax[i].textContent = `${data.main.temp_max}`;
        }
        // Update temperature unit labels (C/F)
        for (let i = 0; i < tempUnitEls.length; i++) {
            tempUnitEls[i].textContent = currentUnits === 'metric' ? 'C' : 'F';
        }
        for (let i = 0; i < pressure.length; i++) {
            pressure[i].textContent = `Pressure: ${data.main.pressure} hPa`;
        }
        for (let i = 0; i < visibility.length; i++) {
            if (data.visibility == null) { visibility[i].textContent = 'Visibility: --'; continue; }
            if (currentUnits === 'imperial') {
              const miles = (data.visibility / 1609.34).toFixed(1);
              visibility[i].textContent = `Visibility: ${miles} mi`;
            } else {
              const km = (data.visibility / 1000).toFixed(1);
              visibility[i].textContent = `Visibility: ${km} km`;
            }
        }
        for (let i = 0; i < cloudiness.length; i++) {
            cloudiness[i].textContent = `Cloudiness: ${data.clouds?.all ?? '--'}%`;
        }
        for (let i = 0; i < windDirection.length; i++) {
            windDirection[i].textContent = `Wind Direction: ${degToCompass(data.wind.deg)}`;
        }
        const tz = data.timezone ?? 0;
        const sunriseStr = formatTimeLocal(data.sys?.sunrise, tz);
        const sunsetStr = formatTimeLocal(data.sys?.sunset, tz);
        for (let i = 0; i < sunriseEls.length; i++) {
            sunriseEls[i].textContent = `Sunrise: ${sunriseStr}`;
        }
        for (let i = 0; i < sunsetEls.length; i++) {
            sunsetEls[i].textContent = `Sunset: ${sunsetStr}`;
        }

        // Fade in new data
        cityImage.classList.add("fade-in");
        cityWeatherImage.classList.add("fade-in");
        cityName.classList.add("show");
        statusText.classList.add("show");

        cityName.classList.forEach(el => {
            // el.classList.remove(data.weather[0].main);
            // el.classList.add(data.weather[0].main);

            if (cityName.classList.contains("Clear")) {
                cityName.classList.remove("Clear");
                cityName.classList.add(data.weather[0].main);
            }
            if (cityName.classList.contains("Clouds")) {
                cityName.classList.remove("Clouds");
                cityName.classList.add(data.weather[0].main);
            }
            if (cityName.classList.contains("Rain")) {
                cityName.classList.remove("Rain");
                cityName.classList.add(data.weather[0].main);
            }
            if (cityName.classList.contains("Snow")) {
                cityName.classList.remove("Snow");
                cityName.classList.add(data.weather[0].main);
            }
            if (cityName.classList.contains("Thunderstorm")) {
                cityName.classList.remove("Thunderstorm");
                cityName.classList.add(data.weather[0].main);
            }
        });

        const heroEl = document.querySelector('header.hero');
        if (heroEl) {
            heroEl.classList.remove('Clear','Clouds','Rain','Snow','Thunderstorm');
            heroEl.classList.add(data.weather[0].main);
        }

    }, 200); // short delay for smooth transition
}

// Fetch City Image from Unsplash
async function getCityImage(city) {
    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${city}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`
        );
        const data = await response.json();

        if (data.results.length > 0) {
            cityImage.style.opacity = "0"; // hide first
            cityImage.src = data.results[0].urls.regular;
            cityImage.onload = () => {
                cityImage.classList.add("fade-in");
            };
        } else {
            cityImage.src = "assets/no-data.jpg";
        }
    } catch (error) {
        console.error("Error fetching city image:", error);
        cityImage.src = "assets/error.jpg";
    }
}

// Handle Error UI
function errorUpdates() {
    statusText.textContent = "City not found";
    cityImage.src = "assets/error.jpg";
    cityName.textContent = "";
    cityWeatherImage.src = "assets/no-data.gif";

    [...temperature, ...weatherDescription, ...humidity, ...windSpeed,
     ...feelsLike, ...tempMin, ...tempMax, ...pressure, ...visibility,
     ...cloudiness, ...windDirection, ...sunriseEls, ...sunsetEls].forEach(el => el.textContent = "");
}

// ---------------- Forecast (One Call API) ----------------
async function fetchForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=${getUnitsParam()}&appid=${WEATHER_API_KEY}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    renderHourly(data);
    renderDaily(data);
    return;
  }
  // Fallback to 5-day/3-hour forecast if One Call is unavailable
  console.warn('One Call API unavailable, falling back to /forecast');
  try {
    const res2 = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${getUnitsParam()}&appid=${WEATHER_API_KEY}`);
    if (!res2.ok) return;
    const data2 = await res2.json();
    // Build pseudo-onecall structure for next 12 hours (3-hour steps)
    const hourly = (data2.list || []).slice(0, 12).map(it => ({
      dt: it.dt,
      temp: it.main?.temp,
      weather: it.weather
    }));
    // Group daily by date for next 7 days
    const byDay = {};
    for (const it of data2.list || []) {
      const d = new Date(it.dt * 1000);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(it);
    }
    const days = Object.keys(byDay).slice(0, 7).map(k => {
      const arr = byDay[k];
      const temps = arr.map(x => x.main?.temp);
      const min = Math.round(Math.min(...temps));
      const max = Math.round(Math.max(...temps));
      const weather = arr[0]?.weather;
      return { dt: (+k)/1000, temp: { min, max }, weather };
    });
    renderHourly({ hourly });
    renderDaily({ daily: days });
  } catch (e) {
    console.error('Forecast fallback failed', e);
  }
}

function renderHourly(data) {
  const container = document.getElementById('hourly-list');
  if (!container) return;
  if (!data || !Array.isArray(data.hourly)) { container.innerHTML = ''; return; }
  const unitSuffix = currentUnits === 'metric' ? '°C' : '°F';
  container.innerHTML = data.hourly.slice(0, 12).map(h => {
    const dt = new Date(h.dt * 1000);
    const hh = dt.getHours().toString().padStart(2, '0');
    const temp = Math.round(h.temp);
    const cond = (h.weather && h.weather[0] && h.weather[0].main) ? h.weather[0].main : '';
    return `<div class="text-center small">
      <div class="fw-semibold">${hh}:00</div>
      <div>${temp}${unitSuffix}</div>
      <div class="text-capitalize">${cond}</div>
    </div>`;
  }).join('');

  // Chart.js: Hourly temperatures
  const ctx = document.getElementById('hourly-chart');
  if (ctx && window.Chart) {
    const labels = data.hourly.slice(0,12).map(h => {
      const dt = new Date(h.dt * 1000);
      return dt.getHours().toString().padStart(2,'0') + ':00';
    });
    const temps = data.hourly.slice(0,12).map(h => Math.round(h.temp));
    if (window._hourlyChart) { window._hourlyChart.destroy(); }
    window._hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Temp (${unitSuffix})`,
          data: temps,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14,165,233,0.2)',
          fill: true,
          tension: 0.35,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,0.2)' } }
        }
      }
    });
  }
}

function renderDaily(data) {
  const container = document.getElementById('daily-list');
  if (!container) return;
  if (!data || !Array.isArray(data.daily)) { container.innerHTML = ''; return; }
  const unitSuffix = currentUnits === 'metric' ? '°C' : '°F';
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  container.innerHTML = data.daily.slice(0, 7).map(d => {
    const dt = new Date(d.dt * 1000);
    const day = dayNames[dt.getDay()];
    const tmin = Math.round(d.temp.min);
    const tmax = Math.round(d.temp.max);
    const cond = (d.weather && d.weather[0] && d.weather[0].main) ? d.weather[0].main : '';
    return `<div class="text-center small">
      <div class="fw-semibold">${day}</div>
      <div>${tmin}/${tmax}${unitSuffix}</div>
      <div class="text-capitalize">${cond}</div>
    </div>`;
  }).join('');

  // Chart.js: Daily min/max temperatures
  const dctx = document.getElementById('daily-chart');
  if (dctx && window.Chart) {
    const days = data.daily.slice(0,7).map(d => {
      const dt = new Date(d.dt * 1000);
      return dayNames[dt.getDay()];
    });
    const mins = data.daily.slice(0,7).map(d => Math.round(d.temp.min));
    const maxs = data.daily.slice(0,7).map(d => Math.round(d.temp.max));
    if (window._dailyChart) { window._dailyChart.destroy(); }
    window._dailyChart = new Chart(dctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: `Min (${unitSuffix})`,
            data: mins,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 2
          },
          {
            label: `Max (${unitSuffix})`,
            data: maxs,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: false, grid: { color: 'rgba(148,163,184,0.2)' } }
        }
      }
    });
  }
}

// ---------------- Air Quality ----------------
async function fetchAQI(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return;
  const data = await res.json();
  renderAQI(data);
}

function aqiBand(aqi) {
  switch (aqi) {
    case 1: return { text: 'Good', cls: 'bg-success' };
    case 2: return { text: 'Fair', cls: 'bg-info' };
    case 3: return { text: 'Moderate', cls: 'bg-warning text-dark' };
    case 4: return { text: 'Poor', cls: 'bg-orange' };
    case 5: return { text: 'Very Poor', cls: 'bg-danger' };
    default: return { text: '--', cls: 'bg-secondary' };
  }
}

function renderAQI(data) {
  const badge = document.getElementById('aqi-badge');
  const details = document.getElementById('aqi-details');
  if (!badge || !details) return;
  const aqi = data && data.list && data.list[0] && data.list[0].main && data.list[0].main.aqi;
  const comps = (data && data.list && data.list[0] && data.list[0].components) || {};
  const band = aqiBand(aqi);
  badge.className = `badge ${band.cls}`;
  badge.textContent = aqi ? `AQI: ${aqi} (${band.text})` : '--';
  details.innerHTML = `PM2.5: ${comps.pm2_5 ?? '--'} | PM10: ${comps.pm10 ?? '--'} | O3: ${comps.o3 ?? '--'}`;
}

// Search Button Event
searchButton.addEventListener('click', async () => {
    const city = searchInput.value.trim();
    if (!city) {
        alert("Please enter a city name.");
        return;
    }
    setSearching(true);
    try {
        await fetchWeatherData(city);
    } finally {
        setSearching(false);
    }
});

// Units toggle events (ensure handlers are attached)
if (unitCBtn) unitCBtn.addEventListener('click', () => setUnits('metric'));
if (unitFBtn) unitFBtn.addEventListener('click', () => setUnits('imperial'));

// Favorites: add current city, and change to fetch selected favorite
if (addFavoriteBtn) {
    addFavoriteBtn.addEventListener('click', () => {
        const city = (currentCity || searchInput.value || '').trim();
        if (city) addFavorite(city);
    });
}
if (favoritesSelect) {
    favoritesSelect.addEventListener('change', async (e) => {
        const val = (e.target.value || '').trim();
        if (!val) return;
        searchInput.value = val;
        setSearching(true);
        try {
            await fetchWeatherData(val);
        } finally {
            setSearching(false);
            favoritesSelect.selectedIndex = 0; // reset to placeholder
        }
    });
}

// Delete favorite: removes selected item, or current city if none selected
if (deleteFavoriteBtn) {
  deleteFavoriteBtn.addEventListener('click', () => {
    const selected = (favoritesSelect && favoritesSelect.value) ? favoritesSelect.value.trim() : '';
    const target = selected || (currentCity || '').trim() || (searchInput.value || '').trim();
    if (!target) return;
    const ok = window.confirm(`Remove "${target}" from favorites?`);
    if (!ok) return;
    removeFavorite(target);
    if (favoritesSelect) favoritesSelect.selectedIndex = 0;
  });
}

searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const city = searchInput.value.trim();
        if (!city) {
            alert("Please enter a city name.");
            return;
        }
        setSearching(true);
        try {
            await fetchWeatherData(city);
        } finally {
            setSearching(false);
        }
    }
});
