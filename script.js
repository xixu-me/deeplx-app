/**
 * DeepLX Translation App
 * A modern web app for DeepL translation using the DeepLX API
 *
 * Features:
 * - Auto-translation with configurable delay
 * - Translation history with local storage
 * - RTL/LTR text direction support
 * - Responsive design with modern UI
 * - Keyboard shortcuts and accessibility
 *
 * @author Xi Xu
 * @version 1.0.0
 * @license MIT
 */

document.addEventListener("DOMContentLoaded", () => {
  // Configuration constants
  const CONFIG = {
    MAX_CHARS: 5000,
    DEFAULT_API_URL: "https://dplx.xi-xu.me/translate",
    DEFAULT_DELAY: 1000,
    MAX_HISTORY_ITEMS: 50,
    CORS_PROXY: "https://corsproxy.io/?",
  };

  // Supported languages list - DeepL API compatible language codes
  const languages = {
    AR: "Arabic",
    BG: "Bulgarian",
    CS: "Czech",
    DA: "Danish",
    DE: "German",
    EL: "Greek",
    EN: "English",
    ES: "Spanish",
    ET: "Estonian",
    FI: "Finnish",
    FR: "French",
    HU: "Hungarian",
    ID: "Indonesian",
    IT: "Italian",
    JA: "Japanese",
    KO: "Korean",
    LT: "Lithuanian",
    LV: "Latvian",
    NB: "Norwegian (bokmål)",
    NL: "Dutch",
    PL: "Polish",
    PT: "Portuguese",
    RO: "Romanian",
    RU: "Russian",
    SK: "Slovak",
    SL: "Slovenian",
    SV: "Swedish",
    TR: "Turkish",
    UK: "Ukrainian",
    ZH: "Chinese",
  };

  // Get DOM elements
  // DOM element references - cached for performance
  const elements = {
    sourceLangSelect: document.getElementById("sourceLang"),
    targetLangSelect: document.getElementById("targetLang"),
    inputText: document.getElementById("inputText"),
    outputText: document.getElementById("outputText"),
    swapButton: document.getElementById("swapButton"),
    copyButton: document.getElementById("copyButton"),
    loadingSpinner: document.getElementById("loadingSpinner"),
    statusMessage: document.getElementById("statusMessage"),
    apiUrlInput: document.getElementById("apiUrlInput"),
    historyButton: document.getElementById("historyButton"),
    settingsButton: document.getElementById("settingsButton"),
    historyPanel: document.getElementById("historyPanel"),
    settingsPanel: document.getElementById("settingsPanel"),
    closeHistoryButton: document.getElementById("closeHistoryButton"),
    closeSettingsButton: document.getElementById("closeSettingsButton"),
    historyList: document.getElementById("historyList"),
    historyCount: document.getElementById("historyCount"),
    clearHistoryButton: document.getElementById("clearHistoryButton"),
    delayInput: document.getElementById("delayInput"),
    autoTranslateToggle: document.getElementById("autoTranslateToggle"),
    charCount: document.getElementById("charCount"),
  };

  // App state
  let translateTimeout;
  let translationHistory = [];

  // Function to detect Arabic text
  /**
   * Utility Functions
   */

  /**
   * Detects if text contains Arabic characters
   * @param {string} text - Text to analyze
   * @returns {boolean} True if text contains Arabic characters
   */
  function isArabicText(text) {
    const arabicRegex =
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
  }

  /**
   * Applies appropriate text direction (RTL/LTR) based on text content
   * @param {HTMLElement} element - Element to apply direction to
   * @param {string} text - Text content to analyze
   */
  function applyTextDirection(element, text) {
    if (isArabicText(text)) {
      element.classList.add("rtl-text");
      element.classList.remove("ltr-text");
    } else {
      element.classList.add("ltr-text");
      element.classList.remove("rtl-text");
    }
  }

  // Character counter function
  /**
   * UI Update Functions
   */

  /**
   * Updates character counter and input field styling
   * Handles RTL/LTR text direction and placeholder updates
   */
  function updateCharCount() {
    const count = elements.inputText.value.length;
    elements.charCount.textContent = count;

    // Apply RTL/LTR direction based on input text
    applyTextDirection(elements.inputText, elements.inputText.value);

    // Update color based on character count
    elements.charCount.className = "transition-colors duration-200";
    if (count > 4500) {
      elements.charCount.classList.add("char-danger");
    } else if (count > 4000) {
      elements.charCount.classList.add("char-warning");
    }

    // Update placeholder based on auto-translate status
    if (elements.autoTranslateToggle.checked) {
      elements.inputText.placeholder =
        count === 0
          ? "Enter text to translate here... (Auto-translate enabled)"
          : "Auto-translate will start after you stop typing...";
    } else {
      elements.inputText.placeholder =
        "Enter text to translate here... (Auto-translate disabled)";
    }
  }

  // Populate language dropdown menus
  /**
   * Language Management Functions
   */

  /**
   * Populates language dropdown menus with sorted language options
   * Restores saved language selections or uses defaults
   */
  function populateLanguages() {
    elements.sourceLangSelect.innerHTML =
      '<option value="AUTO">Detect language</option>';

    // Sort languages alphabetically by name for better UX
    const sortedLanguages = Object.entries(languages).sort(([, a], [, b]) =>
      a.localeCompare(b)
    );

    sortedLanguages.forEach(([code, name]) => {
      elements.sourceLangSelect.add(new Option(name, code));
    });

    elements.targetLangSelect.innerHTML = "";
    sortedLanguages.forEach(([code, name]) => {
      elements.targetLangSelect.add(new Option(name, code));
    });

    // Restore saved language selections or use defaults
    const savedSourceLang = localStorage.getItem("deeplxSourceLang") || "AUTO";
    const savedTargetLang = localStorage.getItem("deeplxTargetLang") || "EN";

    elements.sourceLangSelect.value = savedSourceLang;
    elements.targetLangSelect.value = savedTargetLang;
  }

  // Load and save settings
  /**
   * Settings Management Functions
   */

  /**
   * Initializes app settings from localStorage
   * Sets up event listeners for settings changes
   */
  function setupSettings() {
    // Load saved settings with fallback defaults
    const savedUrl = localStorage.getItem("deeplxApiUrl");
    const savedDelay =
      localStorage.getItem("autoTranslateDelay") ||
      CONFIG.DEFAULT_DELAY.toString();
    const savedAutoTranslate =
      localStorage.getItem("autoTranslateEnabled") !== "false";

    elements.apiUrlInput.value = savedUrl || CONFIG.DEFAULT_API_URL;
    elements.delayInput.value = savedDelay;
    elements.autoTranslateToggle.checked = savedAutoTranslate;

    // Set up event listeners for settings persistence
    elements.apiUrlInput.addEventListener("input", () => {
      const urlToSave = elements.apiUrlInput.value.trim();
      if (urlToSave) {
        localStorage.setItem("deeplxApiUrl", urlToSave);
        showStatus("API endpoint saved.", "success");
      }
    });

    elements.delayInput.addEventListener("input", () => {
      const delay = elements.delayInput.value;
      localStorage.setItem("autoTranslateDelay", delay);
      showStatus("Delay setting saved.", "success");
    });

    elements.autoTranslateToggle.addEventListener("change", () => {
      localStorage.setItem(
        "autoTranslateEnabled",
        elements.autoTranslateToggle.checked
      );
      showStatus(
        `Auto-translate ${
          elements.autoTranslateToggle.checked ? "enabled" : "disabled"
        }.`,
        "success"
      );
      updateCharCount(); // Update placeholder when toggle changes
    });
  }

  // Load translation history
  /**
   * History Management Functions
   */

  /**
   * Loads translation history from localStorage
   */
  function loadHistory() {
    const saved = localStorage.getItem("translationHistory");
    if (saved) {
      translationHistory = JSON.parse(saved);
    }
    updateHistoryDisplay();
  }

  /**
   * Saves translation history to localStorage
   */
  function saveHistory() {
    localStorage.setItem(
      "translationHistory",
      JSON.stringify(translationHistory)
    );
  }

  /**
   * Adds a new translation to history
   * @param {string} sourceText - Original text
   * @param {string} targetText - Translated text
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   */
  function addToHistory(sourceText, targetText, sourceLang, targetLang) {
    const historyItem = {
      id: Date.now(),
      sourceText,
      targetText,
      sourceLang,
      targetLang,
      timestamp: new Date().toISOString(),
    };

    // Remove duplicate if exists
    translationHistory = translationHistory.filter(
      (item) =>
        item.sourceText !== sourceText ||
        item.sourceLang !== sourceLang ||
        item.targetLang !== targetLang
    );

    // Add to beginning of array
    translationHistory.unshift(historyItem);

    // Keep only last items as per config
    if (translationHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
      translationHistory = translationHistory.slice(
        0,
        CONFIG.MAX_HISTORY_ITEMS
      );
    }

    saveHistory();
    updateHistoryDisplay();
  }

  /**
   * Updates the history display panel
   */
  function updateHistoryDisplay() {
    elements.historyCount.textContent = `${translationHistory.length} records`;
    elements.historyList.innerHTML = "";

    translationHistory.forEach((item) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      const sourceTextClass = isArabicText(item.sourceText)
        ? "source-text rtl-text"
        : "source-text";
      const targetTextClass = isArabicText(item.targetText)
        ? "target-text rtl-text"
        : "target-text";

      historyItem.innerHTML = `
        <div class="${sourceTextClass}">${item.sourceText.substring(0, 100)}${
        item.sourceText.length > 100 ? "..." : ""
      }</div>
        <div class="${targetTextClass}">${item.targetText.substring(0, 100)}${
        item.targetText.length > 100 ? "..." : ""
      }</div>
        <div class="lang-info">${
          item.sourceLang === "AUTO"
            ? "Auto-detected"
            : languages[item.sourceLang] || item.sourceLang
        } → ${languages[item.targetLang] || item.targetLang}</div>
      `;

      historyItem.addEventListener("click", () => {
        elements.inputText.value = item.sourceText;
        elements.outputText.value = item.targetText;
        elements.sourceLangSelect.value = item.sourceLang;
        elements.targetLangSelect.value = item.targetLang;

        // Apply text direction for loaded history items
        applyTextDirection(elements.inputText, item.sourceText);
        applyTextDirection(elements.outputText, item.targetText);

        elements.historyPanel.classList.add("hidden");
        showStatus("History item loaded.", "success");
      });

      elements.historyList.appendChild(historyItem);
    });
  }

  // Display status message with enhanced animation
  /**
   * Status and Feedback Functions
   */

  /**
   * Displays status message with enhanced animation
   * @param {string} message - Message to display
   * @param {string} type - Message type ('error' or 'success')
   */
  function showStatus(message, type = "error") {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `text-sm h-5 text-right transition-all duration-300 ${
      type === "error" ? "text-red-400" : "text-green-400"
    }`;

    // Add fade-in animation
    elements.statusMessage.style.opacity = "0";
    elements.statusMessage.style.transform = "translateY(10px)";

    setTimeout(() => {
      elements.statusMessage.style.opacity = "1";
      elements.statusMessage.style.transform = "translateY(0)";
    }, 50);

    // Auto-hide message after 4 seconds
    if (message) {
      setTimeout(() => {
        elements.statusMessage.style.opacity = "0";
        setTimeout(() => {
          elements.statusMessage.textContent = "";
          elements.statusMessage.style.opacity = "1";
        }, 300);
      }, 4000);
    }
  }

  // Translation function
  /**
   * Translation Functions
   */

  /**
   * Main translation function that handles API requests
   * @param {boolean} isAutoTranslate - Whether this is an automatic translation
   */
  async function translateText(isAutoTranslate = false) {
    const originalApiUrl = elements.apiUrlInput.value.trim();
    if (!originalApiUrl) {
      showStatus("Please enter API endpoint.");
      return;
    }

    // Using CORS proxy to handle POST requests correctly
    const API_URL = `${CONFIG.CORS_PROXY}${encodeURIComponent(originalApiUrl)}`;

    const text = elements.inputText.value.trim();
    if (!text) {
      if (!isAutoTranslate) {
        showStatus("Please enter text to translate.");
      }
      elements.outputText.value = "";
      return;
    }

    setLoading(true);
    showStatus("", "success"); // Clear status

    try {
      const payload = {
        text: text,
        source_lang:
          elements.sourceLangSelect.value === "AUTO"
            ? undefined
            : elements.sourceLangSelect.value,
        target_lang: elements.targetLangSelect.value,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 404) {
        throw new Error(
          `Proxy cannot find API endpoint (404). Please check if URL is correct.`
        );
      }
      if (!response.ok) {
        throw new Error(
          `Network or proxy error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.code === 200) {
        elements.outputText.value = result.data;

        // Apply RTL/LTR direction to output text
        applyTextDirection(elements.outputText, result.data);

        // Show detected source language when auto-detect is used
        if (elements.sourceLangSelect.value === "AUTO" && result.source_lang) {
          const detectedLangName =
            languages[result.source_lang] || result.source_lang;
          showStatus(`Detected language: ${detectedLangName}`, "success");
        }

        // Add to history if translation was successful
        if (result.data && text) {
          // Use detected language for history when auto-detect is used
          const actualSourceLang =
            elements.sourceLangSelect.value === "AUTO" && result.source_lang
              ? result.source_lang
              : elements.sourceLangSelect.value;

          addToHistory(
            text,
            result.data,
            actualSourceLang,
            elements.targetLangSelect.value
          );
        }
      } else {
        // Provide more specific error message from API response
        throw new Error(`API error: ${result.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Translation request failed:", error);
      let errorMessage = `Error: ${error.message}`;
      if (error instanceof TypeError) {
        // This often indicates a network-level failure
        errorMessage =
          "Error: Request failed. Please check network connection and browser console.";
      }
      showStatus(errorMessage);
      elements.outputText.value = "";
    } finally {
      setLoading(false);
    }
  }

  // Auto-translate with debounce
  /**
   * Auto-translation Functions
   */

  /**
   * Schedules auto-translation with debounce
   */
  function scheduleAutoTranslate() {
    if (!elements.autoTranslateToggle.checked) return;

    clearTimeout(translateTimeout);
    const delay = parseInt(elements.delayInput.value) || CONFIG.DEFAULT_DELAY;

    translateTimeout = setTimeout(() => {
      translateText(true);
    }, delay);
  }

  /**
   * UI State Management Functions
   */

  /**
   * Sets loading state for the app
   * @param {boolean} isLoading - Whether app is in loading state
   */
  function setLoading(isLoading) {
    elements.loadingSpinner.classList.toggle("hidden", !isLoading);
  }

  /**
   * Language Management Functions
   */

  /**
   * Swaps source and target languages
   */
  function swapLanguages() {
    const source = elements.sourceLangSelect.value;
    const target = elements.targetLangSelect.value;

    // Don't swap if source is auto-detect
    if (source === "AUTO") {
      return;
    }

    elements.sourceLangSelect.value = target;
    elements.targetLangSelect.value = source;

    const inputTextValue = elements.inputText.value;
    elements.inputText.value = elements.outputText.value;
    elements.outputText.value = inputTextValue;

    // Apply text direction after swapping
    applyTextDirection(elements.inputText, elements.inputText.value);
    applyTextDirection(elements.outputText, elements.outputText.value);

    showStatus("", "success");
  }

  /**
   * Updates swap button state based on source language selection
   */
  function updateSwapButtonState() {
    const isAutoDetect = elements.sourceLangSelect.value === "AUTO";
    elements.swapButton.disabled = isAutoDetect;

    if (isAutoDetect) {
      elements.swapButton.classList.add("opacity-50", "cursor-not-allowed");
      elements.swapButton.classList.remove("hover:bg-gray-600");
      elements.swapButton.title = "Cannot swap when using Auto Detect";
    } else {
      elements.swapButton.classList.remove("opacity-50", "cursor-not-allowed");
      elements.swapButton.classList.add("hover:bg-gray-600");
      elements.swapButton.title = "Swap languages";
    }
  }

  /**
   * Clipboard and UI Interaction Functions
   */

  /**
   * Copies translation result to clipboard with visual feedback
   */
  function copyToClipboard() {
    if (!elements.outputText.value) {
      showStatus("No content to copy.");
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = elements.outputText.value;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showStatus("Copied to clipboard!", "success");

      // Add pulse animation to copy button
      elements.copyButton.classList.add("copy-success");
      setTimeout(() => {
        elements.copyButton.classList.remove("copy-success");
      }, 300);
    } catch (err) {
      showStatus("Copy failed.");
      console.error("Copy failed:", err);
    }
    document.body.removeChild(textarea);
  }

  /**
   * Panel Management Functions
   */

  /**
   * Shows the history panel
   */
  function showHistoryPanel() {
    elements.historyPanel.classList.remove("hidden");
    updateHistoryDisplay();
  }

  /**
   * Hides the history panel
   */
  function hideHistoryPanel() {
    elements.historyPanel.classList.add("hidden");
  }

  /**
   * Shows the settings panel
   */
  function showSettingsPanel() {
    elements.settingsPanel.classList.remove("hidden");
  }

  /**
   * Hides the settings panel
   */
  function hideSettingsPanel() {
    elements.settingsPanel.classList.add("hidden");
  }

  /**
   * Clears all translation history after confirmation
   */
  function clearHistory() {
    if (confirm("Are you sure you want to clear all translation history?")) {
      translationHistory = [];
      saveHistory();
      updateHistoryDisplay();
      showStatus("History cleared.", "success");
    }
  }

  /**
   * Animation and Visual Feedback Functions
   */

  /**
   * Adds visual feedback for successful operations
   * @param {HTMLElement} element - Element to animate
   */
  function addSuccessFeedback(element) {
    element.style.transform = "scale(1.05)";
    element.style.transition = "transform 0.2s ease";
    setTimeout(() => {
      element.style.transform = "scale(1)";
    }, 200);
  }

  /**
   * Enhanced swap function with animation
   */
  function swapLanguagesWithAnimation() {
    addSuccessFeedback(elements.swapButton);
    swapLanguages();
  }

  // Initialize
  /**
   * App Initialization
   */

  // Initialize core app components
  populateLanguages();
  setupSettings();
  loadHistory();
  updateCharCount(); // Initialize character counter
  updateSwapButtonState(); // Initialize swap button state
  lucide.createIcons(); // Initialize Lucide icons

  // Update copyright year
  const currentYearElement = document.getElementById("currentYear");
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  // Initial auto-translate if there's existing text
  if (elements.inputText.value.trim()) {
    scheduleAutoTranslate();
  }

  /**
   * Event Listeners Setup
   */

  // Button event listeners
  elements.swapButton.addEventListener("click", swapLanguagesWithAnimation);
  elements.copyButton.addEventListener("click", copyToClipboard);
  elements.historyButton.addEventListener("click", showHistoryPanel);
  elements.settingsButton.addEventListener("click", showSettingsPanel);
  elements.closeHistoryButton.addEventListener("click", hideHistoryPanel);
  elements.closeSettingsButton.addEventListener("click", hideSettingsPanel);
  elements.clearHistoryButton.addEventListener("click", clearHistory);

  // Auto-translate triggers
  elements.inputText.addEventListener("input", () => {
    updateCharCount();
    scheduleAutoTranslate();
  });
  elements.sourceLangSelect.addEventListener("change", () => {
    updateSwapButtonState();
    scheduleAutoTranslate();
    // Save source language selection
    localStorage.setItem("deeplxSourceLang", elements.sourceLangSelect.value);
  });
  elements.targetLangSelect.addEventListener("change", () => {
    scheduleAutoTranslate();
    // Save target language selection
    localStorage.setItem("deeplxTargetLang", elements.targetLangSelect.value);
  });

  // Panel management - close when clicking outside
  elements.historyPanel.addEventListener("click", (e) => {
    if (e.target === elements.historyPanel) {
      hideHistoryPanel();
    }
  });

  elements.settingsPanel.addEventListener("click", (e) => {
    if (e.target === elements.settingsPanel) {
      hideSettingsPanel();
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      translateText();
    }
    if (e.key === "Escape") {
      hideHistoryPanel();
      hideSettingsPanel();
    }
  });
});
