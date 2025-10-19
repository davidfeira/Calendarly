// Simple calendar data storage
let calendarData = {};
let importantDays = new Set(); // Store dates marked as important
let currentDate = new Date();
let selectedDate = null;

// Available colors
const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal', 'gray', 'brown'];

// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem('calendarly-data');
    if (stored) {
        calendarData = JSON.parse(stored);
    }

    const storedImportant = localStorage.getItem('calendarly-important');
    if (storedImportant) {
        importantDays = new Set(JSON.parse(storedImportant));
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('calendarly-data', JSON.stringify(calendarData));
    localStorage.setItem('calendarly-important', JSON.stringify([...importantDays]));
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const remainingCells = (rowsNeeded * 7) - totalCells - 7; // Fill to complete rows minus headers
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        const cell = createDayCell(date, true);
        calendarGrid.appendChild(cell);
    }

    // After rendering, fill in bubbles based on available space
    requestAnimationFrame(() => fillBubbles());

    // Render mini calendars
    renderMiniCalendar('mini-prev', new Date(year, month - 1, 1));
    renderMiniCalendar('mini-next', new Date(year, month + 1, 1));
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
        const availableHeight = preview.clientHeight;
        const bubbleHeight = 23; // Approximate height of a bubble (11px font + 8px padding + 4px gap)
        const maxBubbles = Math.floor(availableHeight / bubbleHeight);

        // Clear any existing bubbles
        preview.innerHTML = '';

        // Determine how many bubbles to show (leave room for "more" indicator if needed)
        const bubblestoShow = bubbles.length > maxBubbles ? maxBubbles - 1 : Math.min(bubbles.length, maxBubbles);

        // Add bubbles
        bubbles.slice(0, bubblestoShow).forEach(item => {
            const bubble = document.createElement('div');
            bubble.className = `note-bubble bubble-${item.color}`;
            bubble.textContent = item.text;
            preview.appendChild(bubble);
        });

        // Add "more" indicator if needed
        if (bubbles.length > bubblestoShow) {
            const moreBubble = document.createElement('div');
            moreBubble.className = 'note-bubble more';
            moreBubble.textContent = `+${bubbles.length - bubblestoShow} more`;
            preview.appendChild(moreBubble);
        }
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
    cell.appendChild(dayNumber);

    // Add preview if there's content
    const dateKey = formatDate(date);
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
    el.appendChild(picker);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-bubble';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBubble(index);
    });
    el.appendChild(deleteBtn);

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

// Event listeners
document.getElementById('prev-month').addEventListener('click', prevMonth);
document.getElementById('next-month').addEventListener('click', nextMonth);
document.getElementById('back-to-calendar').addEventListener('click', backToCalendar);

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
    console.warn('Tauri API not available');
}

// Settings navigation
const settingsBtn = document.getElementById('settings-btn');
console.log('Settings button:', settingsBtn);

if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        console.log('Settings clicked!');
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('calendar-view').classList.remove('active');
        document.getElementById('settings-view').classList.add('active');
    });
}

document.getElementById('back-from-settings').addEventListener('click', () => {
    document.getElementById('settings-view').classList.remove('active');
    document.getElementById('calendar-view').classList.add('active');
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

// Reset data
document.getElementById('reset-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        localStorage.clear();
        calendarData = {};
        importantDays = new Set();
        renderCalendar();
        alert('All data has been reset.');
    }
});

// Show data folder path
document.getElementById('open-data-folder').addEventListener('click', async () => {
    if (window.__TAURI__) {
        try {
            const dataDir = await window.__TAURI__.path.appDataDir();
            // Copy to clipboard
            navigator.clipboard.writeText(dataDir);
            alert('Data folder path copied to clipboard:\n\n' + dataDir);
        } catch (err) {
            console.error('Get path error:', err);
            alert('Could not get data folder path: ' + err.message);
        }
    } else {
        alert('Data is stored in browser localStorage\n(Open browser dev tools > Application > Local Storage)');
    }
});

// Initialize
loadData();
renderCalendar();
