// Simple calendar data storage
let calendarData = {};
let importantDays = new Set(); // Store dates marked as important
let dailySchedule = {}; // Store schedule items per day
let currentDate = new Date();
let selectedDate = null;
let use24HourTime = false; // Time format preference (false = 12-hour, true = 24-hour)

// Available colors
const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal', 'gray', 'brown'];

// ===== GUN.JS CLOUD SYNC =====
let gun = null;
let currentUser = null;
let syncEnabled = false;

// Initialize Gun.js
function initGun() {
    gun = Gun([
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gun-us.herokuapp.com/gun'
    ]);

    // Check if user was previously logged in
    const savedUsername = localStorage.getItem('gun-username');
    if (savedUsername) {
        updateSyncStatus(`Previously: ${savedUsername} (sign in again to sync)`);
    }
}

// Update sync status UI
function updateSyncStatus(message, className = '') {
    const statusEl = document.getElementById('sync-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'sync-status ' + className;
    }
}

// Show/hide sync UI sections
function updateSyncUI(loggedIn) {
    const authForm = document.getElementById('sync-auth-form');
    const loggedInSection = document.getElementById('sync-logged-in');

    if (loggedIn) {
        authForm.style.display = 'none';
        loggedInSection.style.display = 'flex';
    } else {
        authForm.style.display = 'flex';
        loggedInSection.style.display = 'none';
    }
}

// Register new account
async function registerAccount() {
    const username = document.getElementById('sync-username').value.trim();
    const password = document.getElementById('sync-password').value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    updateSyncStatus('Creating account...', 'syncing');

    currentUser = gun.user();
    currentUser.create(username, password, (ack) => {
        if (ack.err) {
            updateSyncStatus('Error: ' + ack.err);
            alert('Registration failed: ' + ack.err);
        } else {
            // Auto-login after registration
            loginToSync();
        }
    });
}

// Login to sync account
function loginToSync() {
    const username = document.getElementById('sync-username').value.trim();
    const password = document.getElementById('sync-password').value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    updateSyncStatus('Signing in...', 'syncing');

    currentUser = gun.user();
    currentUser.auth(username, password, (ack) => {
        if (ack.err) {
            updateSyncStatus('Sign in failed: ' + ack.err);
            alert('Login failed: ' + ack.err);
        } else {
            localStorage.setItem('gun-username', username);
            syncEnabled = true;
            updateSyncStatus(`Signed in as ${username}`, 'synced');
            updateSyncUI(true);

            // Clear password field
            document.getElementById('sync-password').value = '';

            // Enable auto-sync
            enableAutoSync();
        }
    });
}

// Logout from sync
function logoutFromSync() {
    if (currentUser) {
        currentUser.leave();
    }
    currentUser = null;
    syncEnabled = false;
    localStorage.removeItem('gun-username');
    updateSyncStatus('Not signed in');
    updateSyncUI(false);

    // Clear input fields
    document.getElementById('sync-username').value = '';
    document.getElementById('sync-password').value = '';
}

// Push data to cloud
function pushToCloud() {
    if (!currentUser || !syncEnabled) {
        alert('Please sign in first');
        return;
    }

    updateSyncStatus('Pushing to cloud...', 'syncing');

    const data = {
        notes: calendarData,
        important: [...importantDays],
        schedule: dailySchedule,
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
        use24HourTime: use24HourTime,
        lastUpdate: Date.now()
    };

    currentUser.get('calendar').put(data, (ack) => {
        if (ack.err) {
            updateSyncStatus('Push failed: ' + ack.err);
            alert('Failed to push to cloud: ' + ack.err);
        } else {
            const username = localStorage.getItem('gun-username');
            updateSyncStatus(`Synced as ${username} (${new Date().toLocaleTimeString()})`, 'synced');
        }
    });
}

// Pull data from cloud
function pullFromCloud() {
    if (!currentUser || !syncEnabled) {
        alert('Please sign in first');
        return;
    }

    updateSyncStatus('Pulling from cloud...', 'syncing');

    currentUser.get('calendar').once((data) => {
        if (!data || !data.notes) {
            updateSyncStatus('No cloud data found');
            alert('No data found in cloud. Try pushing your local data first.');
            return;
        }

        // Update local data
        calendarData = data.notes || {};
        importantDays = new Set(data.important || []);
        dailySchedule = data.schedule || {};
        use24HourTime = data.use24HourTime || false;

        // Apply theme
        if (data.theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        // Update time format button
        updateTimeFormatButton();

        // Save to localStorage
        saveData();

        // Refresh UI
        renderCalendar();
        if (selectedDate) {
            renderEditorBubbles();
            renderScheduleItems();
        }

        const username = localStorage.getItem('gun-username');
        updateSyncStatus(`Synced as ${username} (${new Date().toLocaleTimeString()})`, 'synced');
    });
}

// Enable automatic real-time sync
function enableAutoSync() {
    if (!currentUser || !syncEnabled) return;

    // Listen for changes from other devices
    currentUser.get('calendar').on((data, key) => {
        if (!data || !data.notes) return;

        // Only update if data is newer than local (avoid sync loops)
        const localLastUpdate = localStorage.getItem('last-local-update') || 0;
        if (data.lastUpdate && data.lastUpdate > localLastUpdate) {
            calendarData = data.notes || {};
            importantDays = new Set(data.important || []);
            dailySchedule = data.schedule || {};
            use24HourTime = data.use24HourTime || false;

            updateTimeFormatButton();
            saveData();
            renderCalendar();
            if (selectedDate) {
                renderEditorBubbles();
                renderScheduleItems();
            }

            const username = localStorage.getItem('gun-username');
            updateSyncStatus(`Auto-synced as ${username} (${new Date().toLocaleTimeString()})`, 'synced');
        }
    });
}

// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem('calendarly-data');
    if (stored) {
        const data = JSON.parse(stored);
        calendarData = data.notes || {};
        importantDays = new Set(data.important || []);
        dailySchedule = data.schedule || {};
        use24HourTime = data.use24HourTime || false;

        // Load theme
        if (data.theme === 'light') {
            document.body.classList.add('light-mode');
        }
    }
}

// Save data to localStorage
function saveData() {
    const data = {
        notes: calendarData,
        important: [...importantDays],
        schedule: dailySchedule,
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
        use24HourTime: use24HourTime
    };
    localStorage.setItem('calendarly-data', JSON.stringify(data));
    localStorage.setItem('last-local-update', Date.now().toString());

    // Auto-sync to cloud if enabled
    if (syncEnabled && currentUser) {
        const cloudData = {
            ...data,
            lastUpdate: Date.now()
        };
        currentUser.get('calendar').put(cloudData);
    }
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time based on user preference (24-hour or 12-hour)
// showAMPM parameter controls whether to show AM/PM (for forms) or just time (for timeline)
function formatTime(timeString, showAMPM = false) {
    const [hours, minutes] = timeString.split(':').map(Number);

    if (use24HourTime) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else {
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const formattedTime = `${hour12}:${String(minutes).padStart(2, '0')}`;

        if (showAMPM) {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            return `${formattedTime} ${ampm}`;
        }
        return formattedTime;
    }
}

// Parse time input to 24-hour format (handles both 12-hour and 24-hour input)
function parseTimeInput(input) {
    if (!input) return null;

    // Remove extra spaces
    input = input.trim();

    // Check if it has AM/PM
    const ampmMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
        const isPM = ampmMatch[3].toLowerCase() === 'pm';

        // Convert to 24-hour
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Try to parse as 24-hour format
    const timeMatch = input.match(/(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }

    return null;
}

// Get month name
function getMonthName(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update header
    document.getElementById('current-month').textContent = getMonthName(currentDate);

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get previous month's last days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    const calendarGrid = document.getElementById('calendar-grid');

    // Remove existing day cells (keep headers)
    const existingDays = calendarGrid.querySelectorAll('.day-cell');
    existingDays.forEach(cell => cell.remove());

    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const cell = createDayCell(new Date(year, month - 1, day), true);
        calendarGrid.appendChild(cell);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const cell = createDayCell(date, false);
        calendarGrid.appendChild(cell);
    }

    // Calculate how many rows we need (5 or 6)
    const totalDaysToShow = startingDayOfWeek + daysInMonth;
    const rowsNeeded = Math.ceil(totalDaysToShow / 7);

    // Update grid template rows dynamically
    calendarGrid.style.gridTemplateRows = `auto repeat(${rowsNeeded}, 1fr)`;

    // Add next month's leading days to fill the last row
    const totalCells = calendarGrid.querySelectorAll('.day-cell').length;
    const remainingCells = (rowsNeeded * 7) - totalCells; // Fill to complete rows
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        const cell = createDayCell(date, true);
        calendarGrid.appendChild(cell);
    }

    // After rendering, fill in bubbles based on available space
    requestAnimationFrame(() => fillBubbles());

    // Render mini calendars (both desktop and mobile versions)
    const prevMonthDate = new Date(year, month - 1, 1);
    const nextMonthDate = new Date(year, month + 1, 1);

    renderMiniCalendar('mini-prev-desktop', prevMonthDate);
    renderMiniCalendar('mini-next-desktop', nextMonthDate);
    renderMiniCalendar('mini-prev', prevMonthDate);
    renderMiniCalendar('mini-next', nextMonthDate);

    // Update mini calendar titles
    const prevTitle = document.getElementById('mini-prev-title');
    const nextTitle = document.getElementById('mini-next-title');
    if (prevTitle) prevTitle.textContent = getMonthName(prevMonthDate);
    if (nextTitle) nextTitle.textContent = getMonthName(nextMonthDate);
}

// Render mini calendar
function renderMiniCalendar(elementId, date) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const miniDate = new Date(year, month - 1, day);
        const dot = createMiniDay(miniDate, true);
        container.appendChild(dot);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const miniDate = new Date(year, month, day);
        const dot = createMiniDay(miniDate, false);
        container.appendChild(dot);
    }

    // Add next month's leading days to fill at least 5 rows (35 days)
    const totalDots = container.children.length;
    const minDots = 35; // At least 5 rows
    const targetDots = totalDots < minDots ? minDots : Math.ceil(totalDots / 7) * 7;
    const remainingDots = targetDots - totalDots;

    for (let day = 1; day <= remainingDots; day++) {
        const miniDate = new Date(year, month + 1, day);
        const dot = createMiniDay(miniDate, true);
        container.appendChild(dot);
    }
}

// Create mini calendar day dot
function createMiniDay(date, isOtherMonth) {
    const dot = document.createElement('div');
    dot.className = 'mini-day';

    if (isOtherMonth) {
        dot.classList.add('other-month');
    }

    const dateKey = formatDate(date);

    // Check if day has content and get first bubble color
    if (calendarData[dateKey] && calendarData[dateKey].length > 0) {
        dot.classList.add('has-content');
        const firstBubbleColor = calendarData[dateKey][0].color;
        dot.classList.add(`bubble-${firstBubbleColor}`);
    }

    // Check if day is important
    if (importantDays.has(dateKey)) {
        dot.classList.add('important');
    }

    return dot;
}

// Fill bubbles dynamically based on available space
function fillBubbles() {
    const previews = document.querySelectorAll('.day-preview');

    previews.forEach(preview => {
        if (!preview.dataset.bubbles) return;

        const bubbles = JSON.parse(preview.dataset.bubbles);
        const dayCell = preview.closest('.day-cell');

        // Clear any existing bubbles
        preview.innerHTML = '';

        // Remove any existing size classes
        dayCell.classList.remove('size-large', 'size-medium', 'size-small', 'size-tiny');

        // Try sizes from largest to smallest until everything fits
        const sizes = ['size-large', 'size-medium', 'size-small', 'size-tiny'];
        let fittingSize = 'size-tiny'; // Default to smallest

        for (const sizeClass of sizes) {
            dayCell.classList.add(sizeClass);

            // Render bubbles with this size
            preview.innerHTML = '';
            bubbles.forEach(item => {
                const bubble = document.createElement('div');
                bubble.className = `note-bubble bubble-${item.color}`;
                bubble.textContent = item.text;
                preview.appendChild(bubble);
            });

            // Check if content fits without overflow
            // Give it a frame to render
            const previewHeight = preview.scrollHeight;
            const availableHeight = preview.clientHeight;

            // If content fits (with a small tolerance), use this size
            if (previewHeight <= availableHeight + 2) {
                fittingSize = sizeClass;
                break;
            }

            // Remove this size class to try the next smaller one
            dayCell.classList.remove(sizeClass);
        }

        // Apply the fitting size (or tiny if nothing fit)
        if (!dayCell.classList.contains(fittingSize)) {
            dayCell.classList.add(fittingSize);
        }

        // Final render with the chosen size
        preview.innerHTML = '';
        bubbles.forEach(item => {
            const bubble = document.createElement('div');
            bubble.className = `note-bubble bubble-${item.color}`;
            bubble.textContent = item.text;
            preview.appendChild(bubble);
        });
    });
}

// Create a day cell
function createDayCell(date, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (isOtherMonth) {
        cell.classList.add('other-month');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();

    // Add schedule indicator if day has schedule items
    const dateKey = formatDate(date);
    if (dailySchedule[dateKey] && dailySchedule[dateKey].length > 0) {
        const scheduleIcon = document.createElement('span');
        scheduleIcon.className = 'schedule-indicator';
        scheduleIcon.innerHTML = '◈';
        dayNumber.appendChild(scheduleIcon);
    }

    cell.appendChild(dayNumber);

    // Add preview if there's content
    if (calendarData[dateKey] && calendarData[dateKey].length > 0) {
        const preview = document.createElement('div');
        preview.className = 'day-preview';
        cell.appendChild(preview);

        // We'll calculate how many bubbles fit after the cell is rendered
        // Store the data on the preview element for later processing
        preview.dataset.bubbles = JSON.stringify(calendarData[dateKey]);
    }

    // Click handler
    cell.addEventListener('click', () => openEditor(date));

    // Right-click handler to toggle important
    cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleImportantDay(date);
    });

    // Mark as important if needed
    if (importantDays.has(dateKey)) {
        cell.classList.add('important-day');
    }

    return cell;
}

// Open editor for a specific date
function openEditor(date) {
    selectedDate = date;
    const dateKey = formatDate(date);

    // Update editor header
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('editor-date').textContent = date.toLocaleDateString(undefined, options);

    // Clear input and load existing bubbles
    document.getElementById('bubble-input').value = '';
    renderEditorBubbles();

    // Render timeline
    renderTimeline();

    // Switch views
    document.getElementById('calendar-view').classList.remove('active');
    document.getElementById('editor-view').classList.add('active');

    // Focus input
    setTimeout(() => document.getElementById('bubble-input').focus(), 100);
}

// Render bubbles in editor
function renderEditorBubbles() {
    const dateKey = formatDate(selectedDate);
    const bubbles = calendarData[dateKey] || [];
    const container = document.getElementById('bubbles-container');
    container.innerHTML = '';

    bubbles.forEach((bubble, index) => {
        const bubbleEl = createEditorBubble(bubble, index);
        container.appendChild(bubbleEl);
    });
}

// Create an editor bubble element
function createEditorBubble(bubble, index) {
    const el = document.createElement('div');
    el.className = `editor-bubble bubble-${bubble.color}`;

    // Bubble text
    const text = document.createElement('div');
    text.className = 'editor-bubble-text';
    text.textContent = bubble.text;
    el.appendChild(text);

    // Controls container (color picker + delete button)
    const controls = document.createElement('div');
    controls.className = 'editor-bubble-controls';

    // Color picker
    const picker = document.createElement('div');
    picker.className = 'color-picker';

    COLORS.forEach(color => {
        const option = document.createElement('div');
        option.className = `color-option bubble-${color}`;
        option.style.background = `var(--bubble-color)`;
        if (color === bubble.color) {
            option.classList.add('selected');
        }
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            changeBubbleColor(index, color);
        });
        picker.appendChild(option);
    });
    controls.appendChild(picker);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-bubble';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBubble(index);
    });
    controls.appendChild(deleteBtn);

    el.appendChild(controls);

    // Right-click handler to open schedule form with pre-filled data
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Open schedule form with empty start time and pre-fill with bubble data
        showScheduleForm('', 0, bubble.text, bubble.color);
    });

    return el;
}

// Add new bubble
function addBubble(text) {
    const dateKey = formatDate(selectedDate);
    if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
    }

    calendarData[dateKey].push({
        text: text,
        color: 'gray'
    });

    saveData();
    renderEditorBubbles();
}

// Delete bubble
function deleteBubble(index) {
    const dateKey = formatDate(selectedDate);
    calendarData[dateKey].splice(index, 1);

    if (calendarData[dateKey].length === 0) {
        delete calendarData[dateKey];
    }

    saveData();
    renderEditorBubbles();
}

// Change bubble color
function changeBubbleColor(index, color) {
    const dateKey = formatDate(selectedDate);
    calendarData[dateKey][index].color = color;

    saveData();
    renderEditorBubbles();
}

// Return to calendar view
function backToCalendar() {
    document.getElementById('editor-view').classList.remove('active');
    document.getElementById('calendar-view').classList.add('active');
    renderCalendar();
}

// Toggle important day status
function toggleImportantDay(date) {
    const dateKey = formatDate(date);

    if (importantDays.has(dateKey)) {
        importantDays.delete(dateKey);
    } else {
        importantDays.add(dateKey);
    }

    saveData();
    renderCalendar();
}

// Navigation
function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function prevDay() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    openEditor(newDate);
}

function nextDay() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    openEditor(newDate);
}

// Event listeners
document.getElementById('prev-month').addEventListener('click', prevMonth);
document.getElementById('next-month').addEventListener('click', nextMonth);

// Mobile navigation buttons
const prevMonthMobile = document.getElementById('prev-month-mobile');
const nextMonthMobile = document.getElementById('next-month-mobile');
if (prevMonthMobile) prevMonthMobile.addEventListener('click', prevMonth);
if (nextMonthMobile) nextMonthMobile.addEventListener('click', nextMonth);

document.getElementById('back-to-calendar').addEventListener('click', backToCalendar);
document.getElementById('prev-day').addEventListener('click', prevDay);
document.getElementById('next-day').addEventListener('click', nextDay);

// Bubble input - add on Enter
document.getElementById('bubble-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = e.target;
        const text = input.value.trim();

        if (text) {
            addBubble(text);
            input.value = '';
        }
    }
});

// Window resize listener - recalculate bubbles
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        fillBubbles();
    }, 150); // Debounce to avoid too many recalculations
});

// Window controls and drag
if (window.__TAURI__) {
    const closeBtn = document.getElementById('close');
    const minimizeBtn = document.getElementById('minimize');
    const maximizeBtn = document.getElementById('maximize');

    if (closeBtn) {
        closeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await window.__TAURI__.window.getCurrentWindow().close();
            } catch (err) {
                console.error('Close error:', err);
            }
        });
    }

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await window.__TAURI__.window.getCurrentWindow().minimize();
            } catch (err) {
                console.error('Minimize error:', err);
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await window.__TAURI__.window.getCurrentWindow().toggleMaximize();
            } catch (err) {
                console.error('Maximize error:', err);
            }
        });
    }

    // Manual window dragging on titlebar
    const titlebar = document.querySelector('.titlebar');

    if (titlebar) {
        titlebar.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on buttons
            if (e.target.closest('.window-button') || e.target.closest('.settings-button')) {
                return;
            }
            try {
                window.__TAURI__.window.getCurrentWindow().startDragging();
            } catch (err) {
                console.error('Drag error:', err);
            }
        });
    }
} else {
    console.warn('Tauri API not available - running in browser mode');
    // Hide window controls in web mode
    const windowControls = document.getElementById('window-controls');
    if (windowControls) {
        windowControls.style.display = 'none';
    }
    // Hide autostart setting in web mode
    const autostartSetting = document.getElementById('autostart-setting');
    if (autostartSetting) {
        autostartSetting.style.display = 'none';
    }
}

// Settings navigation
const settingsBtn = document.getElementById('settings-btn');
console.log('Settings button:', settingsBtn);

if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        console.log('Settings clicked!');
        e.preventDefault();
        e.stopPropagation();

        // Hide all views first
        document.getElementById('calendar-view').classList.remove('active');
        document.getElementById('editor-view').classList.remove('active');
        document.getElementById('import-export-view').classList.remove('active');

        // Show settings view
        document.getElementById('settings-view').classList.add('active');
    });
}

// Today button - return to current month and calendar view from anywhere
const todayBtn = document.getElementById('today-btn');
if (todayBtn) {
    todayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Reset to today's date
        currentDate = new Date();

        // Hide all views
        document.getElementById('calendar-view').classList.remove('active');
        document.getElementById('editor-view').classList.remove('active');
        document.getElementById('settings-view').classList.remove('active');
        document.getElementById('import-export-view').classList.remove('active');

        // Show calendar view
        document.getElementById('calendar-view').classList.add('active');

        // Render calendar
        renderCalendar();
    });
}

document.getElementById('back-from-settings').addEventListener('click', () => {
    document.getElementById('settings-view').classList.remove('active');
    document.getElementById('calendar-view').classList.add('active');
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    saveData();
});

// Time format toggle
function updateTimeFormatButton() {
    const button = document.getElementById('time-format-toggle');
    if (button) {
        button.textContent = use24HourTime ? 'Use 12-Hour Time' : 'Use 24-Hour Time';
    }
}

document.getElementById('time-format-toggle').addEventListener('click', () => {
    use24HourTime = !use24HourTime;
    updateTimeFormatButton();
    saveData();

    // Re-render timeline if we're currently viewing it
    if (selectedDate) {
        renderTimeline();
    }
});

// Reset data
document.getElementById('reset-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        localStorage.clear();
        calendarData = {};
        importantDays = new Set();
        dailySchedule = {};
        document.body.classList.remove('light-mode');
        renderCalendar();
        alert('All data has been reset.');
    }
});

// Import/Export navigation
document.getElementById('import-export-btn').addEventListener('click', () => {
    document.getElementById('settings-view').classList.remove('active');
    document.getElementById('import-export-view').classList.add('active');

    // Populate textarea with current data (formatted) plus schema info
    const exportData = {
        _schema: {
            description: "Calendarly data format - Edit this JSON and import it back",
            availableColors: COLORS,
            dateFormat: "YYYY-MM-DD (e.g., 2025-03-15)",
            timeFormat: "HH:MM in 24-hour format (e.g., 14:30 for 2:30 PM)",
            exampleNote: {
                text: "Example note text",
                color: "blue"
            },
            exampleScheduleItem: {
                text: "Hockey practice",
                start: "18:00",
                end: "19:30",
                color: "green"
            }
        },
        notes: calendarData,
        important: [...importantDays],
        schedule: dailySchedule,
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark'
    };
    document.getElementById('json-textarea').value = JSON.stringify(exportData, null, 2);
});

document.getElementById('back-from-import-export').addEventListener('click', () => {
    document.getElementById('import-export-view').classList.remove('active');
    document.getElementById('settings-view').classList.add('active');
});

// Copy JSON to clipboard
document.getElementById('copy-json-btn').addEventListener('click', async () => {
    const textarea = document.getElementById('json-textarea');
    try {
        await navigator.clipboard.writeText(textarea.value);
        alert('JSON copied to clipboard!');
    } catch (err) {
        // Fallback for older browsers
        textarea.select();
        document.execCommand('copy');
        alert('JSON copied to clipboard!');
    }
});

// Import JSON from textarea
document.getElementById('import-json-btn').addEventListener('click', () => {
    const textarea = document.getElementById('json-textarea');
    try {
        const data = JSON.parse(textarea.value);

        // Validate structure
        if (typeof data !== 'object') {
            throw new Error('JSON must be an object');
        }

        // Import data (ignore _schema field)
        calendarData = data.notes || {};
        importantDays = new Set(data.important || []);
        dailySchedule = data.schedule || {};

        // Apply theme
        if (data.theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        // Save to localStorage
        saveData();

        // Refresh calendar
        renderCalendar();

        alert('Data imported successfully!');
    } catch (err) {
        alert('Invalid JSON format:\n\n' + err.message);
    }
});

// Autostart toggle
async function updateAutostartButton() {
    if (!window.__TAURI__ || !window.__TAURI__.autostart) {
        return;
    }

    try {
        const isEnabled = await window.__TAURI__.autostart.isEnabled();
        const button = document.getElementById('autostart-toggle');
        button.textContent = isEnabled ? 'Disable Autostart' : 'Enable Autostart';
    } catch (err) {
        console.error('Check autostart error:', err);
    }
}

document.getElementById('autostart-toggle').addEventListener('click', async () => {
    if (!window.__TAURI__ || !window.__TAURI__.autostart) {
        alert('Autostart is only available in the desktop app');
        return;
    }

    try {
        const isEnabled = await window.__TAURI__.autostart.isEnabled();

        if (isEnabled) {
            await window.__TAURI__.autostart.disable();
            alert('Autostart disabled');
        } else {
            await window.__TAURI__.autostart.enable();
            alert('Autostart enabled! Calendarly will now start when you log in.');
        }

        await updateAutostartButton();
    } catch (err) {
        console.error('Toggle autostart error:', err);
        alert('Could not toggle autostart: ' + err.message);
    }
});

// Update autostart button when settings view is shown
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active') &&
            mutation.target.id === 'settings-view') {
            updateAutostartButton();
        }
    });
});

const settingsView = document.getElementById('settings-view');
if (settingsView) {
    observer.observe(settingsView, { attributes: true, attributeFilter: ['class'] });
}

// ===== DAILY SCHEDULE / TIMELINE =====

// Find closest time option to start time (for end time inference)
function findClosestTime(startTime, endInput, flip = false) {
    if (!startTime || !endInput) return null;

    // Parse start time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;

    // Parse end input
    const timeMatch = endInput.trim().match(/(\d{1,2}):?(\d{2})?/);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1]);
    let minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    if (hours > 23 || minutes > 59) return null;

    // If already in 24h format (>= 13), use as-is
    if (hours >= 13) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // For 1-12, we have two options: AM and PM
    const amHour = hours === 12 ? 0 : hours;
    const pmHour = hours === 12 ? 12 : hours + 12;

    const amMinutes = amHour * 60 + minutes;
    const pmMinutes = pmHour * 60 + minutes;

    // Calculate forward distances (only future times)
    const amDist = amMinutes > startMinutes ? amMinutes - startMinutes : (24 * 60) - startMinutes + amMinutes;
    const pmDist = pmMinutes > startMinutes ? pmMinutes - startMinutes : (24 * 60) - startMinutes + pmMinutes;

    // Choose closest
    let chosenHour = amDist <= pmDist ? amHour : pmHour;

    // If flip is true, use the other option
    if (flip) {
        chosenHour = chosenHour === amHour ? pmHour : amHour;
    }

    return `${String(chosenHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Render the timeline with 24 hours (00:00 to 23:59)
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    // Create 24 hours worth of 30-min slots (48 slots total)
    for (let hour = 0; hour < 24; hour++) {
        for (let halfHour = 0; halfHour < 2; halfHour++) {
            const minutes = halfHour * 30;
            const timeString = `${String(hour % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.dataset.time = timeString;
            slot.dataset.hour = hour;

            // Only show label on the hour
            if (minutes === 0) {
                const label = document.createElement('div');
                label.className = 'time-label';
                label.textContent = formatTime(timeString);
                slot.appendChild(label);
            }

            slot.addEventListener('click', () => showScheduleForm(timeString, hour));

            timeline.appendChild(slot);
        }
    }

    // Add bubbles container for schedule items
    const bubblesContainer = document.createElement('div');
    bubblesContainer.className = 'schedule-bubbles-container';
    bubblesContainer.id = 'schedule-bubbles';
    timeline.appendChild(bubblesContainer);

    container.appendChild(timeline);

    // Render schedule items after a short delay to ensure timeline is measured
    requestAnimationFrame(() => {
        renderScheduleItems();
    });
}

// Render schedule items as bubbles on the timeline
function renderScheduleItems() {
    const dateKey = formatDate(selectedDate);
    const scheduleItems = dailySchedule[dateKey] || [];
    const container = document.getElementById('schedule-bubbles');

    if (!container) return;

    container.innerHTML = '';

    // Render items for current day
    scheduleItems.forEach((item, index) => {
        const bubble = createScheduleBubble(item, index, dateKey);
        container.appendChild(bubble);
    });

    // Check previous day for events that bleed into today
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateKey = formatDate(prevDate);
    const prevScheduleItems = dailySchedule[prevDateKey] || [];

    prevScheduleItems.forEach((item, index) => {
        // Check if event ends after midnight (bleeds into current day)
        const [endHour, endMin] = item.end.split(':').map(Number);
        const [startHour, startMin] = item.start.split(':').map(Number);

        // If end time is before start time, it bleeds into next day
        if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
            // Create a modified item that starts at 00:00 on current day
            const bleedItem = {
                ...item,
                start: '00:00',
                // Keep the original end time
            };
            const bubble = createScheduleBubble(bleedItem, index, prevDateKey, true);
            container.appendChild(bubble);
        }
    });
}

// Create a schedule bubble element
function createScheduleBubble(item, index, dateKey, isFromPrevDay = false) {
    const bubble = document.createElement('div');
    bubble.className = `schedule-bubble bubble-${item.color}`;

    // Add visual indicator if from previous day
    if (isFromPrevDay) {
        bubble.style.opacity = '0.7';
        bubble.style.borderLeft = '3px solid var(--bubble-color)';
    }

    // Calculate position based on time
    const {top, height} = calculateBubblePosition(item.start, item.end);
    bubble.style.top = `${top}px`;
    bubble.style.height = `${height}px`;

    // Add text
    const text = document.createElement('div');
    text.className = 'schedule-bubble-text';
    text.textContent = item.text + (isFromPrevDay ? ' (from prev day)' : '');
    bubble.appendChild(text);

    // Add delete button (only for items on current day)
    if (!isFromPrevDay) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-bubble';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteScheduleItem(index);
        });
        bubble.appendChild(deleteBtn);

        // Click handler to edit this schedule item
        bubble.addEventListener('click', (e) => {
            // Don't trigger if clicking delete button
            if (e.target.classList.contains('delete-bubble')) {
                return;
            }
            editScheduleItem(index, item);
        });
        bubble.style.cursor = 'pointer';
    }

    return bubble;
}

// Calculate bubble position from start/end times
function calculateBubblePosition(startTime, endTime) {
    // Get dynamic slot height from timeline
    const timeline = document.querySelector('.timeline');
    if (!timeline) return {top: 0, height: 20};

    const totalSlots = 48; // 24 hours * 2 (30-min slots)
    const slotHeight = timeline.clientHeight / totalSlots;

    // Parse start time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startSlots = (startHour * 2) + (startMin >= 30 ? 1 : 0);
    const top = startSlots * slotHeight;

    // Parse end time
    const [endHour, endMin] = endTime.split(':').map(Number);
    let endSlots = (endHour * 2) + (endMin > 30 ? 2 : (endMin > 0 ? 1 : 0));

    // Handle next-day times (if end time is less than start time, it's next day)
    if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
        endSlots += 48; // Add 24 hours worth of slots
    }

    const height = Math.max((endSlots - startSlots) * slotHeight, slotHeight / 2);

    return {top, height};
}

// Show schedule form to add new item
function showScheduleForm(clickedTime, hour, prefillText = '', prefillColor = 'blue') {
    // Remove any existing form
    const existingForm = document.querySelector('.schedule-form');
    if (existingForm) {
        existingForm.remove();
    }

    const form = document.createElement('div');
    form.className = 'schedule-form';

    // Calculate position dynamically
    const timeline = document.querySelector('.timeline');
    const container = document.getElementById('timeline-container');
    const totalSlots = 48;
    const slotHeight = timeline.clientHeight / totalSlots;
    let top = hour * 2 * slotHeight;

    // Check if form would overflow bottom of container
    // Assume form height is ~250px
    const formHeight = 250;
    const containerHeight = container.clientHeight;

    if (top + formHeight > containerHeight) {
        // Position above the clicked time instead
        top = Math.max(0, top - formHeight);
    }

    form.style.top = `${top}px`;
    form.style.left = '70px';

    // Text input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Event title...';
    textInput.id = 'schedule-text-input';
    textInput.autocomplete = 'off';
    textInput.value = prefillText; // Pre-fill text if provided
    form.appendChild(textInput);

    // Time inputs row
    const timeRow = document.createElement('div');
    timeRow.className = 'schedule-form-row';

    const startInput = document.createElement('input');
    startInput.type = 'text';
    startInput.value = clickedTime ? formatTime(clickedTime, true) : ''; // Show AM/PM in form, or blank if no time
    startInput.placeholder = 'Start time';
    startInput.id = 'schedule-start-input';
    startInput.autocomplete = 'off';
    if (clickedTime) {
        startInput.dataset.time24h = clickedTime; // Store 24h format internally
    }
    timeRow.appendChild(startInput);

    const endInput = document.createElement('input');
    endInput.type = 'text';
    endInput.placeholder = 'End time';
    endInput.id = 'schedule-end-input';
    endInput.autocomplete = 'off';
    timeRow.appendChild(endInput);

    // Flip toggle button
    let flipped = false;
    const flipBtn = document.createElement('button');
    flipBtn.type = 'button';
    flipBtn.textContent = '⇄';
    flipBtn.className = 'flip-btn';
    flipBtn.title = 'Flip AM/PM';
    flipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        flipped = !flipped;
        flipBtn.classList.toggle('active', flipped);
        // Update the display immediately
        updateEndTimeDisplay();
    });
    timeRow.appendChild(flipBtn);

    // Auto-update end time display as user types
    function updateEndTimeDisplay() {
        const rawValue = endInput.dataset.rawValue || endInput.value;
        const parsed = findClosestTime(startInput.value, rawValue, flipped);
        if (parsed) {
            // Convert to 12h format for display
            const [h, m] = parsed.split(':').map(Number);
            const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h >= 12 ? 'PM' : 'AM';
            endInput.value = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
            endInput.dataset.parsed24h = parsed; // Store the 24h version
        }
    }

    let typingTimeout;
    endInput.addEventListener('input', () => {
        // Store the raw typed value
        endInput.dataset.rawValue = endInput.value;

        // Reset flip when user types
        flipped = false;
        flipBtn.classList.remove('active');

        // Only auto-update if they've typed complete minutes (has colon AND 2 digits after it, or 3+ digits total)
        const value = endInput.value;
        const hasColonWithMinutes = value.includes(':') && value.split(':')[1] && value.split(':')[1].length >= 2;
        const hasMinutes = hasColonWithMinutes || value.replace(/\D/g, '').length >= 3;

        // Update after short delay (when they stop typing)
        clearTimeout(typingTimeout);
        if (hasMinutes) {
            typingTimeout = setTimeout(() => {
                updateEndTimeDisplay();
            }, 500);
        }
    });

    form.appendChild(timeRow);

    // Color picker
    const colorPicker = document.createElement('div');
    colorPicker.className = 'color-picker';
    let selectedColor = prefillColor; // Use pre-filled color

    COLORS.forEach(color => {
        const option = document.createElement('div');
        option.className = `color-option bubble-${color}`;
        option.style.background = `var(--bubble-color)`;
        if (color === selectedColor) {
            option.classList.add('selected');
        }
        option.addEventListener('click', () => {
            colorPicker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = color;
        });
        colorPicker.appendChild(option);
    });
    form.appendChild(colorPicker);

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'schedule-form-buttons';

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        const startParsed = parseTimeInput(startInput.value);
        const endParsed = endInput.dataset.parsed24h || findClosestTime(startParsed || clickedTime, endInput.value, flipped);

        if (text && startParsed && endParsed) {
            addScheduleItem(text, startParsed, endParsed, selectedColor);
            form.remove();
        } else if (text && (startInput.value || endInput.value)) {
            alert('Invalid time format. Use ' + (use24HourTime ? 'HH:MM (e.g., 9:30, 14:00)' : 'h:MM AM/PM (e.g., 9:30 AM, 2:00 PM)'));
        }
    });
    buttons.appendChild(addBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => form.remove());
    buttons.appendChild(cancelBtn);

    form.appendChild(buttons);

    // Add Enter key support
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && textInput.value.trim() && startInput.value && endInput.value) {
            addBtn.click();
        }
    });

    document.getElementById('timeline-container').appendChild(form);
    textInput.focus();
}

// Show schedule form to edit existing item
function showScheduleFormForEdit(clickedTime, hour, prefillText, prefillColor, prefillEndTime, itemIndex) {
    // Remove any existing form
    const existingForm = document.querySelector('.schedule-form');
    if (existingForm) {
        existingForm.remove();
    }

    const form = document.createElement('div');
    form.className = 'schedule-form';

    // Calculate position dynamically
    const timeline = document.querySelector('.timeline');
    const container = document.getElementById('timeline-container');
    const totalSlots = 48;
    const slotHeight = timeline.clientHeight / totalSlots;
    let top = hour * 2 * slotHeight;

    // Check if form would overflow bottom of container
    const formHeight = 250;
    const containerHeight = container.clientHeight;

    if (top + formHeight > containerHeight) {
        top = Math.max(0, top - formHeight);
    }

    form.style.top = `${top}px`;
    form.style.left = '70px';

    // Text input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Event title...';
    textInput.id = 'schedule-text-input';
    textInput.autocomplete = 'off';
    textInput.value = prefillText;
    form.appendChild(textInput);

    // Time inputs row
    const timeRow = document.createElement('div');
    timeRow.className = 'schedule-form-row';

    const startInput = document.createElement('input');
    startInput.type = 'text';
    startInput.value = formatTime(clickedTime, true); // Show AM/PM in form
    startInput.placeholder = 'Start time';
    startInput.id = 'schedule-start-input';
    startInput.autocomplete = 'off';
    startInput.dataset.time24h = clickedTime; // Store 24h format internally
    timeRow.appendChild(startInput);

    const endInput = document.createElement('input');
    endInput.type = 'text';
    endInput.placeholder = 'End time';
    endInput.id = 'schedule-end-input';
    endInput.autocomplete = 'off';
    // Display end time in selected format with AM/PM
    endInput.value = formatTime(prefillEndTime, true);
    endInput.dataset.parsed24h = prefillEndTime;
    timeRow.appendChild(endInput);

    // Flip toggle button
    let flipped = false;
    const flipBtn = document.createElement('button');
    flipBtn.type = 'button';
    flipBtn.textContent = '⇄';
    flipBtn.className = 'flip-btn';
    flipBtn.title = 'Flip AM/PM';
    flipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        flipped = !flipped;
        flipBtn.classList.toggle('active', flipped);
        updateEndTimeDisplay();
    });
    timeRow.appendChild(flipBtn);

    // Auto-update end time display as user types
    function updateEndTimeDisplay() {
        const rawValue = endInput.dataset.rawValue || endInput.value;
        const parsed = findClosestTime(startInput.value, rawValue, flipped);
        if (parsed) {
            const [h, m] = parsed.split(':').map(Number);
            const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h >= 12 ? 'PM' : 'AM';
            endInput.value = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
            endInput.dataset.parsed24h = parsed;
        }
    }

    let typingTimeout;
    endInput.addEventListener('input', () => {
        endInput.dataset.rawValue = endInput.value;
        flipped = false;
        flipBtn.classList.remove('active');

        const value = endInput.value;
        const hasColonWithMinutes = value.includes(':') && value.split(':')[1] && value.split(':')[1].length >= 2;
        const hasMinutes = hasColonWithMinutes || value.replace(/\D/g, '').length >= 3;

        clearTimeout(typingTimeout);
        if (hasMinutes) {
            typingTimeout = setTimeout(() => {
                updateEndTimeDisplay();
            }, 500);
        }
    });

    form.appendChild(timeRow);

    // Color picker
    const colorPicker = document.createElement('div');
    colorPicker.className = 'color-picker';
    let selectedColor = prefillColor;

    COLORS.forEach(color => {
        const option = document.createElement('div');
        option.className = `color-option bubble-${color}`;
        option.style.background = `var(--bubble-color)`;
        if (color === selectedColor) {
            option.classList.add('selected');
        }
        option.addEventListener('click', () => {
            colorPicker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = color;
        });
        colorPicker.appendChild(option);
    });
    form.appendChild(colorPicker);

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'schedule-form-buttons';

    const updateBtn = document.createElement('button');
    updateBtn.className = 'add-btn';
    updateBtn.textContent = 'Update';
    updateBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        const startParsed = parseTimeInput(startInput.value);
        const endParsed = endInput.dataset.parsed24h || findClosestTime(startParsed || clickedTime, endInput.value, flipped);

        if (text && startParsed && endParsed) {
            updateScheduleItem(itemIndex, text, startParsed, endParsed, selectedColor);
            form.remove();
        } else if (text && (startInput.value || endInput.value)) {
            alert('Invalid time format. Use ' + (use24HourTime ? 'HH:MM (e.g., 9:30, 14:00)' : 'h:MM AM/PM (e.g., 9:30 AM, 2:00 PM)'));
        }
    });
    buttons.appendChild(updateBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => form.remove());
    buttons.appendChild(cancelBtn);

    form.appendChild(buttons);

    // Add Enter key support
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && textInput.value.trim() && startInput.value && endInput.value) {
            updateBtn.click();
        }
    });

    document.getElementById('timeline-container').appendChild(form);
    textInput.focus();
}

// Add schedule item
function addScheduleItem(text, start, end, color) {
    const dateKey = formatDate(selectedDate);

    if (!dailySchedule[dateKey]) {
        dailySchedule[dateKey] = [];
    }

    dailySchedule[dateKey].push({
        text,
        start,
        end,
        color
    });

    saveData();
    renderScheduleItems();
}

// Edit existing schedule item
function editScheduleItem(index, item) {
    // Parse the start time to get the hour for form positioning
    const [startHour] = item.start.split(':').map(Number);

    // Show the schedule form with pre-filled data
    showScheduleFormForEdit(item.start, startHour, item.text, item.color, item.end, index);
}

// Update existing schedule item
function updateScheduleItem(index, text, start, end, color) {
    const dateKey = formatDate(selectedDate);

    if (dailySchedule[dateKey] && dailySchedule[dateKey][index]) {
        dailySchedule[dateKey][index] = {
            text,
            start,
            end,
            color
        };

        saveData();
        renderScheduleItems();
    }
}

// Delete schedule item
function deleteScheduleItem(index) {
    const dateKey = formatDate(selectedDate);

    if (dailySchedule[dateKey]) {
        dailySchedule[dateKey].splice(index, 1);

        if (dailySchedule[dateKey].length === 0) {
            delete dailySchedule[dateKey];
        }

        saveData();
        renderScheduleItems();
    }
}

// Sync button event listeners
document.getElementById('sync-register-btn').addEventListener('click', registerAccount);
document.getElementById('sync-login-btn').addEventListener('click', loginToSync);
document.getElementById('sync-logout-btn').addEventListener('click', logoutFromSync);
document.getElementById('sync-push-btn').addEventListener('click', pushToCloud);
document.getElementById('sync-pull-btn').addEventListener('click', pullFromCloud);

// Initialize
initGun();
loadData();
renderCalendar();
updateAutostartButton();
updateTimeFormatButton();
