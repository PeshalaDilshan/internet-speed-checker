const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Load the HTML file content
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// Create a new JSDOM instance for each test (or group of tests)
let dom;
let document;
let window;
// history variable from script.js will be accessed via window.getHistory() / window.setHistory()
let themeSelector; // The theme selector element

// Functions from script.js - these will be loaded after the DOM is set up
let updateHistory, exportHistory, applyTheme, saveThemePreference, loadSavedTheme;
let getHistory, setHistory, resetHistory; // History management functions

beforeEach(() => {
    dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost" });
    window = dom.window;
    document = window.document;

    // Make JSDOM globals available to the script
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage; // Use JSDOM's localStorage
    
    // Mock functions directly on the JSDOM window object
    // before the script is loaded and executed.
    window.alert = jest.fn(); 
    global.alert = window.alert; // Also keep global mock for direct test checks if needed

    window.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
    global.URL.createObjectURL = window.URL.createObjectURL;

    window.URL.revokeObjectURL = jest.fn();
    global.URL.revokeObjectURL = window.URL.revokeObjectURL;
    
    global.Blob = jest.fn((data, options) => ({ // Mock Blob
        data: data,
        type: options.type,
        size: data.reduce((acc, curr) => acc + curr.length, 0) 
    }));


    // Load the script content and execute it in the JSDOM context
    const scriptContent = fs.readFileSync(path.resolve(__dirname, './script.js'), 'utf8');
    const scriptEl = document.createElement("script");
    scriptEl.textContent = scriptContent;
    document.body.appendChild(scriptEl);

    // Access functions and variables from the script's scope (attached to window in script.js)
    updateHistory = window.updateHistory;
    exportHistory = window.exportHistory;
    applyTheme = window.applyTheme;
    saveThemePreference = window.saveThemePreference;
    loadSavedTheme = window.loadSavedTheme;
    getHistory = window.getHistory;
    setHistory = window.setHistory;
    resetHistory = window.resetHistory;

    // Reset history for each test using the exposed function
    if(typeof resetHistory === 'function') resetHistory();

    themeSelector = document.getElementById('theme-select');

    // Mock functions that might not be fully implemented in JSDOM or are external
    const completeSoundElement = document.getElementById('complete-sound');
    if (completeSoundElement) {
        completeSoundElement.play = jest.fn();
    }
});

afterEach(() => {
    // Clean up JSDOM window globals
    global.window = undefined;
    global.document = undefined;
    global.localStorage = undefined;
    global.alert = undefined;
    global.Blob = undefined; // Clean up mock Blob
    jest.clearAllMocks();
});

describe('updateHistory', () => {
    let historyListMock;

    beforeEach(() => {
        historyListMock = { innerHTML: '' };
        // Ensure getElementById is spied on correctly for 'history-list'
        // and falls back for other elements like 'theme-select' or 'complete-sound'
        const originalGetElementById = document.getElementById.bind(document);
        jest.spyOn(document, 'getElementById').mockImplementation(id => {
            if (id === 'history-list') {
                return historyListMock;
            }
            return originalGetElementById(id); // Fallback to original for other elements
        });
    });

    test('should clear history list if history array is empty', () => {
        setHistory([]); // Use exposed setter
        updateHistory();
        expect(historyListMock.innerHTML.trim()).toBe('');
    });

    test('should render one item correctly', () => {
        setHistory([{ download: '100', upload: '50', ping: '10', jitter: '2' }]);
        updateHistory();
        const expectedHTML = `
        <li>
            <strong>Test 1:</strong>
            Download: 100 Mbps,
            Upload: 50 Mbps,
            Ping: 10 ms,
            Jitter: 2 ms
        </li>
    `.trim().replace(/\s*\n\s*/g, ''); // Normalize whitespace for comparison
        expect(historyListMock.innerHTML.trim().replace(/\s*\n\s*/g, '')).toBe(expectedHTML);
    });

    test('should render multiple items correctly', () => {
        setHistory([
            { download: '100', upload: '50', ping: '10', jitter: '2' },
            { download: '200', upload: '60', ping: '20', jitter: '3' }
        ]);
        updateHistory();
        const expectedHTML = `
        <li>
            <strong>Test 1:</strong>
            Download: 100 Mbps,
            Upload: 50 Mbps,
            Ping: 10 ms,
            Jitter: 2 ms
        </li>
    
        <li>
            <strong>Test 2:</strong>
            Download: 200 Mbps,
            Upload: 60 Mbps,
            Ping: 20 ms,
            Jitter: 3 ms
        </li>
    `.trim().replace(/\s*\n\s*/g, ''); // Normalize whitespace
        expect(historyListMock.innerHTML.trim().replace(/\s*\n\s*/g, '')).toBe(expectedHTML);
    });
});

describe('exportHistory', () => {
    let mockAnchor;

    beforeEach(() => {
        mockAnchor = {
            href: '',
            download: '',
            click: jest.fn(),
        };
        // Spy on createElement and make it return our mockAnchor for 'a' tags
        const originalCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation(tagName => {
            if (tagName === 'a') {
                return mockAnchor;
            }
            return originalCreateElement(tagName);
        });
        
        jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    });

    test('should alert and not download if history is empty', () => {
        setHistory([]);
        exportHistory();
        expect(global.alert).toHaveBeenCalledWith('No history to export.');
        expect(document.createElement).not.toHaveBeenCalledWith('a');
    });

    test('should trigger download with correct CSV data', () => {
        const testHistoryData = [{ download: '100.5', upload: '50.2', ping: '10', jitter: '2' }];
        setHistory(testHistoryData);
        
        exportHistory();

        expect(global.alert).not.toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
        
        const expectedHeader = "Test Number,Download (Mbps),Upload (Mbps),Ping (ms),Jitter (ms)";
        const expectedRow = `1,${testHistoryData[0].download},${testHistoryData[0].upload},${testHistoryData[0].ping},${testHistoryData[0].jitter}`;
        const expectedCsvString = [expectedHeader, expectedRow].join('\n');
        
        expect(global.Blob).toHaveBeenCalledWith([expectedCsvString], { type: 'text/csv' });

        expect(mockAnchor.download).toBe('speedtest_history.csv');
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
});

describe('Theme Functions', () => {
    beforeEach(() => {
        // Ensure mocks are set up correctly for each test
        jest.spyOn(document.body, 'setAttribute');
        jest.spyOn(window.localStorage.__proto__, 'setItem');
        jest.spyOn(window.localStorage.__proto__, 'getItem');
        
        // Re-fetch themeSelector in case it was removed in a previous test
        themeSelector = document.getElementById('theme-select'); 
    });

    describe('applyTheme', () => {
        test('should set data-theme attribute on body', () => {
            applyTheme('dark');
            expect(document.body.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });
    });

    describe('saveThemePreference', () => {
        test('should save theme to localStorage', () => {
            saveThemePreference('light');
            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
        });
    });

    describe('loadSavedTheme', () => {
        test('should apply saved theme and set selector if theme exists in localStorage', () => {
            localStorage.getItem.mockReturnValue('dark');
            loadSavedTheme();
            expect(localStorage.getItem).toHaveBeenCalledWith('theme');
            expect(document.body.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            if (themeSelector) { // Check if themeSelector exists
                expect(themeSelector.value).toBe('dark');
            } else {
                // This case should ideally not happen if HTML is set up correctly
                // but good for robustness
                console.warn("Theme selector not found in DOM for dark theme test");
            }
        });

        test('should apply neon theme and set selector if no theme in localStorage', () => {
            localStorage.getItem.mockReturnValue(null);
            loadSavedTheme();
            expect(document.body.setAttribute).toHaveBeenCalledWith('data-theme', 'neon');
            if (themeSelector) { // Check if themeSelector exists
                 expect(themeSelector.value).toBe('neon');
            } else {
                 console.warn("Theme selector not found in DOM for neon theme test");
            }
        });

        test('should handle themeSelector not being present gracefully during loadSavedTheme', () => {
            localStorage.getItem.mockReturnValue('dark');
            // Simulate themeSelector not being in the DOM
            if (themeSelector && themeSelector.parentNode) {
                themeSelector.parentNode.removeChild(themeSelector);
            }
            global.document.getElementById = (id_val) => { if(id_val === "theme-select") {return null} else {return Object.getPrototypeOf(document).getElementById.call(document, id_val);}};

            expect(() => loadSavedTheme()).not.toThrow();
            expect(document.body.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            // No expectation for themeSelector.value as it's simulated as absent
        });
    });
});
