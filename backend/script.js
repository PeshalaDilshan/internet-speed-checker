let history = [];

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
        const response = await fetch("https://api.speedtest.net/v1/speedtest");
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
        console.error("Error fetching speed data:", error);
        document.getElementById("speed").textContent = "Error";
        document.getElementById("download").textContent = "Error";
        document.getElementById("upload").textContent = "Error";
        document.getElementById("ping").textContent = "Error";
        document.getElementById("jitter").textContent = "Error";
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
