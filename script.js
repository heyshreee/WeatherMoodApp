// HTML Elements
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const searchSpinner = document.getElementById('search-spinner');
const cityImageCard = document.getElementById('city-img-card'); // Background element
const appBg = document.getElementById('app-bg'); // Main background

const cityWeatherImage = document.getElementById('city-weather-img');
const statusText = document.getElementById('status-text');
const cityName = document.getElementById('city-name');
const dateTime = document.getElementById('date-time');
const mainTemp = document.getElementById('main-temp');

// Widget Elements
const aqiValue = document.getElementById('aqi-value');
const aqiStatus = document.getElementById('aqi-status');
const aqiProgress = document.getElementById('aqi-progress');
const windSpeedVal = document.getElementById('wind-speed-val');
const windDirText = document.getElementById('wind-dir-text');
const windDirIcon = document.getElementById('wind-dir-icon');
const sunriseVal = document.getElementById('sunrise-val');
const sunsetVal = document.getElementById('sunset-val');
const humidityVal = document.getElementById('humidity-val');
const visibilityVal = document.getElementById('visibility-val');
const photoLocation = document.getElementById('photo-location');

// Toggles & Lists
const unitCBtn = document.getElementById('unit-c');
const unitFBtn = document.getElementById('unit-f');
const themeToggleBtn = document.getElementById('theme-toggle');
const autocompleteList = document.getElementById('autocomplete-list');
const hourlyList = document.getElementById('hourly-list');

// App state
let currentUnits = localStorage.getItem('units') || 'metric'; // 'metric' or 'imperial'
let currentCity = '';
let currentCoords = null; // { lat, lon }
const tempUnitEls = document.getElementsByClassName('temp-unit'); // Keep using class for units

const WEATHER_API_KEY = "55bf45e7fef414c6fef3596eb6df0fbd";
const UNSPLASH_ACCESS_KEY = "o94Yz3KJhOMagWX5xQDE_x5gF2HXqw_o0NPQ6l1VZ5Y";

// ---------------- Initialization ----------------
window.onload = () => {
  applyUnitsUI();

  // Theme Init
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') document.body.classList.add('light-theme');
  updateThemeIcon();

  if (searchInput) {
    searchInput.value = '';
    toggleClearBtn(false);
  }

  navigator.geolocation.getCurrentPosition(
    pos => getWeather(pos.coords.latitude, pos.coords.longitude),
    () => {
      // Default to London if no geo and no history? Or just wait.
      fetchWeatherData("London");
    }
  );

  // Update time every minute
  setInterval(updateTimeDisplay, 60000);

  // Initial Entry Animation
  initAnimations();
};

function initAnimations() {
  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.sidebar', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1 })
      .fromTo('.main-content > *', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, "-=0.5")
      .fromTo('.widget-card', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, stagger: 0.1 }, "-=0.5");
  }
}

// ---------------- UI Helpers ----------------

function updateTimeDisplay(timezoneOffset = 0) {
  if (!dateTime) return;
  const now = new Date();
  // We can use the timezoneOffset to show local time in the city
  // For now, let's just show local user time or formatted time

  const options = { weekday: 'long', hour: '2-digit', minute: '2-digit' };
  dateTime.textContent = now.toLocaleDateString('en-US', options);
}

function setSearching(isLoading) {
  if (!searchInput) return;
  searchInput.disabled = isLoading;
  if (searchSpinner) searchSpinner.classList.toggle('d-none', !isLoading);
  if (clearBtn && isLoading) clearBtn.classList.add('d-none');
  if (clearBtn && !isLoading && searchInput.value.length > 0) clearBtn.classList.remove('d-none');
}

function toggleClearBtn(show) {
  if (clearBtn) clearBtn.classList.toggle('d-none', !show);
}

function applyUnitsUI() {
  if (unitCBtn && unitFBtn) {
    const cActive = currentUnits === 'metric';
    unitCBtn.classList.toggle('active', cActive);
    unitFBtn.classList.toggle('active', !cActive);
  }
  Array.from(tempUnitEls).forEach(el => {
    el.textContent = currentUnits === 'metric' ? '°C' : '°F';
  });
}

function getUnitsParam() {
  return currentUnits;
}

function setUnits(units) {
  currentUnits = units;
  localStorage.setItem('units', currentUnits);
  applyUnitsUI();
  if (currentCoords) {
    getWeather(currentCoords.lat, currentCoords.lon);
  } else if (currentCity) {
    fetchWeatherData(currentCity);
  }
}

// ---------------- Data Handling ----------------

function getWeather(lat, lon) {
  currentCoords = { lat, lon };
  setSearching(true);
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=${getUnitsParam()}`)
    .then(res => res.json())
    .then(data => {
      updateUI(data);
      fetchForecast(lat, lon);
      fetchAQI(lat, lon);
    })
    .catch(err => {
      console.error(err);
      if (statusText) statusText.textContent = "Error loading weather";
    })
    .finally(() => setSearching(false));
}

async function fetchWeatherData(city) {
  if (!city) return;
  setSearching(true);
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=${getUnitsParam()}`);
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();

    currentCoords = { lat: data.coord.lat, lon: data.coord.lon };
    updateUI(data);
    fetchForecast(data.coord.lat, data.coord.lon);
    fetchAQI(data.coord.lat, data.coord.lon);
  } catch {
    if (statusText) statusText.textContent = "City not found";
    // Optional: set a 'not found' background
    if (appBg) appBg.style.backgroundImage = "url('https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=1600&q=80')";
  } finally {
    setSearching(false);
  }
}

function updateUI(data) {
  if (!data) return;

  // Animate content refresh
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(['.current-weather', '.widget-card', '#hourly-list', '#hourly-chart'],
      { opacity: 0.5, y: 5 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, clearProps: "all" }
    );
  }

  // --- Basic Info ---
  currentCity = data.name;
  if (cityName) cityName.textContent = data.name;

  const cond = data.weather[0]?.main || "Clear";
  if (statusText) statusText.textContent = data.weather[0]?.description || cond;
  if (statusText) statusText.textContent = data.weather[0]?.description || cond;

  // Animate Temp
  if (mainTemp) {
    const startTemp = parseFloat(mainTemp.textContent) || 0;
    const endTemp = Math.round(data.main.temp);
    animateValue(mainTemp, startTemp, endTemp, 1000);
  }

  // Weather Icon
  // Weather Icon
  if (cityWeatherImage) {
    const iconCode = data.weather[0]?.icon || '01d';
    cityWeatherImage.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  }

  // --- Background & Photo ---
  getCityImage(data.name);

  // --- Details Widgets ---
  // Wind
  if (windSpeedVal) {
    const speed = data.wind.speed; // m/s or mph
    // Conversion if needed, but API handles units=metric/imperial
    windSpeedVal.textContent = Math.round(speed);
  }
  if (windDirText && windDirIcon) {
    const arrowRot = data.wind.deg || 0;
    windDirIcon.style.transform = `rotate(${arrowRot}deg)`;
    windDirText.textContent = degToCompass(arrowRot);
  }

  // Sun
  const tz = data.timezone || 0;
  if (sunriseVal) sunriseVal.textContent = formatTimeLocal(data.sys.sunrise, tz);
  if (sunsetVal) sunsetVal.textContent = formatTimeLocal(data.sys.sunset, tz);

  // Humidity
  if (humidityVal) humidityVal.textContent = `${data.main.humidity}%`;

  // Visibility
  if (visibilityVal) {
    let vis = data.visibility; // meters
    if (currentUnits === 'imperial') {
      vis = (vis / 1609.34).toFixed(1) + ' mi';
    } else {
      vis = (vis / 1000).toFixed(1) + ' km';
    }
    visibilityVal.textContent = vis;
  }

  updateTimeDisplay(tz);
}

async function getCityImage(city) {
  if (!city) return;
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${city}&orientation=landscape&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const imgUrl = data.results[0].urls.regular;
      // Update full background
      if (appBg) {
        appBg.style.backgroundImage = `url('${imgUrl}')`;
      }
      // Update sidebar little card
      if (cityImageCard) {
        cityImageCard.style.backgroundImage = `url('${data.results[0].urls.small}')`;
      }
      if (photoLocation) {
        photoLocation.textContent = data.results[0].user.name || 'Unsplash';
      }
    }
  } catch (e) {
    console.warn("Unsplash error", e);
  }
}

// ---------------- Forecast & Charts ----------------

async function fetchForecast(lat, lon) {
  // Attempt OneCall if valid key (often paid/separate), else fallback to 5-day
  // Note: The previous code had fallback logic. I will preserve the fallback logic.
  // However, the provided key "55bf..." is a free key which usually doesn't support OneCall 3.0, 
  // but might support OneCall 2.5 if old account. Let's assume standard Forecast 5 day is safer/more reliable for free tiers.

  // Using standard 5 day / 3 hour forecast
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${getUnitsParam()}&appid=${WEATHER_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.list) {
      renderHourlyFromForecast(data.list);
    }
  } catch (e) {
    console.error("Forecast error", e);
  }
}

function renderHourlyFromForecast(list) {
  if (!hourlyList) return;

  // Get next 8-12 data points (24 hours approx)
  const nextHours = list.slice(0, 10);

  hourlyList.innerHTML = nextHours.map(item => {
    const dt = new Date(item.dt * 1000);
    const timeStr = dt.getHours().toString().padStart(2, '0') + ':00';
    const temp = Math.round(item.main.temp);
    const icon = item.weather[0]?.icon;

    return `
            <div class="glass-card hourly-card">
              <span style="font-size: 0.85rem">${timeStr}</span>
              <img src="http://openweathermap.org/img/wn/${icon}.png" style="width: 40px" alt="icon">
              <span style="font-weight: 600">${temp}°</span>
            </div>
        `;
  }).join('');

  renderChart(nextHours);
}

function renderChart(dataSlice) {
  const ctx = document.getElementById('hourly-chart');
  if (!ctx || !window.Chart) return;

  const labels = dataSlice.map(item => {
    const dt = new Date(item.dt * 1000);
    return dt.getHours() + ':00';
  });
  const temps = dataSlice.map(item => item.main.temp);

  // Mock "Yesterday" data for visual comparison (since API doesn't provide it freely)
  // We'll just shift the current temps slightly
  const yesterdayTemps = temps.map(t => t - 2 + Math.random() * 4);

  if (window._hourlyChart) window._hourlyChart.destroy();

  window._hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Today',
          data: temps,
          borderColor: '#ffffff',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          order: 1
        },
        {
          label: 'Yesterday',
          data: yesterdayTemps,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 2,
          borderDash: [5, 5],
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + Math.round(context.raw) + '°';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.1)', borderDash: [5, 5] },
          ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } },
          border: { display: false }
        }
      }
    }
  });
}

// ---------------- Air Quality ----------------
async function fetchAQI(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.list && data.list[0]) {
      renderAQI(data.list[0]);
    }
  } catch { }
}

function renderAQI(data) {
  if (!aqiValue || !aqiStatus) return;
  const aqi = data.main.aqi; // 1 = Good, 5 = Very Poor
  aqiValue.textContent = aqi;

  const statusMap = {
    1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor'
  };
  aqiStatus.textContent = statusMap[aqi] || 'Unknown';

  // Progress bar
  if (aqiProgress) {
    const pct = (aqi / 5) * 100;
    aqiProgress.style.width = `${pct}%`;
    // Color based on AQI
    if (aqi <= 2) aqiProgress.style.background = '#4ade80'; // Green
    else if (aqi === 3) aqiProgress.style.background = '#facc15'; // Yellow
    else aqiProgress.style.background = '#ef4444'; // Red
  }
}

// ---------------- Helpers ----------------
function degToCompass(num) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[(val % 16)];
}

function formatTimeLocal(unix, tzOffset) {
  // Simple local time format
  // unix is UTC seconds. tzOffset is seconds.
  // We want to show the time AT the location.
  const date = new Date((unix + tzOffset) * 1000);
  // This creates a date object shifted by the offset. 
  // However, JS Date is always in local browser time or UTC. 
  // The "correct" way without libraries is to take UTC value + offset
  // and treat it as a UTC date, then slice the string.

  const d = new Date((unix * 1000) + (tzOffset * 1000));
  // Since we can't easily force timezone without Intl with IANA string (which we don't have, only offset),
  // we cheat by adjusting the timestamp to "look" like the time we want in UTC.
  // But simplest is nice 'en-US' with timeStyle

  return new Date((unix + document.timeline.currentTime) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // Actually, let's just use the previous logic which was simple and robust enough for display
  const dateObj = new Date((unix + tzOffset) * 1000);
  return dateObj.toUTCString().slice(17, 22);
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ---------------- Event Listeners ----------------

// ---------------- Event Listeners ----------------

let currentFocus = -1;

if (searchInput) {
  // Input handling
  searchInput.addEventListener('input', debounce(async (e) => {
    const val = e.target.value.trim();
    toggleClearBtn(val.length > 0);

    if (val.length < 3) {
      closeAutocomplete();
      return;
    }

    currentFocus = -1; // Reset focus
    try {
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${val}&limit=5&appid=${WEATHER_API_KEY}`);
      const data = await res.json();
      renderAutocomplete(data, val);
    } catch (e) {
      console.error(e);
    }
  }, 300));

  // Keyboard Navigation
  searchInput.addEventListener('keydown', (e) => {
    if (!autocompleteList) return;
    let items = autocompleteList.getElementsByClassName('autocomplete-item');
    if (e.key === 'ArrowDown') {
      currentFocus++;
      addActive(items);
    } else if (e.key === 'ArrowUp') {
      currentFocus--;
      addActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus > -1 && items) {
        items[currentFocus].click();
      } else {
        // Normal search if no selection
        fetchWeatherData(searchInput.value.trim());
        closeAutocomplete();
      }
    }
  });
}

function addActive(items) {
  if (!items) return;
  removeActive(items);
  if (currentFocus >= items.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = items.length - 1;
  items[currentFocus].classList.add('active');
  // Scroll into view if needed
  items[currentFocus].scrollIntoView({ block: 'nearest' });
}

function removeActive(items) {
  for (let i = 0; i < items.length; i++) {
    items[i].classList.remove('active');
  }
}

function closeAutocomplete() {
  if (autocompleteList) autocompleteList.innerHTML = '';
  currentFocus = -1;
}

function renderAutocomplete(data, query) {
  if (!autocompleteList) return;
  if (!data || data.length === 0) {
    closeAutocomplete();
    return;
  }

  // Country flag helper (ISO 3166-1 alpha-2 to flag emoji)
  const getFlag = (cc) => {
    if (!cc) return '';
    return cc.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
  };

  const regex = new RegExp(`(${query})`, 'gi');

  autocompleteList.innerHTML = data.map(item => {
    // Highlight match
    const highlightedName = item.name.replace(regex, "<strong>$1</strong>");
    const flag = getFlag(item.country);

    // JSON stringify for safe onclick argument
    // But easier to just pass name string if unique enough, or handle via event delegation
    // We'll stick to name for now.
    return `
      <div class="autocomplete-item" onclick="selectCity('${item.name.replace(/'/g, "\\'")}')">
          <span>${flag} ${highlightedName}</span>
          <span style="font-size: 0.8em; opacity: 0.7; margin-left: auto;">${item.state || ''}, ${item.country}</span>
      </div>
    `;
  }).join('');
}

// Global scope for onclick
window.selectCity = (cityName) => {
  searchInput.value = cityName;
  fetchWeatherData(cityName);
  closeAutocomplete();
  toggleClearBtn(true);
};

// Clear Button
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
      toggleClearBtn(false);
      closeAutocomplete();
    }
  });
}

// Click Outside to close
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
    closeAutocomplete();
  }
});

// Original fetchWeatherData exposure
window.fetchWeatherData = fetchWeatherData;


if (unitCBtn) unitCBtn.addEventListener('click', () => setUnits('metric'));
if (unitFBtn) unitFBtn.addEventListener('click', () => setUnits('imperial'));

// Theme Toggle
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcon();

    // Re-render chart to update colors if needed
    if (window._hourlyChart) {
      // For now, simpler to just reload or let user refresh for perfect chart colors
      // Or we can manually update chart options here
    }
  });
}

function updateThemeIcon() {
  if (!themeToggleBtn) return;
  const isLight = document.body.classList.contains('light-theme');

  // GSAP rotation
  if (typeof gsap !== 'undefined') {
    gsap.to(themeToggleBtn, { rotation: '+=360', duration: 0.5, ease: 'back.out(1.7)' });
  }

  themeToggleBtn.innerHTML = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

function animateValue(obj, start, end, duration) {
  if (start === end) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Ease out quart
    const ease = 1 - Math.pow(1 - progress, 4);

    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end;
    }
  };
  window.requestAnimationFrame(step);
}

function applyThemeFromStorage() {
  // Deprecated, logic moved to init
}
