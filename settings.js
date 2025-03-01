// DOM elements
const currentLocationEl = document.getElementById('current-location');
const detectLocationBtn = document.getElementById('detect-location');
const cityInputEl = document.getElementById('city-input');
const searchCityBtn = document.getElementById('search-city');
const cityResultsEl = document.getElementById('city-results');
const citySelectEl = document.getElementById('city-select');
const setCityBtn = document.getElementById('set-city');
const calculationMethodEl = document.getElementById('calculation-method');
const notificationsEnabledEl = document.getElementById('notifications-enabled');
const languageSelectEl = document.getElementById('language-select');
const customBgUrlEl = document.getElementById('custom-bg-url');
const setCustomBgBtn = document.getElementById('set-custom-bg');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

// Global variables
let userLocation = { latitude: null, longitude: null };
let userCity = '';
let cityResults = [];
let selectedBackgroundImage = '';

// Initialize settings page
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  attachEventListeners();
});

function loadSettings() {
  // Load user settings from storage
  chrome.storage.local.get([
    'userLocation',
    'userCity',
    'calculationMethod',
    'notificationsEnabled',
    'language',
    'backgroundImage'
  ], (result) => {
    // Set location information
    if (result.userLocation && result.userCity) {
      userLocation = result.userLocation;
      userCity = result.userCity;
      currentLocationEl.textContent = userCity;
    } else {
      currentLocationEl.textContent = 'No location set';
    }
    
    // Set calculation method
    if (result.calculationMethod) {
      calculationMethodEl.value = result.calculationMethod;
    } else {
      calculationMethodEl.value = '2'; // Default to ISNA
    }
    
    // Set notifications checkbox
    notificationsEnabledEl.checked = result.notificationsEnabled !== false;
    
    // Set language
    if (result.language) {
      languageSelectEl.value = result.language;
    } else {
      languageSelectEl.value = 'en'; // Default to English
    }
    
    // Set background image
    if (result.backgroundImage) {
      selectedBackgroundImage = result.backgroundImage;
      
      // Highlight selected background
      const bgElements = document.querySelectorAll('.bg-image');
      bgElements.forEach(el => {
        if (el.dataset.image === selectedBackgroundImage) {
          el.classList.add('border-green-500');
          el.classList.remove('border-transparent');
        }
      });
      
      // If it's a custom URL, show it in the input
      if (!selectedBackgroundImage.startsWith('images/')) {
        customBgUrlEl.value = selectedBackgroundImage;
      }
    }
  });
}

function attachEventListeners() {
  // Detect location button
  detectLocationBtn.addEventListener('click', detectLocation);
  
  // City search
  searchCityBtn.addEventListener('click', searchCity);
  cityInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCity();
  });
  
  // Set city from search results
  setCityBtn.addEventListener('click', () => {
    const selectedIndex = citySelectEl.selectedIndex;
    
    if (selectedIndex > 0 && cityResults.length > 0) {
      const selected = cityResults[selectedIndex - 1];
      
      userLocation = {
        latitude: selected.lat,
        longitude: selected.lon
      };
      userCity = `${selected.name}, ${selected.country}`;
      
      currentLocationEl.textContent = userCity;
      cityResultsEl.classList.add('hidden');
    }
  });
  
  // Background image selection
  const bgElements = document.querySelectorAll('.bg-image');
  bgElements.forEach(el => {
    el.addEventListener('click', () => {
      // Remove selection from all
      bgElements.forEach(bg => {
        bg.classList.remove('border-green-500');
        bg.classList.add('border-transparent');
      });
      
      // Add selection to clicked
      el.classList.add('border-green-500');
      el.classList.remove('border-transparent');
      
      selectedBackgroundImage = el.dataset.image;
      
      // Clear custom URL
      customBgUrlEl.value = '';
    });
  });
  
  // Custom background URL
  setCustomBgBtn.addEventListener('click', () => {
    const url = customBgUrlEl.value.trim();
    
    if (url) {
      // Remove selection from preset backgrounds
      const bgElements = document.querySelectorAll('.bg-image');
      bgElements.forEach(bg => {
        bg.classList.remove('border-green-500');
        bg.classList.add('border-transparent');
      });
      
      selectedBackgroundImage = url;
    }
  });
  
  // Save settings
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Reset settings
  resetSettingsBtn.addEventListener('click', resetSettings);
}

function detectLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        // Get city name from coordinates
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`)
          .then(response => response.json())
          .then(data => {
            userCity = data.city || data.locality || 'Unknown location';
            if (data.countryName) {
              userCity += `, ${data.countryName}`;
            }
            currentLocationEl.textContent = userCity;
          })
          .catch(error => {
            console.error('Error getting city name:', error);
            currentLocationEl.textContent = `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
          });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not detect your location. Please try entering your city manually.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser. Please enter your city manually.');
  }
}

function searchCity() {
  const query = cityInputEl.value.trim();
  
  if (query.length < 2) {
    alert('Please enter at least 2 characters to search');
    return;
  }
  
  // Search for city using OpenStreetMap Nominatim API
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      cityResults = data.map(item => ({
        name: item.name || item.display_name.split(',')[0],
        country: item.address?.country || item.display_name.split(',').pop().trim(),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));
      
      if (cityResults.length === 0) {
        alert('No cities found. Please try a different search term.');
        return;
      }
      
      // Populate the dropdown with results
      citySelectEl.innerHTML = '<option>Select a city from results</option>';
      
      cityResults.forEach((city, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${city.name}, ${city.country}`;
        citySelectEl.appendChild(option);
      });
      
      // Show the results
      cityResultsEl.classList.remove('hidden');
    })
    .catch(error => {
      console.error('Error searching for city:', error);
      alert('Error searching for city. Please try again later.');
    });
}

function saveSettings() {
  // Create settings object
  const settings = {
    userLocation,
    userCity,
    calculationMethod: calculationMethodEl.value,
    notificationsEnabled: notificationsEnabledEl.checked,
    language: languageSelectEl.value
  };
  
  // Add background image if set
  if (selectedBackgroundImage) {
    settings.backgroundImage = selectedBackgroundImage;
  }
  
  // Save to storage
  chrome.storage.local.set(settings, () => {
    const saveButton = saveSettingsBtn;
    const originalText = saveButton.textContent;
    
    // Show saved confirmation
    saveButton.textContent = '✓ Saved!';
    saveButton.classList.remove('bg-green-600', 'hover:bg-green-700');
    saveButton.classList.add('bg-green-500');
    
    // Reset button after 2 seconds
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.classList.add('bg-green-600', 'hover:bg-green-700');
      saveButton.classList.remove('bg-green-500');
    }, 2000);
  });
}

function resetSettings() {
  // Default settings
  const defaultSettings = {
    userLocation: null,
    userCity: '',
    calculationMethod: '2',
    notificationsEnabled: true,
    language: 'en',
    backgroundImage: 'images/bg1.jpg'
  };
  
  // Confirm reset
  if (confirm('Are you sure you want to reset all settings to default?')) {
    // Reset all settings except for location (which requires manual setup)
    chrome.storage.local.set(defaultSettings, () => {
      // Reload the page to reflect changes
      window.location.reload();
    });
  }
}