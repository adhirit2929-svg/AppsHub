const fs = require("fs");

let html = fs.readFileSync("public/assets/aistudio/My-Apps-Hub_f6c97383.html", "utf8");

console.log("Starting apply_all_user_requests.cjs...");

// ============================================================================
// 1. CSS ENHANCEMENTS: Overflow-X, Responsive Sizing, Test Dots, Saved Key Cards
// ============================================================================

const newStyles = `
    /* Prevent Horizontal Scroll Globally */
    html, body {
      overflow-x: hidden !important;
      max-width: 100vw !important;
      width: 100% !important;
      box-sizing: border-box;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Test status dot in button */
    .test-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
      transition: background-color 0.2s, box-shadow 0.2s;
    }
    .test-dot.gray { background-color: #94a3b8; }
    .test-dot.green {
      background-color: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
    }
    .test-dot.red {
      background-color: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
    }
    .test-dot.yellow {
      background-color: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
    }

    /* Saved key cards in AI Keys Modal */
    .saved-key-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .saved-key-card.active-key {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, var(--surface));
      box-shadow: 0 0 0 1.5px var(--accent);
    }
    .saved-key-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .saved-key-title-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .saved-key-name {
      font-size: 14.5px;
      font-weight: 800;
      color: var(--text);
    }
    .saved-key-provider-tag {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .saved-key-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .saved-key-preview {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      color: var(--muted);
      background: var(--surface-2);
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      word-break: break-all;
    }
    .active-badge-pill {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 99px;
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: var(--accent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    }

    /* Small screens responsive adaptations */
    @media (max-width: 640px) {
      body {
        padding: 68px 12px 24px !important;
      }
      .topbar {
        padding: 8px 12px !important;
        min-height: 56px !important;
      }
      .brand-badge-pro {
        display: none !important;
      }
      .brand-name {
        font-size: 16px !important;
      }
      .topbar-actions {
        gap: 4px !important;
      }
      .user-badge-btn {
        padding: 4px 8px 4px 4px !important;
        font-size: 12px !important;
        max-width: 120px !important;
      }
      .user-badge-name {
        max-width: 50px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .account-type-mini-pill {
        display: none !important;
      }
      #topbarAiKeysBtn {
        padding: 4px 8px !important;
        font-size: 12px !important;
      }
      #themeToggle {
        padding: 6px 8px !important;
        font-size: 12px !important;
      }
      .card {
        padding: 18px 14px !important;
        border-radius: 18px !important;
      }
      .apps {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .app-card {
        min-height: auto !important;
        padding: 16px !important;
      }
      .app-icon {
        width: 44px !important;
        height: 44px !important;
        font-size: 24px !important;
        margin-bottom: 12px !important;
      }
      .calc-card {
        padding: 12px !important;
        border-radius: 18px !important;
      }
      .calc-btn {
        min-height: 44px !important;
        font-size: 15px !important;
      }
      .calc-grid-sci {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 6px !important;
      }
      .calc-header, .notes-header-fullscreen, .agent-header-fullscreen, .account-header {
        padding-left: 62px !important;
        padding-right: 12px !important;
      }
      .notes-body-fullscreen {
        grid-template-columns: 1fr !important;
      }
      .notes-sidebar-fullscreen {
        max-height: 200px !important;
        border-right: 0 !important;
        border-bottom: 1px solid var(--border) !important;
      }
      .ai-keys-modal-box, .modal-box, .modal-card {
        padding: 16px !important;
        width: 96vw !important;
        max-width: 96vw !important;
      }
    }
`;

if (!html.includes(".test-dot {")) {
  html = html.replace("<style>", "<style>" + newStyles);
  console.log("Added new CSS rules");
}

// ============================================================================
// 2. REMOVE "ANY PASSWORD ACCEPTED" COPY
// ============================================================================

html = html.replace(
  "Fast & offline. Any password accepted!",
  "Fast & offline on this device."
);
html = html.replace(
  "Local Account: Enter any password (must not be empty).",
  "Local Account: Enter your account password."
);
html = html.replace(
  "Any password accepted for local accounts.",
  "Enter your new account password."
);
html = html.replace(
  'passwordRuleHint.textContent = "Local Account: Enter any password (must not be empty).";',
  'passwordRuleHint.textContent = "Local Account: Enter your account password.";'
);
html = html.replace(
  'signupPasswordInput.placeholder = "Enter any password";',
  'signupPasswordInput.placeholder = "Enter your password";'
);
html = html.replace(
  ': "Local account is saved on this device with no password complexity rules.";',
  ': "Local account is saved on this device.";'
);
html = html.replace(
  ': "Local accounts accept any password (must not be empty).";',
  ': "Enter your new password.";'
);
console.log("Updated login/signup copy to remove 'any password accepted'");

// ============================================================================
// 3. REVISE AI KEYS MODAL HTML: Saved Keys List + Add Key Form
// ============================================================================

const oldModalHtmlStart = '<div class="ai-keys-modal-overlay" id="aiKeysModal">';
const oldModalHtmlEnd = '<!-- Decrypt Modal -->';

const newModalHtml = `<div class="ai-keys-modal-overlay" id="aiKeysModal">
    <div class="ai-keys-modal-box" style="max-width: 680px;">
      <button class="modal-close" id="aiKeysModalClose" type="button" style="position:absolute;top:18px;right:18px;background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:24px">🔑</span>
        <h2 style="margin:0;font-size:20px;font-weight:800">AI Provider & API Keys</h2>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:var(--muted);line-height:1.45">
        Add your own API keys, name each key whatever you want, pick your provider, and test your connection with real-time status dots. Keys are saved securely to your account (<strong id="aiKeysAccountLabel"></strong>).
      </p>

      <!-- Section 1: Your Saved API Keys (no preloaded empty cards!) -->
      <div style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">Your Saved API Keys</span>
          <span id="savedKeysCountBadge" style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--surface-2);border:1px solid var(--border)">0 keys</span>
        </div>
        <div id="savedKeysList" style="display:grid;gap:10px">
          <!-- Populated dynamically: clean list, no blank preload -->
        </div>
      </div>

      <!-- Section 2: Add a New Named API Key -->
      <div class="add-key-card" style="background:var(--surface-2);border:1px solid var(--border);border-radius:18px;padding:16px">
        <div style="font-size:14px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:6px">
          <span>➕</span>
          <span>Add an API Key</span>
        </div>
        
        <div style="display:grid;gap:12px">
          <div>
            <label style="margin:0 0 4px;font-size:12px;font-weight:700;color:var(--muted);display:block">Select AI Provider</label>
            <select id="newKeyProvider" class="input-field" style="margin:0;width:100%" onchange="updateProviderHint()">
              <option value="gemini">✨ Google Gemini (gemini-2.5-flash)</option>
              <option value="openai">🧠 OpenAI (gpt-4o-mini)</option>
              <option value="claude">🎭 Anthropic Claude (claude-3-5-sonnet)</option>
              <option value="groq">⚡ Groq (Llama 3.3 70B · Ultra Fast)</option>
              <option value="deepseek">🐳 DeepSeek (deepseek-chat)</option>
              <option value="openrouter">🌐 OpenRouter (200+ Models)</option>
            </select>
          </div>

          <div>
            <label style="margin:0 0 4px;font-size:12px;font-weight:700;color:var(--muted);display:block">Key Name (Name it whatever you want)</label>
            <input type="text" id="newKeyName" placeholder="e.g. My Personal Gemini, Work Claude, Pro OpenAI..." class="input-field" style="margin:0;width:100%">
          </div>

          <div>
            <label style="margin:0 0 4px;font-size:12px;font-weight:700;color:var(--muted);display:block">API Key</label>
            <div class="ai-key-input-wrap" style="display:flex;gap:6px;align-items:center">
              <input type="password" id="newKeyValue" placeholder="Paste your API key here..." class="ai-key-input" autocomplete="off" style="margin:0;flex:1">
              <button type="button" class="tool-button" id="newKeyEyeToggle" onclick="toggleNewKeyVisibility()" style="padding:10px 14px;font-size:14px">👁️</button>
            </div>
          </div>

          <div id="newKeyLinkHint" style="font-size:12px;color:var(--muted);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
            <span>Need an API key?</span>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" id="newKeyLinkAnchor" style="color:var(--accent);font-weight:700">Get free Gemini API Key ↗</a>
          </div>

          <div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap">
            <button type="button" class="tool-button" id="btnTestNewKey" onclick="testNewKey()" style="display:inline-flex;align-items:center;gap:6px;padding:9px 15px;font-weight:700;font-size:12px">
              <span class="test-dot gray" id="newKeyTestDot"></span>
              <span id="newKeyTestText">Test Key</span>
            </button>
            <button type="button" class="primary" id="btnAddSavedKey" onclick="addSavedKey()" style="width:auto;margin:0;padding:9px 20px;font-size:13px">
              Add Key
            </button>
          </div>
          <div id="newKeyTestStatus" style="font-size:12px;font-weight:700;min-height:16px"></div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
        <button type="button" class="tool-button" id="aiKeysModalCloseBtn" onclick="closeAiKeysModal()">Close</button>
      </div>
    </div>
  </div>

  `;

const mStart = html.indexOf(oldModalHtmlStart);
const mEnd = html.indexOf(oldModalHtmlEnd);
if (mStart !== -1 && mEnd !== -1) {
  html = html.slice(0, mStart) + newModalHtml + html.slice(mEnd);
  console.log("Replaced aiKeysModal HTML with custom named keys markup");
} else {
  console.error("Could not find aiKeysModal bounds in HTML!");
}

// ============================================================================
// 4. REVISE AI KEYS JAVASCRIPT: Named keys list, red/green dots on test, active key
// ============================================================================

const oldAiKeysJsStart = '// AI Keys Modal Binding';
const oldAiKeysJsEnd = '/* Universal Multi-Provider API Dispatcher */';

const newAiKeysJs = `// AI Keys Management with Custom Named Keys and Live Test Dots
    const aiKeysModal = document.getElementById("aiKeysModal");

    const PROVIDER_INFO = {
      gemini: { name: "Google Gemini", model: "gemini-2.5-flash", emoji: "✨", url: "https://aistudio.google.com/apikey", label: "Get free Gemini API Key ↗" },
      openai: { name: "OpenAI", model: "gpt-4o-mini", emoji: "🧠", url: "https://platform.openai.com/api-keys", label: "Get OpenAI API Key ↗" },
      claude: { name: "Anthropic Claude", model: "claude-3-5-sonnet-20241022", emoji: "🎭", url: "https://console.anthropic.com", label: "Get Anthropic API Key ↗" },
      groq: { name: "Groq", model: "llama-3.3-70b-versatile", emoji: "⚡", url: "https://console.groq.com/keys", label: "Get free Groq API Key ↗" },
      deepseek: { name: "DeepSeek", model: "deepseek-chat", emoji: "🐳", url: "https://platform.deepseek.com", label: "Get DeepSeek API Key ↗" },
      openrouter: { name: "OpenRouter", model: "google/gemini-2.0-flash-001", emoji: "🌐", url: "https://openrouter.ai/keys", label: "Get OpenRouter API Key ↗" }
    };

    window.updateProviderHint = function() {
      const prov = document.getElementById("newKeyProvider").value;
      const info = PROVIDER_INFO[prov] || PROVIDER_INFO.gemini;
      const anchor = document.getElementById("newKeyLinkAnchor");
      if (anchor) {
        anchor.href = info.url;
        anchor.textContent = info.label;
      }
      const dot = document.getElementById("newKeyTestDot");
      if (dot) dot.className = "test-dot gray";
      const status = document.getElementById("newKeyTestStatus");
      if (status) status.textContent = "";
      const testText = document.getElementById("newKeyTestText");
      if (testText) testText.textContent = "Test Key";
    };

    window.toggleNewKeyVisibility = function() {
      const inp = document.getElementById("newKeyValue");
      const btn = document.getElementById("newKeyEyeToggle");
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁️" : "🔒";
    };

    function renderSavedKeysList() {
      const listEl = document.getElementById("savedKeysList");
      const badgeEl = document.getElementById("savedKeysCountBadge");
      if (!listEl) return;
      listEl.innerHTML = "";

      const cfg = getUserAiConfig();
      const keys = cfg.keysList || [];
      if (badgeEl) badgeEl.textContent = \`\${keys.length} \${keys.length === 1 ? "key" : "keys"}\`;

      if (keys.length === 0) {
        listEl.innerHTML = \`
          <div style="text-align:center;padding:22px;background:var(--surface);border:1px dashed var(--border);border-radius:16px;color:var(--muted);font-size:13px">
            <span style="font-size:24px;display:block;margin-bottom:6px">🔑</span>
            <strong>No API keys added yet</strong>
            <p style="margin:4px 0 0;font-size:12px">Add your first API key using the form below to enable AI features!</p>
          </div>
        \`;
        return;
      }

      keys.forEach(k => {
        const prov = PROVIDER_INFO[k.provider] || { name: k.provider, emoji: "🤖", model: "" };
        const isActive = k.id === cfg.activeKeyId;
        const card = document.createElement("div");
        card.className = "saved-key-card" + (isActive ? " active-key" : "");
        
        const dotClass = k.status === "valid" ? "green" : k.status === "invalid" ? "red" : "gray";
        const dotLabel = k.status === "valid" ? "Working" : k.status === "invalid" ? "Failed" : "Test";
        
        const masked = k.key ? (k.key.slice(0, 7) + "••••••••" + k.key.slice(-4)) : "••••";

        card.innerHTML = \`
          <div class="saved-key-header">
            <div class="saved-key-title-group">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="saved-key-name">\${k.name || (prov.name + " Key")}</span>
                \${isActive ? '<span class="active-badge-pill">✓ Active</span>' : ''}
              </div>
              <div class="saved-key-provider-tag">
                <span>\${prov.emoji}</span>
                <span>\${prov.name} (\${prov.model})</span>
              </div>
            </div>
            <div class="saved-key-actions">
              \${!isActive ? \`<button type="button" class="tool-button" onclick="setActiveKey('\${k.id}')" style="font-size:12px;padding:6px 12px;font-weight:700">Set Active</button>\` : ''}
              <button type="button" class="tool-button" id="btnTestKey_\${k.id}" onclick="testSavedKey('\${k.id}')" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:6px 12px;font-weight:700">
                <span class="test-dot \${dotClass}" id="dotKey_\${k.id}"></span>
                <span id="lblKey_\${k.id}">\${dotLabel}</span>
              </button>
              <button type="button" class="tool-button" onclick="deleteSavedKey('\${k.id}')" style="font-size:13px;padding:6px 10px;color:var(--danger);border-color:var(--border)" title="Delete key">🗑️</button>
            </div>
          </div>
          <div class="saved-key-preview">
            <span>Key: \${masked}</span>
            <span id="msgKey_\${k.id}" style="font-size:11px;font-weight:700;\${k.status==='valid'?'color:#16a34a':k.status==='invalid'?'color:#dc2626':'color:var(--muted)'}">
              \${k.status === 'valid' ? '🟢 Verified & working' : k.status === 'invalid' ? '🔴 Connection failed' : 'Not tested yet'}
            </span>
          </div>
        \`;
        listEl.appendChild(card);
      });
    }

    window.openAiKeysModal = function() {
      if (!currentUser) {
        showToast("Please log in to manage your AI keys.");
        showScreen("authScreen");
        return;
      }
      document.getElementById("aiKeysAccountLabel").textContent = currentUser;
      renderSavedKeysList();
      updateProviderHint();
      aiKeysModal.classList.add("open");
    };

    window.closeAiKeysModal = function() {
      aiKeysModal.classList.remove("open");
    };

    document.getElementById("aiKeysModalClose").addEventListener("click", closeAiKeysModal);
    document.getElementById("topbarAiKeysBtn").addEventListener("click", openAiKeysModal);
    document.getElementById("menuAiKeys").addEventListener("click", () => {
      closeUserDropdown();
      openAiKeysModal();
    });
    document.getElementById("btnAgentConfigKey").addEventListener("click", openAiKeysModal);

    window.setActiveKey = function(keyId) {
      const cfg = getUserAiConfig();
      const k = (cfg.keysList || []).find(item => item.id === keyId);
      if (!k) return;
      cfg.activeKeyId = k.id;
      cfg.activeProvider = k.provider;
      cfg.keys = cfg.keys || {};
      cfg.keys[k.provider] = k.key;
      saveUserAiConfig(cfg);
      renderSavedKeysList();
      updateAiBadgeUI();
      syncGeminiKeyToNutriTrack();
      showToast(\`Active AI Key set to "\${k.name}" (\${k.provider.toUpperCase()})\`);
    };

    window.deleteSavedKey = function(keyId) {
      const cfg = getUserAiConfig();
      cfg.keysList = (cfg.keysList || []).filter(item => item.id !== keyId);
      if (cfg.activeKeyId === keyId) {
        if (cfg.keysList.length > 0) {
          cfg.activeKeyId = cfg.keysList[0].id;
          cfg.activeProvider = cfg.keysList[0].provider;
          cfg.keys[cfg.activeProvider] = cfg.keysList[0].key;
        } else {
          cfg.activeKeyId = null;
          cfg.activeProvider = "gemini";
          cfg.keys = {};
        }
      }
      saveUserAiConfig(cfg);
      renderSavedKeysList();
      updateAiBadgeUI();
      syncGeminiKeyToNutriTrack();
      showToast("API Key removed.");
    };

    window.testSavedKey = async function(keyId) {
      const cfg = getUserAiConfig();
      const k = (cfg.keysList || []).find(item => item.id === keyId);
      if (!k || !k.key) return;

      const dot = document.getElementById("dotKey_" + keyId);
      const lbl = document.getElementById("lblKey_" + keyId);
      const msg = document.getElementById("msgKey_" + keyId);

      if (dot) dot.className = "test-dot yellow";
      if (lbl) lbl.textContent = "Testing...";
      if (msg) { msg.textContent = "Testing connection..."; msg.style.color = "#d97706"; }

      try {
        const prov = PROVIDER_INFO[k.provider] || { model: "gemini-2.5-flash" };
        await queryAiProvider({
          provider: k.provider,
          apiKey: k.key,
          model: prov.model,
          messages: [{ role: "user", content: "Ping. Reply SUCCESS." }],
          systemPrompt: "You are an API connection tester."
        });

        // WORKING: GREEN DOT 🟢
        k.status = "valid";
        saveUserAiConfig(cfg);
        if (dot) dot.className = "test-dot green";
        if (lbl) lbl.textContent = "Working";
        if (msg) { msg.textContent = "🟢 Working & verified!"; msg.style.color = "#16a34a"; }
        showToast("🟢 " + (k.name || k.provider) + " key is working perfectly!");
      } catch (err) {
        // NOT WORKING: RED DOT 🔴
        k.status = "invalid";
        saveUserAiConfig(cfg);
        if (dot) dot.className = "test-dot red";
        if (lbl) lbl.textContent = "Failed";
        if (msg) { msg.textContent = "🔴 Error: " + (err.message.slice(0, 80)); msg.style.color = "#dc2626"; }
        showToast("🔴 Key test failed: " + err.message);
      }
    };

    window.testNewKey = async function() {
      const provider = document.getElementById("newKeyProvider").value;
      const key = (document.getElementById("newKeyValue").value || "").trim();
      const dot = document.getElementById("newKeyTestDot");
      const text = document.getElementById("newKeyTestText");
      const status = document.getElementById("newKeyTestStatus");

      if (!key) {
        showToast("Please paste an API key first.");
        if (status) { status.textContent = "Please enter an API key above."; status.style.color = "#dc2626"; }
        return;
      }

      if (dot) dot.className = "test-dot yellow";
      if (text) text.textContent = "Testing...";
      if (status) { status.textContent = "Contacting " + provider + " API... ⏳"; status.style.color = "#d97706"; }

      try {
        const prov = PROVIDER_INFO[provider] || { model: "gemini-2.5-flash" };
        await queryAiProvider({
          provider,
          apiKey: key,
          model: prov.model,
          messages: [{ role: "user", content: "Ping. Reply SUCCESS." }],
          systemPrompt: "You are an API connection tester."
        });

        // SUCCESS: GREEN DOT 🟢
        if (dot) dot.className = "test-dot green";
        if (text) text.textContent = "Working";
        if (status) { status.textContent = "🟢 API key verified and working!"; status.style.color = "#16a34a"; }
        showToast("🟢 " + provider.toUpperCase() + " key verified successfully!");
      } catch (err) {
        // FAILURE: RED DOT 🔴
        if (dot) dot.className = "test-dot red";
        if (text) text.textContent = "Failed";
        if (status) { status.textContent = "🔴 Test failed: " + err.message; status.style.color = "#dc2626"; }
        showToast("🔴 Key test failed: " + err.message);
      }
    };

    window.addSavedKey = function() {
      const provider = document.getElementById("newKeyProvider").value;
      const nameInput = document.getElementById("newKeyName");
      const keyInput = document.getElementById("newKeyValue");
      const keyVal = (keyInput.value || "").trim();

      if (!keyVal) {
        showToast("Please enter your API key.");
        keyInput.focus();
        return;
      }

      const provInfo = PROVIDER_INFO[provider] || { name: provider };
      const nameVal = (nameInput.value || "").trim() || (provInfo.name + " Key");

      const cfg = getUserAiConfig();
      cfg.keysList = cfg.keysList || [];

      const newKeyObj = {
        id: "key_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: nameVal,
        provider,
        key: keyVal,
        status: "valid",
        createdAt: Date.now()
      };

      cfg.keysList.push(newKeyObj);

      // Make this the active key
      cfg.activeKeyId = newKeyObj.id;
      cfg.activeProvider = provider;
      cfg.keys = cfg.keys || {};
      cfg.keys[provider] = keyVal;

      saveUserAiConfig(cfg);

      // Clear input fields
      nameInput.value = "";
      keyInput.value = "";
      const dot = document.getElementById("newKeyTestDot");
      if (dot) dot.className = "test-dot gray";
      const testText = document.getElementById("newKeyTestText");
      if (testText) testText.textContent = "Test Key";
      const status = document.getElementById("newKeyTestStatus");
      if (status) status.textContent = "";

      renderSavedKeysList();
      updateAiBadgeUI();
      syncGeminiKeyToNutriTrack();

      showToast(\`Key "\${nameVal}" saved and set as active! 🎉\`);
    };

    `;

const jStart = html.indexOf(oldAiKeysJsStart);
const jEnd = html.indexOf(oldAiKeysJsEnd);
if (jStart !== -1 && jEnd !== -1) {
  html = html.slice(0, jStart) + newAiKeysJs + html.slice(jEnd);
  console.log("Replaced AI keys JavaScript implementation");
} else {
  console.error("Could not find oldAiKeysJs in HTML!");
}

// ============================================================================
// 5. DEFENSIVE getUserAiConfig UPDATE FOR NAMED KEYS
// ============================================================================

const oldCfgCode = `      if (!user.aiConfig.keys) {
        user.aiConfig.keys = {};
      }
      if (!user.aiConfig.activeProvider) {
        user.aiConfig.activeProvider = "gemini";
      }
      return user.aiConfig;`;

const newCfgCode = `      if (!user.aiConfig.keys) {
        user.aiConfig.keys = {};
      }
      if (!user.aiConfig.keysList) {
        user.aiConfig.keysList = [];
        // Migrate any legacy object keys to named keys list
        Object.keys(user.aiConfig.keys).forEach(prov => {
          if (user.aiConfig.keys[prov]) {
            user.aiConfig.keysList.push({
              id: "key_" + prov,
              name: prov.charAt(0).toUpperCase() + prov.slice(1) + " Key",
              provider: prov,
              key: user.aiConfig.keys[prov],
              status: "valid",
              createdAt: Date.now()
            });
          }
        });
      }
      if (!user.aiConfig.activeKeyId && user.aiConfig.keysList.length > 0) {
        user.aiConfig.activeKeyId = user.aiConfig.keysList[0].id;
      }
      if (!user.aiConfig.activeProvider) {
        user.aiConfig.activeProvider = "gemini";
      }
      return user.aiConfig;`;

if (html.includes(oldCfgCode)) {
  html = html.replace(oldCfgCode, newCfgCode);
  console.log("Enhanced getUserAiConfig with keysList support");
}

// ============================================================================
// 6. UPDATE NutriTrack Water Tracker & AI Coach Meal Logging in NUTRITRACK_SRC
// ============================================================================

// A. In NUTRITRACK_SRC: Replace the Water Hero quest card rendering with sip vs full cup vs bottle options
const oldWaterHtml = `\${q.isWater ? \\\`
            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:8px">
              <button class="pill-btn" onclick="addWater(-1)">-</button>
              <button class="pill-btn primary" onclick="addWater(1)">+ 💧</button>
            </div>
          \\\` : ""}`;

const newWaterHtml = `\${q.isWater ? \\\`
            <div style="margin-top:10px;padding:8px 10px;background:var(--bg);border-radius:14px;border:1px solid var(--line)">
              <div style="font-size:0.75rem;font-weight:800;color:var(--mute);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
                <span>How much did you drink?</span>
                <span style="font-weight:900;color:#0284c7">\${q.cur} / 6 cups</span>
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                <button type="button" class="pill-btn primary" onclick="addWaterIntake(0.3, 'Sip from bottle 🍼')" title="A small sip (~75ml)">🍼 Sip (+0.3)</button>
                <button type="button" class="pill-btn primary" onclick="addWaterIntake(1.0, 'Full cup 🥤')" title="One full glass or cup (~250ml)">🥤 Full Cup (+1)</button>
                <button type="button" class="pill-btn primary" onclick="addWaterIntake(2.0, 'Full water bottle 🍶')" title="Standard water bottle (~500ml)">🍶 Bottle (+2)</button>
                <button type="button" class="pill-btn primary" onclick="addWaterIntake(3.0, 'Large tumbler 🧊')" title="Large gym tumbler (~750ml)">🧊 Tumbler (+3)</button>
                <button type="button" class="pill-btn" onclick="addWaterIntake(-0.5, 'Undo water')" title="Undo" style="margin-left:auto">-</button>
              </div>
            </div>
          \\\` : ""}`;

if (html.includes(oldWaterHtml)) {
  html = html.replace(oldWaterHtml, newWaterHtml);
  console.log("Updated Water Hero quest card with drink intake options");
} else {
  console.log("Could not find exact oldWaterHtml, searching for alternative...");
}

// B. In NUTRITRACK_SRC: Update addWater function with addWaterIntake
const oldAddWater = `function addWater(n) {\\n    state.water[activeDateKey] = Math.max(0, (state.water[activeDateKey] || 0) + n);\\n    saveState();\\n    toast(n > 0 ? \\\"Drank water! 💧 +15 XP\\\" : \\\"Water updated\\\");\\n  }`;

const newAddWater = `function addWaterIntake(amount, label) {\\n    state.water = state.water || {};\\n    const prev = state.water[activeDateKey] || 0;\\n    const next = Math.max(0, Math.round((prev + amount) * 10) / 10);\\n    state.water[activeDateKey] = next;\\n    saveState();\\n    render();\\n    if (amount > 0) {\\n      toast(\\\`Logged \${label}! Total: \${next} cups 💧 +15 XP\\\`);\\n    } else {\\n      toast(\\\`Water updated: \${next} cups 💧\\\`);\\n    }\\n  }\\n\\n  function addWater(n) {\\n    addWaterIntake(n, n > 0 ? \\\"full cup 🥤\\\" : \\\"undo\\\");\\n  }`;

if (html.includes(oldAddWater)) {
  html = html.replace(oldAddWater, newAddWater);
  console.log("Added addWaterIntake function in NutriTrack");
}

// C. In NUTRITRACK_SRC: Update sendChatMessage to extract meals eaten and update data
const oldSendChat = `    try {\\n      const prompt = \\\`System: \${contextStr}\\\\n\\\\nUser Question: \${q}\\\\n\\\\nAnswer directly to the user:\\\`;\\n      const reply = await callGemini(prompt, null, false);\\n\\n      // Replace thinking bubble\\n      chatHistory.pop();\\n      chatHistory.push({ sender: \\\"coach\\\", text: reply.trim() });\\n      renderChatMessages();\\n    } catch(err) {`;

const newSendChat = `    try {\\n      const prompt = \\\`System: \${contextStr}\\\\n\\\\nIMPORTANT CAPABILITY: If the user tells you about food, snacks, or meals they ate (for example "I ate 2 slices of pizza", "I had a bowl of chicken ramen", "I ate an apple and Greek yogurt"), you must:\\\\n1. Provide encouraging, personalized nutritional feedback.\\\\n2. AUTOMATICALLY EXTRACT the meal details and append this action tag at the very end of your response:\\\\n[[LOG_MEAL: {"name": "Food Name", "portion": "1 serving", "kcal": 350, "protein": 20, "carbs": 30, "fat": 10, "groups": ["protein", "veg"]}]]\\\\nIf they also drank water, you can output: [[LOG_WATER: 1.0]] (or 0.3 for a sip, 2.0 for a bottle).\\\\nIf no food or drink was eaten, do NOT output action tags.\\\\n\\\\nUser Message: \${q}\\\\n\\\\nReply directly to the user:\\\`;\\n      const reply = await callGemini(prompt, null, false);\\n\\n      let cleanReply = reply.trim();\\n      let loggedNotice = "";\\n\\n      // 1. Parse [[LOG_MEAL: {...}]]\\n      const mealMatches = cleanReply.matchAll(/\\\\[\\\\[LOG_MEAL:\\\\s*(\\\\{.*?\\\\})\\\\]\\\\]/gs);\\n      for (const m of mealMatches) {\\n        try {\\n          const mealObj = JSON.parse(m[1]);\\n          if (mealObj && mealObj.name) {\\n            state.days[today] = state.days[today] || [];\\n            state.days[today].push({\\n              name: mealObj.name,\\n              cuisine: mealObj.cuisine || "Custom",\\n              portion: mealObj.portion || "1 serving",\\n              kcal: parseInt(mealObj.kcal, 10) || 300,\\n              protein: parseInt(mealObj.protein, 10) || 15,\\n              carbs: parseInt(mealObj.carbs, 10) || 30,\\n              fat: parseInt(mealObj.fat, 10) || 10,\\n              groups: Array.isArray(mealObj.groups) ? mealObj.groups : ["protein"],\\n              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })\\n            });\\n            loggedNotice += \\\`\\\\n\\\\n🍽️ Logged "\${mealObj.name}" (\${mealObj.kcal} kcal) to today's plate!\\\`;\\n          }\\n        } catch(e) { console.warn(e); }\\n      }\\n      cleanReply = cleanReply.replace(/\\\\[\\\\[LOG_MEAL:\\\\s*\\\\{.*?\\\\}\\\\]\\\\]/gs, "").trim();\\n\\n      // 2. Parse [[LOG_WATER: ...]]\\n      const waterMatch = cleanReply.match(/\\\\[\\\\[LOG_WATER:\\\\s*([\\\\d\\\\.]+)\\\\]\\\\]/);\\n      if (waterMatch) {\\n        const wAmt = parseFloat(waterMatch[1]) || 1.0;\\n        state.water = state.water || {};\\n        state.water[today] = Math.max(0, Math.round(((state.water[today] || 0) + wAmt) * 10) / 10);\\n        loggedNotice += \\\`\\\\n💧 Logged \${wAmt} cups of water!\\\`;\\n        cleanReply = cleanReply.replace(/\\\\[\\\\[LOG_WATER:\\\\s*[\\\\d\\\\.]+\\\\]\\\\]/g, "").trim();\\n      }\\n\\n      if (loggedNotice) {\\n        saveState();\\n        render();\\n        toast("AI Coach updated your plate & quests! 🥑");\\n        cleanReply += loggedNotice;\\n      }\\n\\n      // Replace thinking bubble\\n      chatHistory.pop();\\n      chatHistory.push({ sender: \\\"coach\\\", text: cleanReply });\\n      renderChatMessages();\\n    } catch(err) {`;

if (html.includes(oldSendChat)) {
  html = html.replace(oldSendChat, newSendChat);
  console.log("Updated sendChatMessage with AI meal logging");
} else {
  console.log("Could not find exact oldSendChat, checking...");
}

// ============================================================================
// 7. UPDATE AI AGENT TO ALSO SUPPORT LOG_MEAL ACTION
// ============================================================================

const oldAgentActionEnd = `      return { text: cleanText, actionSummary };
    }`;

const newAgentActionEnd = `      // 3. Action: LOG_MEAL
      const mealMatch = replyText.match(/\\[\\[ACTION:LOG_MEAL\\s*\\|\\s*([^\\]|]+)\\|\\s*(\\d+)\\|\\s*(\\d+)\\|\\s*(\\d+)\\|\\s*(\\d+)(?:\\|\\s*([^\\]]+))?\\]\\]/i);
      if (mealMatch && agentPermCheckbox && agentPermCheckbox.checked) {
        const name = mealMatch[1].trim();
        const kcal = parseInt(mealMatch[2], 10) || 300;
        const protein = parseInt(mealMatch[3], 10) || 15;
        const carbs = parseInt(mealMatch[4], 10) || 30;
        const fat = parseInt(mealMatch[5], 10) || 10;
        const groups = (mealMatch[6] || "protein").split(",").map(g => g.trim());
        try {
          const ntKey = "nutritrack_" + currentUser.toLowerCase() + "__state";
          const ntState = JSON.parse(localStorage.getItem(ntKey) || "{}");
          ntState.days = ntState.days || {};
          const today = new Date().toISOString().slice(0, 10);
          ntState.days[today] = ntState.days[today] || [];
          ntState.days[today].push({
            name,
            cuisine: "Custom",
            portion: "1 serving",
            kcal,
            protein,
            carbs,
            fat,
            groups,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
          localStorage.setItem(ntKey, JSON.stringify(ntState));
          actionSummary = (actionSummary ? actionSummary + "<br>" : "") + \`Logged meal: <strong>🍽️ \${name}</strong> (\${kcal} kcal, \${protein}g protein) into NutriTrack.\`;
          cleanText = cleanText.replace(mealMatch[0], "").trim();
        } catch (e) {
          actionSummary = (actionSummary ? actionSummary + "<br>" : "") + "Failed to log meal: " + e.message;
        }
      }

      return { text: cleanText, actionSummary };
    }`;

if (html.includes(oldAgentActionEnd)) {
  html = html.replace(oldAgentActionEnd, newAgentActionEnd);
  console.log("Updated AI Agent with LOG_MEAL action");
}

fs.writeFileSync("public/assets/aistudio/My-Apps-Hub_f6c97383.html", html, "utf8");
console.log("Saved all updates to My-Apps-Hub_f6c97383.html successfully!");
