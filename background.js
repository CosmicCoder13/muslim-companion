// Global variables
let userLocation = { latitude: null, longitude: null };
let userCity = '';
let calculationMethod = 2; // Default to ISNA
let prayerTimes = {};
let notificationsEnabled = true;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Muslim Companion extension installed');
  
  // Set default settings if not already set
  chrome.storage.local.get(['notificationsEnabled', 'calculationMethod', 'language'], (result) => {
    if (result.notificationsEnabled === undefined) {
      chrome.storage.local.set({ notificationsEnabled: true });
    }
    
    if (result.calculationMethod === undefined) {
      chrome.storage.local.set({ calculationMethod: 2 });
    }
    
    if (result.language === undefined) {
      chrome.storage.local.set({ language: 'en' });
    }
  });
  
  // Schedule daily update for prayer times
  chrome.alarms.create('dailyUpdate', {
    periodInMinutes: 1440 // 24 hours
  });
  
  // Initial setup
  setupPrayerAlarms();
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyUpdate') {
    setupPrayerAlarms();
  } else if (alarm.name.startsWith('prayer_')) {
    const prayerName = alarm.name.split('_')[1];
    showPrayerNotification(prayerName);
  }
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.notificationsEnabled) {
    notificationsEnabled = changes.notificationsEnabled.newValue;
  }
  
  if (changes.calculationMethod) {
    calculationMethod = changes.calculationMethod.newValue;
    setupPrayerAlarms(); // Recalculate prayer times with new method
  }
  
  if (changes.userLocation) {
    userLocation = changes.userLocation.newValue;
    setupPrayerAlarms(); // Recalculate prayer times with new location
  }
});

// Setup prayer time alarms
function setupPrayerAlarms() {
  // Load user settings
  chrome.storage.local.get(['userLocation', 'calculationMethod', 'notificationsEnabled'], (result) => {
    if (!result.userLocation) {
      console.log('User location not set, cannot set up prayer alarms');
      return;
    }
    
    userLocation = result.userLocation;
    calculationMethod = result.calculationMethod || 2;
    notificationsEnabled = result.notificationsEnabled !== false;
    
    // Clear existing alarms
    chrome.alarms.clearAll(() => {
      // Re-create daily update alarm
      chrome.alarms.create('dailyUpdate', {
        periodInMinutes: 1440 // 24 hours
      });
      
      // Get today's prayer times
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=${calculationMethod}`)
        .then(response => response.json())
        .then(data => {
          if (data.code === 200) {
            prayerTimes = data.data.timings;
            
            // Save prayer times to storage
            chrome.storage.local.set({ prayerTimes });
            
            // Only set alarms if notifications are enabled
            if (notificationsEnabled) {
              // Set alarms for each prayer time
              setAlarmForPrayer('Fajr', prayerTimes.Fajr);
              setAlarmForPrayer('Dhuhr', prayerTimes.Dhuhr);
              setAlarmForPrayer('Asr', prayerTimes.Asr);
              setAlarmForPrayer('Maghrib', prayerTimes.Maghrib);
              setAlarmForPrayer('Isha', prayerTimes.Isha);
            }
          }
        })
        .catch(error => {
          console.error('Error fetching prayer times:', error);
        });
    });
  });
}

function setAlarmForPrayer(prayerName, timeString) {
  const now = new Date();
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const prayerTime = new Date();
  prayerTime.setHours(hours);
  prayerTime.setMinutes(minutes);
  prayerTime.setSeconds(0);
  
  // If prayer time has already passed for today, don't set an alarm
  if (prayerTime < now) {
    return;
  }
  
  // Calculate minutes until prayer
  const minutesUntilPrayer = (prayerTime - now) / (1000 * 60);
  
  // Create alarm
  chrome.alarms.create(`prayer_${prayerName}`, {
    delayInMinutes: minutesUntilPrayer
  });
  
  console.log(`Alarm set for ${prayerName} at ${timeString}, ${minutesUntilPrayer.toFixed(2)} minutes from now`);
}

function showPrayerNotification(prayerName) {
  if (!notificationsEnabled) return;
  
  const time = prayerTimes[prayerName];
  
  // Show notification
  chrome.notifications.create(`prayer_notification_${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `${prayerName} Prayer Time`,
    message: `It's time for ${prayerName} prayer (${time})`,
    priority: 2
  });
}