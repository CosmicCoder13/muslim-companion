// Global variables
let userLocation = { latitude: null, longitude: null };
let userCity = '';
let prayerTimes = {};
let qiblaAngle = 0;
let currentLanguage = 'en';

// DOM Elements - Tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// DOM Elements - Prayer Times
const prayerTimesEl = {
  fajr: document.getElementById('fajr-time'),
  sunrise: document.getElementById('sunrise-time'),
  dhuhr: document.getElementById('dhuhr-time'),
  asr: document.getElementById('asr-time'),
  maghrib: document.getElementById('maghrib-time'),
  isha: document.getElementById('isha-time')
};
const prayerLabelsEl = {
  fajr: document.getElementById('fajr-label'),
  sunrise: document.getElementById('sunrise-label'),
  dhuhr: document.getElementById('dhuhr-label'),
  asr: document.getElementById('asr-label'),
  maghrib: document.getElementById('maghrib-label'),
  isha: document.getElementById('isha-label')
};
const nextPrayerNameEl = document.getElementById('next-prayer-name');
const nextPrayerTimeEl = document.getElementById('next-prayer-time');
const prayerCountdownEl = document.getElementById('prayer-countdown');
const currentLocationEl = document.getElementById('current-location');
const detectLocationBtn = document.getElementById('detect-location');

// DOM Elements - Qibla
const qiblaArrowEl = document.getElementById('qibla-arrow');
const qiblaAngleEl = document.getElementById('qibla-angle');

// DOM Elements - Quote
const quoteTextEl = document.getElementById('quote-text');
const quoteSourceEl = document.getElementById('quote-source');

// DOM Elements - Settings
const calculationMethodEl = document.getElementById('calculation-method');
const notificationsEnabledEl = document.getElementById('notifications-enabled');
const languageSelectEl = document.getElementById('language-select');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Set up tab navigation
  setupTabs();
  
  // Load user settings - this will also apply translations
  await loadSettings();
  
  // Ensure we have location data before trying to load prayer times
  if (!userLocation.latitude || !userLocation.longitude) {
    await detectLocation(true); // The 'true' flag indicates this is initial load
  }
  
  // Load prayer times
  await loadPrayerTimes();
  
  // Load Qibla direction
  loadQiblaDirection();
  
  // Load daily quote
  loadDailyQuote();
  
  // Start countdown timer
  setInterval(updatePrayerCountdown, 1000);
  
  // Add event listeners
  attachEventListeners();
});

// Tab navigation
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-content`).classList.add('active');
    });
  });
}

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'userLocation', 
      'userCity', 
      'calculationMethod', 
      'notificationsEnabled',
      'language'
    ], (result) => {
      // Get user location
      if (result.userLocation && result.userCity) {
        userLocation = result.userLocation;
        userCity = result.userCity;
        currentLocationEl.textContent = userCity;
      }
      
      // Get calculation method
      if (result.calculationMethod) {
        calculationMethodEl.value = result.calculationMethod;
      } else {
        calculationMethodEl.value = '2'; // Default to ISNA
      }
      
      // Get notification settings
      notificationsEnabledEl.checked = result.notificationsEnabled !== false;
      
      // Get language
      if (result.language) {
        currentLanguage = result.language;
        languageSelectEl.value = currentLanguage;
        document.documentElement.lang = currentLanguage;
        
        // For RTL languages
        if (currentLanguage === 'ar' || currentLanguage === 'ur') {
          document.documentElement.dir = 'rtl';
        } else {
          document.documentElement.dir = 'ltr';
        }
        
        // Apply translations
        translateUI();
      }
      
      resolve();
    });
  });
}

// Load prayer times from storage or API
async function loadPrayerTimes() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['prayerTimes'], (result) => {
      if (result.prayerTimes) {
        prayerTimes = result.prayerTimes;
        displayPrayerTimes(prayerTimes);
        updateNextPrayer(prayerTimes);
        resolve();
      } else {
        // Need to fetch prayer times
        fetchPrayerTimes().then(() => {
          resolve();
        }).catch(() => {
          resolve(); // Resolve even on error to continue initializing
        });
      }
    });
  });
}

// Display prayer times in the UI
function displayPrayerTimes(times) {
  if (!times || Object.keys(times).length === 0) {
    // If no times available, show loading state
    prayerTimesEl.fajr.textContent = '...';
    prayerTimesEl.sunrise.textContent = '...';
    prayerTimesEl.dhuhr.textContent = '...';
    prayerTimesEl.asr.textContent = '...';
    prayerTimesEl.maghrib.textContent = '...';
    prayerTimesEl.isha.textContent = '...';
    return;
  }

  prayerTimesEl.fajr.textContent = times.Fajr || '--:--';
  prayerTimesEl.sunrise.textContent = times.Sunrise || '--:--';
  prayerTimesEl.dhuhr.textContent = times.Dhuhr || '--:--';
  prayerTimesEl.asr.textContent = times.Asr || '--:--';
  prayerTimesEl.maghrib.textContent = times.Maghrib || '--:--';
  prayerTimesEl.isha.textContent = times.Isha || '--:--';
}

// Update the next prayer display
function updateNextPrayer(times) {
  if (!times) return;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const prayerList = [
    { name: 'Fajr', label: getTranslation('fajr', currentLanguage), time: times.Fajr },
    { name: 'Sunrise', label: getTranslation('sunrise', currentLanguage), time: times.Sunrise },
    { name: 'Dhuhr', label: getTranslation('dhuhr', currentLanguage), time: times.Dhuhr },
    { name: 'Asr', label: getTranslation('asr', currentLanguage), time: times.Asr },
    { name: 'Maghrib', label: getTranslation('maghrib', currentLanguage), time: times.Maghrib },
    { name: 'Isha', label: getTranslation('isha', currentLanguage), time: times.Isha }
  ];
  
  // Convert prayer times to minutes since midnight
  prayerList.forEach(prayer => {
    if (prayer.time) {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      prayer.timeInMinutes = hours * 60 + minutes;
    } else {
      prayer.timeInMinutes = -1;
    }
  });
  
  // Find next prayer
  let nextPrayer = null;
  for (const prayer of prayerList) {
    if (prayer.timeInMinutes > currentTime) {
      nextPrayer = prayer;
      break;
    }
  }
  
  // If no prayer is found, it means all prayers for today have passed, so next prayer is Fajr tomorrow
  if (!nextPrayer) {
    const tomorrow = getTranslation('tomorrow', currentLanguage);
    nextPrayer = { 
      name: 'Fajr', 
      label: `${getTranslation('fajr', currentLanguage)} (${tomorrow})`, 
      time: prayerList[0].time 
    };
  }
  
  // Update UI
  nextPrayerNameEl.textContent = nextPrayer.label;
  nextPrayerTimeEl.textContent = nextPrayer.time;
  
  // Store for countdown
  window.nextPrayer = nextPrayer;
}

// Update the countdown timer
function updatePrayerCountdown() {
  if (!window.nextPrayer) return;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();
  
  // Handle "Tomorrow" case
  if (window.nextPrayer.label && window.nextPrayer.label.includes(getTranslation('tomorrow', currentLanguage))) {
    const [hours, minutes] = window.nextPrayer.time.split(':').map(Number);
    const nextPrayerTimeInMinutes = hours * 60 + minutes;
    const timeUntilNextPrayer = (24 * 60 - currentTime) + nextPrayerTimeInMinutes;
    
    const hoursLeft = Math.floor(timeUntilNextPrayer / 60);
    const minutesLeft = Math.floor(timeUntilNextPrayer % 60);
    const secondsLeft = 59 - currentSeconds;
    
    prayerCountdownEl.textContent = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
    return;
  }
  
  // Normal case
  const [hours, minutes] = window.nextPrayer.time.split(':').map(Number);
  const nextPrayerTimeInMinutes = hours * 60 + minutes;
  const timeUntilNextPrayer = nextPrayerTimeInMinutes - currentTime;
  
  const hoursLeft = Math.floor(timeUntilNextPrayer / 60);
  const minutesLeft = Math.floor(timeUntilNextPrayer % 60);
  const secondsLeft = 59 - currentSeconds;
  
  prayerCountdownEl.textContent = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
}

// Detect user location
async function detectLocation(isInitialLoad = false) {
  return new Promise((resolve) => {
    if (!isInitialLoad) {
      currentLocationEl.textContent = getTranslation('detectingLocation', currentLanguage);
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          try {
            // Get city name from coordinates
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`);
            const data = await response.json();
            
            userCity = data.city || data.locality || 'Unknown location';
            if (data.countryName) {
              userCity += `, ${data.countryName}`;
            }
            
            currentLocationEl.textContent = userCity;
            
            // Save to storage
            await new Promise(r => chrome.storage.local.set({ userLocation, userCity }, r));
            
            // Now get prayer times with new location if this isn't initial load
            // For initial load, the caller will handle this
            if (!isInitialLoad) {
              await fetchPrayerTimes();
            }
            
            // Calculate Qibla direction
            calculateQiblaDirection();
            resolve(true);
          } catch (error) {
            console.error('Error getting city name:', error);
            currentLocationEl.textContent = getTranslation('locationDetectionFailed', currentLanguage);
            resolve(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          currentLocationEl.textContent = getTranslation('locationDetectionFailed', currentLanguage);
          resolve(false);
        }
      );
    } else {
      currentLocationEl.textContent = getTranslation('locationDetectionFailed', currentLanguage);
      resolve(false);
    }
  });
}

// Fetch prayer times from API
async function fetchPrayerTimes() {
  return new Promise((resolve, reject) => {
    if (!userLocation.latitude || !userLocation.longitude) {
      console.error('No location data available');
      reject('No location data');
      return;
    }
    
    const method = calculationMethodEl.value || 2;
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=${method}`)
      .then(response => response.json())
      .then(data => {
        if (data.code === 200) {
          prayerTimes = data.data.timings;
          
          // Save to storage
          chrome.storage.local.set({ prayerTimes });
          
          // Update UI
          displayPrayerTimes(prayerTimes);
          updateNextPrayer(prayerTimes);
          
          resolve(prayerTimes);
        } else {
          reject('API returned error code: ' + data.code);
        }
      })
      .catch(error => {
        console.error('Error fetching prayer times:', error);
        reject(error);
      });
  });
}

// Load and calculate Qibla direction
function loadQiblaDirection() {
  chrome.storage.local.get(['qiblaAngle'], (result) => {
    if (result.qiblaAngle !== undefined) {
      qiblaAngle = result.qiblaAngle;
      updateQiblaDirection();
    } else if (userLocation.latitude && userLocation.longitude) {
      calculateQiblaDirection();
    }
  });
}

// Calculate Qibla direction
function calculateQiblaDirection() {
  if (!userLocation.latitude || !userLocation.longitude) {
    return;
  }
  
  // Mecca coordinates
  const meccaLat = 21.4225;
  const meccaLng = 39.8262;
  
  // User coordinates
  const userLat = userLocation.latitude;
  const userLng = userLocation.longitude;
  
  // Convert to radians
  const userLatRad = userLat * (Math.PI / 180);
  const meccaLatRad = meccaLat * (Math.PI / 180);
  const lngDiffRad = (meccaLng - userLng) * (Math.PI / 180);
  
  // Calculate qibla direction
  const y = Math.sin(lngDiffRad);
  const x = Math.cos(userLatRad) * Math.tan(meccaLatRad) - Math.sin(userLatRad) * Math.cos(lngDiffRad);
  
  qiblaAngle = Math.atan2(y, x) * (180 / Math.PI);
  // Normalize to 0-360 degrees
  qiblaAngle = (qiblaAngle + 360) % 360;
  
  // Save to storage
  chrome.storage.local.set({ qiblaAngle });
  
  // Update UI
  updateQiblaDirection();
}

// Update Qibla direction in UI
function updateQiblaDirection() {
  // Rotate the arrow to point to Qibla
  qiblaArrowEl.style.transform = `translate(-50%, -100%) rotate(${qiblaAngle}deg)`;
  
  // Update text
  qiblaAngleEl.textContent = getTranslation('qiblaIs', currentLanguage, { degrees: Math.round(qiblaAngle) });
}

// Load daily quote
function loadDailyQuote() {
  chrome.storage.local.get(['dailyQuote'], (result) => {
    if (result.dailyQuote) {
      quoteTextEl.textContent = result.dailyQuote.text;
      quoteSourceEl.textContent = result.dailyQuote.source;
    } else {
      // If no quote is stored, load from quotes.json
      fetch('quotes.json')
        .then(response => response.json())
        .then(quotes => {
          // Pick a random quote
          const randomIndex = Math.floor(Math.random() * quotes.length);
          const quote = quotes[randomIndex];
          
          // Update UI
          quoteTextEl.textContent = quote.text;
          quoteSourceEl.textContent = quote.source;
          
          // Save to storage
          chrome.storage.local.set({
            dailyQuote: quote,
            quoteDate: new Date().toISOString().split('T')[0]
          });
        })
        .catch(error => {
          console.error('Error loading quotes:', error);
          quoteTextEl.textContent = 'Error loading quote.';
          quoteSourceEl.textContent = '';
        });
    }
  });
}

// Attach event listeners
function attachEventListeners() {
  // Detect location button
  detectLocationBtn.addEventListener('click', detectLocation);
  
  // Save settings button
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Reset settings button
  resetSettingsBtn.addEventListener('click', resetSettings);
  
  // Language select
  languageSelectEl.addEventListener('change', () => {
    currentLanguage = languageSelectEl.value;
    document.documentElement.lang = currentLanguage;
    
    // For RTL languages
    if (currentLanguage === 'ar' || currentLanguage === 'ur') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
    
    translateUI();
  });
}

// Save settings
function saveSettings() {
  const settings = {
    calculationMethod: calculationMethodEl.value,
    notificationsEnabled: notificationsEnabledEl.checked,
    language: languageSelectEl.value
  };
  
  // Check if language changed
  const languageChanged = settings.language !== currentLanguage;
  
  chrome.storage.local.set(settings, () => {
    // Show feedback
    const originalText = saveSettingsBtn.querySelector('span').textContent;
    saveSettingsBtn.querySelector('span').textContent = '✓';
    
    setTimeout(() => {
      saveSettingsBtn.querySelector('span').textContent = originalText;
      
      // If language changed, reload the popup
      if (languageChanged) {
        window.location.reload();
      }
    }, 1000);
    
    // Apply settings
    currentLanguage = settings.language;
    
    // Only translate if language didn't change (otherwise we'll reload)
    if (!languageChanged) {
      translateUI();
    }
    
    // Refresh prayer times with new calculation method
    fetchPrayerTimes();
  });
}

// Reset settings
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    const defaultSettings = {
      calculationMethod: '2',
      notificationsEnabled: true,
      language: 'en'
    };
    
    // Check if language is changing
    const languageChanged = defaultSettings.language !== currentLanguage;
    
    chrome.storage.local.set(defaultSettings, () => {
      calculationMethodEl.value = defaultSettings.calculationMethod;
      notificationsEnabledEl.checked = defaultSettings.notificationsEnabled;
      languageSelectEl.value = defaultSettings.language;
      
      currentLanguage = defaultSettings.language;
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = 'ltr';
      
      // If language changed, reload the popup, otherwise just refresh UI
      if (languageChanged) {
        window.location.reload();
      } else {
        translateUI();
        fetchPrayerTimes();
      }
    });
  }
}

// Translate UI elements using our custom translation system
function translateUI() {
  // App title and tagline
  document.getElementById('app-title').textContent = getTranslation('appName', currentLanguage);
  document.getElementById('app-tagline').textContent = getTranslation('yourDailyCompanion', currentLanguage);
  
  // Tab labels
  document.getElementById('tab-prayers').textContent = getTranslation('prayerTimes', currentLanguage);
  document.getElementById('tab-qibla').textContent = getTranslation('qiblaDirection', currentLanguage);
  document.getElementById('tab-inspiration').textContent = getTranslation('dailyInspiration', currentLanguage);
  document.getElementById('tab-settings').textContent = getTranslation('settings', currentLanguage);
  
  // Section titles
  document.getElementById('prayers-title').textContent = getTranslation('prayerTimes', currentLanguage);
  document.getElementById('qibla-title').textContent = getTranslation('qiblaDirection', currentLanguage);
  document.getElementById('inspiration-title').textContent = getTranslation('dailyInspiration', currentLanguage);
  document.getElementById('settings-title').textContent = getTranslation('settings', currentLanguage);
  document.getElementById('about-title').textContent = getTranslation('aboutApp', currentLanguage);
  document.getElementById('quick-links-title').textContent = getTranslation('quickLinks', currentLanguage);
  
  // Prayer names
  prayerLabelsEl.fajr.textContent = getTranslation('fajr', currentLanguage);
  prayerLabelsEl.sunrise.textContent = getTranslation('sunrise', currentLanguage);
  prayerLabelsEl.dhuhr.textContent = getTranslation('dhuhr', currentLanguage);
  prayerLabelsEl.asr.textContent = getTranslation('asr', currentLanguage);
  prayerLabelsEl.maghrib.textContent = getTranslation('maghrib', currentLanguage);
  prayerLabelsEl.isha.textContent = getTranslation('isha', currentLanguage);
  
  // Next prayer
  document.getElementById('next-prayer-label').textContent = getTranslation('nextPrayer', currentLanguage);
  
  // Settings
  document.getElementById('calculation-method-label').textContent = getTranslation('calculationMethod', currentLanguage);
  document.getElementById('notifications-label').textContent = getTranslation('enableNotifications', currentLanguage);
  document.getElementById('language-label').textContent = getTranslation('language', currentLanguage);
  document.getElementById('save-button').textContent = getTranslation('save', currentLanguage);
  document.getElementById('reset-button').textContent = getTranslation('reset', currentLanguage);
  
  // Quick links
  document.getElementById('quran-link').textContent = getTranslation('quran', currentLanguage);
  document.getElementById('hadith-link').textContent = getTranslation('hadith', currentLanguage);
  
  // Update Qibla text and next prayer if available
  if (qiblaAngle) {
    qiblaAngleEl.textContent = getTranslation('qiblaIs', currentLanguage, { degrees: Math.round(qiblaAngle) });
  }
  
  if (prayerTimes && Object.keys(prayerTimes).length > 0) {
    updateNextPrayer(prayerTimes);
  }
}