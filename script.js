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

// API Keys
const WEATHER_API_KEY = "55bf45e7fef414c6fef3596eb6df0fbd";
const UNSPLASH_ACCESS_KEY = "o94Yz3KJhOMagWX5xQDE_x5gF2HXqw_o0NPQ6l1VZ5Y";

// Get Location Weather on Load
window.onload = () => {
    navigator.geolocation.getCurrentPosition(
        pos => getWeather(pos.coords.latitude, pos.coords.longitude),
        () => alert("Unable to retrieve your location. Please enter a city name.")
    );
};

// Fetch Weather by Coordinates
function getWeather(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => updateUI(data))
        .catch(() => errorUpdates());
}

// Fetch Weather by City Name
async function fetchWeatherData(city) {
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`);
        if (!res.ok) throw new Error("City not found");
        const data = await res.json();
        updateUI(data);
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
        cityWeatherImage.src = `assets/${data.weather[0].main}.gif`;
        cityName.textContent = data.name;
        // cityName.classList.add(data.weather[0].main);
        statusText.textContent = data.weather[0].main;

        for (let i = 0; i < temperature.length; i++) {
            temperature[i].textContent = `${data.main.temp} °C`;
        }
        for (let i = 0; i < weatherDescription.length; i++) {
            weatherDescription[i].textContent = data.weather[0].description;
        }
        for (let i = 0; i < humidity.length; i++) {
            humidity[i].textContent = `Humidity: ${data.main.humidity}%`;
        }
        for (let i = 0; i < windSpeed.length; i++) {
            windSpeed[i].textContent = `Wind Speed: ${data.wind.speed} m/s`;
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

    [...temperature, ...weatherDescription, ...humidity, ...windSpeed].forEach(el => el.textContent = "");
}

// Search Button Event
searchButton.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) fetchWeatherData(city);
    else alert("Please enter a city name.");
});
