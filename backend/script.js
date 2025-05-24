let history = [];
const SPEED_TEST_API_URL = "https://api.speedtest.net";

document.getElementById("start-btn").addEventListener("click", async function () {
    // Show loader
    document.querySelector(".loader").style.display = "block";

    // Clear previous results
    document.getElementById("speed").textContent = "...";
    document.getElementById("download").textContent = "...";
    document.getElementById("upload").textContent = "...";
    document.getElementById("ping").textContent = "...";
    document.getElementById("jitter").textContent = "...";

    try {
        // Replace with your Speedtest API endpoint
        const response = await fetch(SPEED_TEST_API_URL); // Changed to use constant
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        // Extract results
        const speed = data.download.bandwidth / 125000; // Convert bytes to Mbps
        const download = (speed * 0.9).toFixed(1); // Simulate download speed
        const upload = (speed * 0.2).toFixed(1); // Simulate upload speed
        const ping = data.ping.latency;
        const jitter = data.ping.jitter;

        // Update UI with results
        document.getElementById("speed").textContent = speed.toFixed(1);
        document.getElementById("download").textContent = download;
        document.getElementById("upload").textContent = upload;
        document.getElementById("ping").textContent = ping;
        document.getElementById("jitter").textContent = jitter;

        // Rotate needle smoothly based on speed
        let angle = (speed / 100) * 180 - 90;
        document.querySelector(".needle").style.transform = `rotate(${angle}deg)`;

        // Add results to history
        history.push({ speed: speed.toFixed(1), download, upload, ping, jitter });
        updateHistory();

        // Play sound
        document.getElementById("complete-sound").play();
    } catch (error) {
        console.error("Speed test API error:", error); // Log the actual error object

        let userErrorMessage = "Error fetching results."; // Default UI error message
        if (error.message.startsWith("API request failed")) { // Error from our !response.ok check
            userErrorMessage = `API error (${error.message.split(' ').pop()}). Please try again.`;
        } else if (error instanceof TypeError) { // Often indicates network issues
            userErrorMessage = "Network error. Check connection.";
        }

        document.getElementById("speed").textContent = userErrorMessage;
        document.getElementById("download").textContent = "---"; // Use neutral placeholders
        document.getElementById("upload").textContent = "---";
        document.getElementById("ping").textContent = "---";
        document.getElementById("jitter").textContent = "---";
    } finally {
        // Hide loader
        document.querySelector(".loader").style.display = "none";
    }
});

function updateHistory() {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = history
        .map(
            (result, index) => `
        <li>
            <strong>Test ${index + 1}:</strong>
            Download: ${result.download} Mbps,
            Upload: ${result.upload} Mbps,
            Ping: ${result.ping} ms,
            Jitter: ${result.jitter} ms
        </li>
    `
        )
        .join("");
}

function exportHistory() {
    if (history.length === 0) {
        alert("No history to export.");
        return;
    }

    const header = "Test Number,Download (Mbps),Upload (Mbps),Ping (ms),Jitter (ms)";
    const csvRows = history.map((result, index) => 
        `${index + 1},${result.download},${result.upload},${result.ping},${result.jitter}`
    );
    const csvString = [header, ...csvRows].join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "speedtest_history.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById("export-btn").addEventListener("click", exportHistory);

// Theme Switching Functionality
const themeSelector = document.getElementById('theme-select');

function applyTheme(themeValue) {
    document.body.setAttribute('data-theme', themeValue);
}

function saveThemePreference(themeValue) {
    localStorage.setItem('theme', themeValue);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
        if (themeSelector) { // Ensure themeSelector exists
            themeSelector.value = savedTheme;
        }
    } else {
        // Apply 'neon' as default if no theme is saved
        applyTheme('neon'); 
        if (themeSelector) { // Ensure themeSelector exists
            themeSelector.value = 'neon';
        }
    }
}

if (themeSelector) { // Ensure themeSelector exists before adding listener
    themeSelector.addEventListener('change', function() {
        const selectedTheme = themeSelector.value;
        applyTheme(selectedTheme);
        saveThemePreference(selectedTheme);
    });
}

// Load saved theme on page load
loadSavedTheme();

// Expose functions and history for testing
if (typeof window !== 'undefined') { // Ensure this only runs in a browser-like environment
    window.updateHistory = updateHistory;
    window.exportHistory = exportHistory;
    window.applyTheme = applyTheme;
    window.saveThemePreference = saveThemePreference;
    window.loadSavedTheme = loadSavedTheme;
    window.getHistory = () => history; // Expose the history array getter
    window.setHistory = (newHistory) => { history = newHistory; }; // Expose the history array setter
    window.resetHistory = () => { history = []; }; // Expose a way to reset history
}