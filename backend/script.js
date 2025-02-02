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
        // Simulate speed test (replace with real API call)
        const simulateSpeedTest = () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        speed: Math.floor(Math.random() * 100) + 1,
                        download: (Math.random() * 90).toFixed(1),
                        upload: (Math.random() * 50).toFixed(1),
                        ping: Math.floor(Math.random() * 50) + 1,
                        jitter: Math.floor(Math.random() * 20) + 1,
                    });
                }, 2000); // Simulate a 2-second delay
            });
        };

        const results = await simulateSpeedTest();

        // Update UI with results
        document.getElementById("speed").textContent = results.speed;
        document.getElementById("download").textContent = results.download;
        document.getElementById("upload").textContent = results.upload;
        document.getElementById("ping").textContent = results.ping;
        document.getElementById("jitter").textContent = results.jitter;

        // Rotate needle smoothly based on speed
        let angle = (results.speed / 100) * 180 - 90;
        document.querySelector(".needle").style.transform = `rotate(${angle}deg)`;

        // Add results to history
        history.push(results);
        updateHistory();

        // Play sound
        document.getElementById("complete-sound").play();
    } catch (error) {
        console.error("Error during speed test:", error);
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