// Standalone embeddable KnowFlow AI Widget script
// Injected onto third-party websites (e.g., GNITS website, university portals, corporate intranets)

export function getWidgetJs(baseUrl: string): string {
  return `(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.__knowflow_widget_loaded) return;
  window.__knowflow_widget_loaded = true;

  // Locate the script tag that loaded this script
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var rawBotId = script ? (script.getAttribute('data-bot-id') || script.getAttribute('data-assistant-id') || '') : '';
  var botId = rawBotId.replace(/^assistant-/, '').trim() || 'ast-univ-1';
  var scriptUrl = script && script.src ? script.src : '${baseUrl}/widget.js';
  var origin = '';
  try {
    origin = new URL(scriptUrl, window.location.href).origin;
  } catch (e) {
    origin = '${baseUrl}';
  }

  // Widget state
  var isOpen = false;
  var assistantData = null;
  var conversationId = 'conv-' + Date.now();
  var messages = [];
  var isSending = false;

  var defaultThemeColor = '#2563eb'; // Royal blue default
  var defaultTitle = 'KnowFlow Knowledge Assistant';
  var defaultGreeting = "Hi! How can I help you today?";

  // Inject Styles
  var style = document.createElement('style');
  style.id = 'knowflow-widget-styles';
  style.textContent = [
    '#kf-widget-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }',
    '#kf-launcher { position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; align-items: center; justify-content: center; width: 58px; height: 58px; border-radius: 50%; background: ' + defaultThemeColor + '; color: #ffffff; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2); cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); border: 2.5px solid rgba(255,255,255,0.3); }',
    '#kf-launcher:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.4); }',
    '#kf-launcher svg { width: 26px; height: 26px; transition: transform 0.2s; }',
    '#kf-launcher.kf-open svg { transform: rotate(90deg); }',
    '#kf-window { position: fixed; bottom: 92px; right: 24px; width: 400px; max-width: calc(100vw - 32px); height: 580px; max-height: calc(100vh - 120px); z-index: 999999; background: #ffffff; border-radius: 18px; box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.1); display: none; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(16px) scale(0.96); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }',
    '#kf-window.kf-visible { display: flex; opacity: 1; transform: translateY(0) scale(1); }',
    '#kf-header { background: ' + defaultThemeColor + '; color: #ffffff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; border-top-left-radius: 18px; border-top-right-radius: 18px; }',
    '#kf-header-info { display: flex; align-items: center; gap: 10px; }',
    '#kf-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }',
    '#kf-title { font-size: 14px; font-weight: 700; line-height: 1.2; margin: 0; }',
    '#kf-status { font-size: 11px; opacity: 0.85; margin: 2px 0 0; display: flex; align-items: center; gap: 5px; }',
    '#kf-status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; }',
    '#kf-close-btn { background: transparent; border: none; color: #ffffff; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; opacity: 0.85; transition: opacity 0.2s; }',
    '#kf-close-btn:hover { opacity: 1; background: rgba(255,255,255,0.2); }',
    '#kf-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }',
    '.kf-msg { display: flex; flex-direction: column; max-width: 90%; font-size: 13px; line-height: 1.5; }',
    '.kf-msg-user { align-self: flex-end; background: ' + defaultThemeColor + '; color: #ffffff; padding: 10px 14px; border-radius: 16px 16px 4px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); word-break: break-word; }',
    '.kf-msg-assistant { align-self: flex-start; background: #ffffff; color: #0f172a; padding: 12px 14px; border-radius: 16px 16px 16px 4px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); word-break: break-word; }',
    '.kf-msg-assistant h3, .kf-msg-assistant h4 { margin: 8px 0 4px; font-size: 13.5px; font-weight: 700; color: #0f172a; }',
    '.kf-msg-assistant ul { margin: 4px 0 6px 18px; padding: 0; }',
    '.kf-msg-assistant li { margin-bottom: 3px; }',
    '.kf-citations { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; }',
    '.kf-citations-title { font-weight: 600; color: #64748b; margin-bottom: 5px; display: flex; align-items: center; gap: 4px; font-size: 11px; }',
    '.kf-citation-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 2.5px 8px; border-radius: 6px; border: 1px solid #bfdbfe; margin-right: 5px; margin-top: 3px; font-weight: 500; font-size: 10.5px; line-height: 1.3; }',
    '#kf-suggested { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }',
    '.kf-suggested-btn { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; font-size: 11.5px; padding: 6px 10px; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.15s; font-family: inherit; font-weight: 500; }',
    '.kf-suggested-btn:hover { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }',
    '#kf-footer { padding: 12px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; }',
    '#kf-input-row { display: flex; align-items: center; gap: 8px; }',
    '#kf-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 20px; padding: 10px 14px; font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.2s; background: #f8fafc; }',
    '#kf-input:focus { border-color: ' + defaultThemeColor + '; background: #ffffff; }',
    '#kf-send-btn { width: 36px; height: 36px; border-radius: 50%; background: ' + defaultThemeColor + '; border: none; color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; shrink-0; transition: transform 0.15s; }',
    '#kf-send-btn:hover { transform: scale(1.05); }',
    '#kf-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
    '#kf-powered { text-align: center; font-size: 10px; color: #94a3b8; font-weight: 500; }',
    '.kf-typing { display: flex; align-items: center; gap: 4px; padding: 8px 12px; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; width: fit-content; }',
    '.kf-dot { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: kfPulse 1.2s infinite ease-in-out; }',
    '.kf-dot:nth-child(2) { animation-delay: 0.2s; }',
    '.kf-dot:nth-child(3) { animation-delay: 0.4s; }',
    '@keyframes kfPulse { 0%, 100% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }',
    '@media (max-width: 480px) { #kf-window { bottom: 0; right: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; border-radius: 0; } #kf-header { border-radius: 0; } }'
  ].join('\\n');
  document.head.appendChild(style);

  // Create Widget DOM Container
  var container = document.createElement('div');
  container.id = 'kf-widget-root';
  container.innerHTML = [
    '<div id="kf-launcher" title="Chat with AI Knowledge Assistant">',
    '  <svg id="kf-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    '  </svg>',
    '  <svg id="kf-icon-close" style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '    <line x1="18" y1="6" x2="6" y2="18"></line>',
    '    <line x1="6" y1="6" x2="18" y2="18"></line>',
    '  </svg>',
    '</div>',
    '<div id="kf-window">',
    '  <div id="kf-header">',
    '    <div id="kf-header-info">',
    '      <div id="kf-avatar">AI</div>',
    '      <div>',
    '        <div id="kf-title">' + defaultTitle + '</div>',
    '        <div id="kf-status">Verified Grounded</div>',
    '      </div>',
    '    </div>',
    '    <button id="kf-close-btn" title="Close chat">',
    '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <line x1="18" y1="6" x2="6" y2="18"></line>',
    '        <line x1="6" y1="6" x2="18" y2="18"></line>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '  <div id="kf-body"></div>',
    '  <div id="kf-footer">',
    '    <div id="kf-input-row">',
    '      <input id="kf-input" type="text" placeholder="Ask a question..." />',
    '      <button id="kf-send-btn" title="Send message">',
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
    '          <line x1="22" y1="2" x2="11" y2="13"></line>',
    '          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>',
    '        </svg>',
    '      </button>',
    '    </div>',
    '    <div id="kf-powered">Powered by KnowFlow AI • Verified Grounding</div>',
    '  </div>',
    '</div>'
  ].join('\\n');
  document.body.appendChild(container);

  var launcher = document.getElementById('kf-launcher');
  var win = document.getElementById('kf-window');
  var closeBtn = document.getElementById('kf-close-btn');
  var body = document.getElementById('kf-body');
  var input = document.getElementById('kf-input');
  var sendBtn = document.getElementById('kf-send-btn');
  var iconOpen = document.getElementById('kf-icon-open');
  var iconClose = document.getElementById('kf-icon-close');
  var titleEl = document.getElementById('kf-title');
  var avatarEl = document.getElementById('kf-avatar');

  function toggleWidget(force) {
    isOpen = typeof force === 'boolean' ? force : !isOpen;
    if (isOpen) {
      win.classList.add('kf-visible');
      launcher.classList.add('kf-open');
      iconOpen.style.display = 'none';
      iconClose.style.display = 'block';
      setTimeout(function() { input.focus(); }, 100);
      scrollToBottom();
    } else {
      win.classList.remove('kf-visible');
      launcher.classList.remove('kf-open');
      iconOpen.style.display = 'block';
      iconClose.style.display = 'none';
    }
  }

  launcher.addEventListener('click', function() { toggleWidget(); });
  closeBtn.addEventListener('click', function() { toggleWidget(false); });

  function scrollToBottom() {
    setTimeout(function() {
      body.scrollTop = body.scrollHeight;
    }, 50);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderMessage(msg) {
    var div = document.createElement('div');
    div.className = 'kf-msg kf-msg-' + msg.role;
    
    // Markdown formatting: bold, bullets, headers with strict HTML escaping
    var safeText = escapeHtml(msg.content || '');
    var formatted = safeText
      .replace(/### (.*?)(?:<br\/>|\n|$)/g, '<h4>$1</h4>')
      .replace(/## (.*?)(?:<br\/>|\n|$)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\* /g, '<br/>• ')
      .replace(/\n- /g, '<br/>• ')
      .replace(/\n/g, '<br/>');

    div.innerHTML = formatted;

    // Render citations if present with strict HTML attribute escaping
    if (msg.citations && msg.citations.length > 0) {
      var citBox = document.createElement('div');
      citBox.className = 'kf-citations';
      var citHtml = '<div class="kf-citations-title">Verified Sources & Citations:</div>';
      msg.citations.forEach(function(c) {
        var safeDoc = escapeHtml(c.documentName || 'Document');
        var safeSnippet = escapeHtml(c.snippet || '');
        var safePage = parseInt(c.page, 10) || 1;
        citHtml += '<span class="kf-citation-badge" title="' + safeSnippet + '">📄 ' + safeDoc + ' (p.' + safePage + ')</span>';
      });
      citBox.innerHTML = citHtml;
      div.appendChild(citBox);
    }

    body.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    var typing = document.createElement('div');
    typing.id = 'kf-typing-indicator';
    typing.className = 'kf-typing';
    typing.innerHTML = '<div class="kf-dot"></div><div class="kf-dot"></div><div class="kf-dot"></div>';
    body.appendChild(typing);
    scrollToBottom();
  }

  function removeTyping() {
    var t = document.getElementById('kf-typing-indicator');
    if (t) t.remove();
  }

  // Levenshtein distance algorithm for robust typo tolerance (handles spelling mistakes like "attenance", "sylabus", "placemnts")
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var v0 = new Array(b.length + 1);
    var v1 = new Array(b.length + 1);
    for (var i = 0; i <= b.length; i++) v0[i] = i;
    for (var i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (var j = 0; j < b.length; j++) {
        var cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (var j = 0; j <= b.length; j++) v0[j] = v1[j];
    }
    return v1[b.length];
  }

  function matchesAnyFuzzy(tokens, targetKeywords) {
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (tok.length < 3) continue;
      for (var j = 0; j < targetKeywords.length; j++) {
        var kw = targetKeywords[j];
        if (tok === kw || tok.indexOf(kw) !== -1 || kw.indexOf(tok) !== -1) return true;
        var maxLen = Math.max(tok.length, kw.length);
        var allowedDist = maxLen <= 5 ? 1 : 2;
        if (levenshtein(tok, kw) <= allowedDist) return true;
      }
    }
    return false;
  }

  // Fallback response if network connection to backend is interrupted
  function getGroundedFallbackResponse(q) {
    var refusal = (assistantData && assistantData.settings && assistantData.settings.refusalMessage) ||
      "I am currently unable to reach the verified knowledge base service. Please check your network connection and try again shortly.";
    return {
      content: refusal,
      citations: []
    };
  }

  async function sendMessage(text) {
    var query = (text || input.value || '').trim();
    if (!query || isSending) return;

    input.value = '';
    isSending = true;
    sendBtn.disabled = true;

    // Append user message
    var userMsg = { role: 'user', content: query };
    messages.push(userMsg);
    renderMessage(userMsg);

    showTyping();

    var responded = false;

    // 1. Try sending to the backend endpoint with credentials support
    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 25000);

      var res = await fetch(origin + '/api/assistants/' + botId + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: query,
          conversationId: conversationId,
          history: messages.slice(-6)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        var data = await res.json();
        removeTyping();
        responded = true;

        var botMsg = {
          role: 'assistant',
          content: data.message ? data.message.content : "I couldn't process that query.",
          citations: data.message ? data.message.citations : []
        };
        messages.push(botMsg);
        renderMessage(botMsg);
      }
    } catch (err) {
      // Backend fetch blocked by AI Studio dev cookie/CORS check or timed out
    }

    // 2. If backend was unreachable or threw CORS/cookie check error, use intelligent grounded fallback
    if (!responded) {
      removeTyping();
      var fallback = getGroundedFallbackResponse(query);
      var botMsg = {
        role: 'assistant',
        content: fallback.content,
        citations: fallback.citations
      };
      messages.push(botMsg);
      renderMessage(botMsg);
    }

    isSending = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', function() { sendMessage(); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  // Fetch Assistant Metadata to customize colors, title, greeting & starter questions
  async function loadAssistantConfig() {
    try {
      var res = await fetch(origin + '/api/assistants/' + botId, {
        credentials: 'include'
      });
      if (res.ok) {
        assistantData = await res.json();
        var s = assistantData.settings || {};
        var rawTheme = s.themeColor || defaultThemeColor;
        var theme = /^#(?:[0-9a-fA-F]{3,8})$|^rgb\([0-9\s,]+\)$/.test(rawTheme) ? rawTheme : defaultThemeColor;
        
        launcher.style.background = theme;
        document.getElementById('kf-header').style.background = theme;
        sendBtn.style.background = theme;
        
        if (s.name) titleEl.textContent = s.name;
        if (s.placeholder) input.placeholder = s.placeholder;
        if (s.name) avatarEl.textContent = s.name.slice(0, 2).toUpperCase();

        var greetingText = s.greeting || defaultGreeting;
        renderMessage({ role: 'assistant', content: greetingText });

        if (s.suggestedQuestions && s.suggestedQuestions.length > 0) {
          renderSuggestedQuestions(s.suggestedQuestions);
        }
        return;
      }
    } catch (e) {
      // Dev URL cross-origin cookie check prevented metadata fetch
    }

    // Fallback styling and greeting
    renderMessage({ role: 'assistant', content: defaultGreeting });

    var defaultQuestions = [
      'What is the tuition refund policy?',
      'How do I appeal a course grade?',
      'When is the deadline to withdraw from a class?'
    ];

    renderSuggestedQuestions(defaultQuestions);
  }

  function renderSuggestedQuestions(questions) {
    var sugContainer = document.createElement('div');
    sugContainer.id = 'kf-suggested';
    questions.forEach(function(q) {
      var btn = document.createElement('button');
      btn.className = 'kf-suggested-btn';
      btn.textContent = q;
      btn.onclick = function() {
        sendMessage(q);
        sugContainer.remove();
      };
      sugContainer.appendChild(btn);
    });
    body.appendChild(sugContainer);
    scrollToBottom();
  }

  loadAssistantConfig();
})();
`;
}
