# WeatherMoodApp

Convenient, responsive weather app with search, favorites, unit toggle, theme, forecast charts, and air quality.


## 🌐 Live Demo

- Link: [WeatherMoodApp](https://heyshreee.github.io/WeatherMoodApp/)

## ✨ Features

- **Current weather** by geolocation or city search
- **City background image** from Unsplash
- **Animated weather visual** (per condition)
- **Details**: description, humidity, wind (dir/speed), pressure, visibility, feels-like, min/max, sunrise/sunset
- **Units toggle**: °C/°F (persists)
- **Favorites**: add/select/delete stored in localStorage
- **Autocomplete**: OpenWeather geocoding suggestions
- **Theme**: light/dark, auto-detect on first load, toggle persists
- **Forecast**: hourly (12h) and daily (7d) lists
- **Charts**: hourly temperature and daily min/max (Chart.js)
- **Air Quality**: AQI badge and pollutants

## 📁 Project Structure

- `WeatherMoodApp/index.html` — UI layout and sections
- `WeatherMoodApp/style.css` — styles, dark theme, charts sizing
- `WeatherMoodApp/script.js` — logic (fetch, UI updates, charts, theme, favorites)
- `WeatherMoodApp/script.js` — logic (fetch, UI updates, charts, theme, favorites)

## ⚙️ Setup

1. Get API keys:
   - OpenWeatherMap API key
   - Unsplash Access Key
2. Open `WeatherMoodApp/script.js` and set:
```js
const WEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY";
const UNSPLASH_ACCESS_KEY = "YOUR_UNSPLASH_ACCESS_KEY";
```
3. Open `WeatherMoodApp/index.html` in a browser (no build step). If geolocation is blocked, search by city.

## 🧭 Usage

- **Search**: type a city and click the search icon or press Enter
- **Favorites**: use the star to add current city, pick from dropdown, use trash to delete
- **Units**: click °C/°F to switch (updates labels and refetches values)
- **Theme**: moon/sun button toggles; auto-detects on first load
- **Charts**: visible under Hourly/Daily cards

## 🔧 Notes

- If One Call API is not available, the app falls back to the 5-day/3-hour forecast endpoint to render charts.
- Hero and weather visuals use placeholders before data arrives.
- Favorites are saved in `localStorage['favorites']` as a string array.

## 🛠️ Tech Stack

- HTML, CSS, JavaScript (ES6)
- OpenWeatherMap (Current, Geocoding, One Call or Forecast, Air Pollution)
- Unsplash (city images)
- Chart.js (forecast graphs)

## 🐞 Troubleshooting

- No charts visible: ensure Chart.js loads before `script.js` and API key is valid. Check console for errors.
- AQI/Forecast empty: verify OpenWeather API plan allows those endpoints.
- Geolocation denied: just search by city.

## 📄 License

MIT

