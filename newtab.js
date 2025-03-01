// Global variables
let userLocation = { latitude: null, longitude: null };
let userCity = '';
let prayerTimes = {};
let qiblaAngle = 0;

// DOM elements
const currentTimeEl = document.getElementById('current-time');
const currentDateEl = document.getElementById('current-date');
const hijriDateEl = document.getElementById('hijri-date');
const prayerTimesEl = document.getElementById('prayer-times');
const nextPrayerNameEl = document.getElementById('next-prayer-name');
const nextPrayerTimeEl = document.getElementById('next-prayer-time');
const prayerCountdownEl = document.getElementById('prayer-countdown');
const qiblaArrowEl = document.getElementById('qibla-arrow');
const qiblaAngleEl = document.getElementById('qibla-angle');
const quoteTextEl = document.getElementById('quote-text');
const quoteSourceEl = document.getElementById('quote-source');
const currentLocationEl = document.getElementById('current-location');
const taskListEl = document.getElementById('task-list');
const newTaskEl = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task');

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  initializeClock();
  loadBackgroundImage();
  loadTasks();
  getUserLocation();
  loadDailyQuote();
  
  // Event listeners
  addTaskBtn.addEventListener('click', addNewTask);
  newTaskEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNewTask();
  });
});

// Clock and date functions
function initializeClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  
  // Update regular time
  currentTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  // Update regular date
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDateEl.textContent = now.toLocaleDateString(undefined, options);
  
  // Update Hijri date (using API)
  if (!hijriDateEl.dataset.loaded) {
    fetch(`http://api.aladhan.com/v1/gToH?date=${now.toISOString().split('T')[0]}`)
      .then(response => response.json())
      .then(data => {
        if (data.code === 200) {
          const hijri = data.data.hijri;
          hijriDateEl.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
          hijriDateEl.dataset.loaded = 'true';
        }
      })
      .catch(error => {
        console.error('Error fetching Hijri date:', error);
        hijriDateEl.textContent = 'Hijri date unavailable';
      });
  }
  
  // Update prayer countdown if we have prayer times
  if (Object.keys(prayerTimes).length > 0) {
    updatePrayerCountdown();
  }
}

// Location and prayer times functions
function getUserLocation() {
  // First try to load from storage
  chrome.storage.local.get(['userLocation', 'userCity', 'calculationMethod'], (result) => {
    if (result.userLocation && result.userCity) {
      userLocation = result.userLocation;
      userCity = result.userCity;
      currentLocationEl.textContent = userCity;
      
      // Get prayer times with saved location
      getPrayerTimes(result.calculationMethod || 2); // Default to ISNA method if not set
      calculateQiblaDirection();
    } else {
      // Try to get current location
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
                currentLocationEl.textContent = userCity;
                
                // Save to storage
                chrome.storage.local.set({ userLocation, userCity });
                
                // Get prayer times and qibla
                getPrayerTimes(2); // Default to ISNA method
                calculateQiblaDirection();
              });
          },
          (error) => {
            console.error('Geolocation error:', error);
            currentLocationEl.textContent = 'Location detection failed. Please set your location in settings.';
          }
        );
      } else {
        currentLocationEl.textContent = 'Geolocation not supported. Please set your location in settings.';
      }
    }
  });
}

function getPrayerTimes(method = 2) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=${method}`)
    .then(response => response.json())
    .then(data => {
      if (data.code === 200) {
        prayerTimes = data.data.timings;
        displayPrayerTimes();
        updateNextPrayer();
      }
    })
    .catch(error => {
      console.error('Error fetching prayer times:', error);
      prayerTimesEl.innerHTML = '<p class="text-red-500">Failed to load prayer times. Please try again later.</p>';
    });
}

function displayPrayerTimes() {
  const prayerNames = {
    Fajr: 'Fajr',
    Sunrise: 'Sunrise',
    Dhuhr: 'Dhuhr',
    Asr: 'Asr',
    Maghrib: 'Maghrib',
    Isha: 'Isha'
  };
  
  let html = '';
  Object.keys(prayerNames).forEach(prayer => {
    html += `
      <div class="flex justify-between items-center">
        <span class="text-gray-700">${prayerNames[prayer]}</span>
        <span class="font-semibold">${prayerTimes[prayer]}</span>
      </div>
    `;
  });
  
  prayerTimesEl.innerHTML = html;
}

function updateNextPrayer() {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const prayerList = [
    { name: 'Fajr', time: prayerTimes.Fajr },
    { name: 'Sunrise', time: prayerTimes.Sunrise },
    { name: 'Dhuhr', time: prayerTimes.Dhuhr },
    { name: 'Asr', time: prayerTimes.Asr },
    { name: 'Maghrib', time: prayerTimes.Maghrib },
    { name: 'Isha', time: prayerTimes.Isha }
  ];
  
  // Convert prayer times to minutes since midnight
  prayerList.forEach(prayer => {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    prayer.timeInMinutes = hours * 60 + minutes;
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
    nextPrayer = { name: 'Fajr (Tomorrow)', time: prayerList[0].time };
  }
  
  // Update UI
  nextPrayerNameEl.textContent = nextPrayer.name;
  nextPrayerTimeEl.textContent = nextPrayer.time;
  
  // Set up countdown timer
  updatePrayerCountdown();
}

function updatePrayerCountdown() {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const nextPrayerName = nextPrayerNameEl.textContent;
  const nextPrayerTime = nextPrayerTimeEl.textContent;
  
  // Handle "Tomorrow" case
  if (nextPrayerName.includes('Tomorrow')) {
    const [hours, minutes] = nextPrayerTime.split(':').map(Number);
    const nextPrayerTimeInMinutes = hours * 60 + minutes;
    const timeUntilNextPrayer = (24 * 60 - currentTime) + nextPrayerTimeInMinutes;
    
    const hoursLeft = Math.floor(timeUntilNextPrayer / 60);
    const minutesLeft = Math.floor(timeUntilNextPrayer % 60);
    const secondsLeft = 59 - now.getSeconds();
    
    prayerCountdownEl.textContent = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
    return;
  }
  
  // Normal case
  const [hours, minutes] = nextPrayerTime.split(':').map(Number);
  const nextPrayerTimeInMinutes = hours * 60 + minutes;
  const timeUntilNextPrayer = nextPrayerTimeInMinutes - currentTime;
  
  const hoursLeft = Math.floor(timeUntilNextPrayer / 60);
  const minutesLeft = Math.floor(timeUntilNextPrayer % 60);
  const secondsLeft = 59 - now.getSeconds();
  
  prayerCountdownEl.textContent = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
}

// Qibla direction functions
function calculateQiblaDirection() {
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
  
  // Update UI
  qiblaArrowEl.style.transform = `translate(-50%, -50%) rotate(${qiblaAngle}deg)`;
  qiblaAngleEl.textContent = `Qibla is ${Math.round(qiblaAngle)}° from North`;
}

// Quote functions
function loadDailyQuote() {
  // First check if we've already loaded a quote today
  chrome.storage.local.get(['dailyQuote', 'quoteDate'], (result) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (result.dailyQuote && result.quoteDate === today) {
      // Use the stored quote
      quoteTextEl.textContent = result.dailyQuote.text;
      quoteSourceEl.textContent = result.dailyQuote.source;
    } else {
      // Load quotes from JSON
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
            quoteDate: today
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

// Todo list functions
function loadTasks() {
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    
    if (tasks.length === 0) {
      taskListEl.innerHTML = '<li class="py-3 text-gray-500">Your tasks will appear here</li>';
      return;
    }
    
    renderTaskList(tasks);
  });
}

function renderTaskList(tasks) {
  taskListEl.innerHTML = '';
  
  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'py-3 flex items-center justify-between';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.className = 'mr-2 form-checkbox h-5 w-5 text-green-600';
    checkbox.addEventListener('change', () => toggleTaskStatus(index));
    
    // Create task text
    const span = document.createElement('span');
    span.className = 'flex-grow ml-2' + (task.completed ? ' line-through text-gray-400' : ' text-gray-700');
    span.textContent = task.text;
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ml-2 text-red-500 hover:text-red-700';
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
    deleteBtn.addEventListener('click', () => deleteTask(index));
    
    // Create task container
    const taskContainer = document.createElement('div');
    taskContainer.className = 'flex items-center flex-grow';
    taskContainer.appendChild(checkbox);
    taskContainer.appendChild(span);
    
    li.appendChild(taskContainer);
    li.appendChild(deleteBtn);
    taskListEl.appendChild(li);
  });
}

function addNewTask() {
  const taskText = newTaskEl.value.trim();
  
  if (taskText === '') return;
  
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    tasks.push({
      text: taskText,
      completed: false,
      createdAt: new Date().toISOString()
    });
    
    chrome.storage.local.set({ tasks }, () => {
      renderTaskList(tasks);
      newTaskEl.value = '';
    });
  });
}

function toggleTaskStatus(index) {
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    
    if (index >= 0 && index < tasks.length) {
      tasks[index].completed = !tasks[index].completed;
      
      chrome.storage.local.set({ tasks }, () => {
        renderTaskList(tasks);
      });
    }
  });
}

function deleteTask(index) {
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    
    if (index >= 0 && index < tasks.length) {
      tasks.splice(index, 1);
      
      chrome.storage.local.set({ tasks }, () => {
        renderTaskList(tasks);
      });
    }
  });
}

// Background image function
function loadBackgroundImage() {
  chrome.storage.local.get(['backgroundImage'], (result) => {
    if (result.backgroundImage) {
      document.body.style.backgroundImage = `url(${result.backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
    } else {
      // Default background
      document.body.style.backgroundImage = "url('images/default-bg.jpg')";
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
    }
  });
}