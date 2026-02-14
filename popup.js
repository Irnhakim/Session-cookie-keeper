// Auto Login Extension - Popup Script (Cookie-based Session)
document.addEventListener('DOMContentLoaded', function() {
  // Load saved sessions on startup
  loadSessions();

  // Form submission handler
  document.getElementById('saveSessionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveCurrentSession();
  });
});

// Save current session (cookies from active tab)
function saveCurrentSession() {
  const sessionName = document.getElementById('sessionName').value.trim();

  if (!sessionName) {
    showStatus('Mohon masukkan nama session!', 'error');
    return;
  }

  // Get active tab to extract URL and cookies
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showStatus('Tidak ada tab aktif!', 'error');
      return;
    }

    const activeTab = tabs[0];
    const url = new URL(activeTab.url);
    const domain = url.hostname;

    // Get all cookies for this domain (aggressive approach)
    const getCookiesForDomain = async (domain) => {
      const allCookies = [];
      
      // Strategy 1: Get by exact domain
      const cookies1 = await new Promise(r => chrome.cookies.getAll({ domain: domain }, r));
      allCookies.push(...cookies1);
      
      // Strategy 2: Get with dot prefix
      const dotDomain = domain.startsWith('.') ? domain : '.' + domain;
      const cookies2 = await new Promise(r => chrome.cookies.getAll({ domain: dotDomain }, r));
      allCookies.push(...cookies2);
      
      // Strategy 3: Get by full URL (catches httpOnly and host-only cookies)
      const cookies3 = await new Promise(r => chrome.cookies.getAll({ url: activeTab.url }, r));
      allCookies.push(...cookies3);
      
      // Strategy 4: Get all cookies and filter by domain match
      const allDomainCookies = await new Promise(r => chrome.cookies.getAll({}, r));
      const matchingCookies = allDomainCookies.filter(c => {
        const cookieDomain = c.domain || '';
        return cookieDomain.includes(domain) || domain.includes(cookieDomain.replace(/^\./, ''));
      });
      allCookies.push(...matchingCookies);
      
      // Strategy 5: Try parent domains (for subdomain sites)
      const domainParts = domain.split('.');
      for (let i = 1; i < domainParts.length - 1; i++) {
        const parentDomain = domainParts.slice(i).join('.');
        const parentCookies = await new Promise(r => chrome.cookies.getAll({ domain: parentDomain }, r));
        allCookies.push(...parentCookies);
      }
      
      // Remove duplicates by name+domain+path
      const uniqueCookies = Array.from(
        new Map(allCookies.map(c => [`${c.name}|${c.domain}|${c.path}`, c])).values()
      );
      
      return uniqueCookies;
    };


    getCookiesForDomain(domain).then(function(cookies) {
      console.log('Cookies found:', cookies.length, 'for domain:', domain);
      console.log('Cookie names:', cookies.map(c => c.name).join(', '));
      
      if (!cookies || cookies.length === 0) {
        showStatus('Tidak ada cookies ditemukan. Pastikan Anda sudah login!', 'error');
        return;
      }


      // Filter out httpOnly cookies that can't be set via JavaScript
      // but we still save them for restoration via background script
      const sessionData = {
        id: Date.now().toString(),
        name: sessionName,
        url: activeTab.url,
        domain: domain,
        cookies: cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate,
          storeId: cookie.storeId
        })),
        createdAt: new Date().toISOString(),
        favicon: activeTab.favIconUrl || null
      };

      // Save to Chrome storage
      chrome.storage.local.get(['sessions'], function(result) {
        const sessions = result.sessions || [];
        
        // Check if session with same name exists
        const existingIndex = sessions.findIndex(s => s.name === sessionName);
        if (existingIndex !== -1) {
          if (!confirm(`Session "${sessionName}" sudah ada. Timpa?`)) {
            return;
          }
          sessions[existingIndex] = sessionData;
        } else {
          sessions.push(sessionData);
        }
        
        chrome.storage.local.set({ sessions: sessions }, function() {
          if (chrome.runtime.lastError) {
            showStatus('Gagal menyimpan session!', 'error');
            return;
          }
          
          const cookieCount = cookies ? cookies.length : 0;
          showStatus(`Session "${sessionName}" berhasil disimpan! (${cookieCount} cookies)`, 'success');
          document.getElementById('saveSessionForm').reset();
          loadSessions();
        });
      });
    }).catch(function(error) {
      console.error('Error getting cookies:', error);
      showStatus('Error mengambil cookies: ' + error.message, 'error');
    });

  });
}

// Load and display saved sessions
function loadSessions() {
  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    const sessionsList = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
      sessionsList.innerHTML = '<p class="empty-state">Belum ada session tersimpan</p>';
      return;
    }

    sessionsList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'account-item';
      sessionItem.dataset.sessionId = session.id;
      
      const cookieCount = session.cookies ? session.cookies.length : 0;
      const createdDate = new Date(session.createdAt).toLocaleDateString('id-ID');
      
      sessionItem.innerHTML = `
        <div class="account-header">
          <span class="account-name">${escapeHtml(session.name)}</span>
          <span class="cookie-count">${cookieCount} 🍪</span>
        </div>
        <div class="account-url">${escapeHtml(session.domain)}</div>
        <div class="account-meta">Disimpan: ${createdDate}</div>
        <div class="account-actions">
          <button class="btn btn-success" data-action="restore">
            🔓 Restore Session
          </button>
          <button class="btn btn-secondary" data-action="open">
            🌐 Buka & Login
          </button>
          <button class="btn btn-danger" data-action="delete">
            🗑️
          </button>
        </div>
      `;
      
      // Add event listeners programmatically (no inline onclick)
      const restoreBtn = sessionItem.querySelector('[data-action="restore"]');
      const openBtn = sessionItem.querySelector('[data-action="open"]');
      const deleteBtn = sessionItem.querySelector('[data-action="delete"]');
      
      restoreBtn.addEventListener('click', () => restoreSession(session.id));
      openBtn.addEventListener('click', () => openAndRestore(session.id));
      deleteBtn.addEventListener('click', () => deleteSession(session.id));
      
      sessionsList.appendChild(sessionItem);
    });
  });
}


// Restore session cookies to current tab
function restoreSession(sessionId) {
  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      showStatus('Session tidak ditemukan!', 'error');
      return;
    }

    // Send message to background script to restore cookies
    chrome.runtime.sendMessage({
      action: 'restoreSession',
      session: session,
      openNewTab: false
    }, function(response) {
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (response && response.success) {
        showStatus('Session berhasil di-restore! Refresh halaman untuk melihat efek.', 'success');
      } else {
        showStatus('Gagal restore session: ' + (response?.error || 'Unknown error'), 'error');
      }
    });
  });
}

// Open new tab and restore session
function openAndRestore(sessionId) {
  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      showStatus('Session tidak ditemukan!', 'error');
      return;
    }

    // Send message to background script to open tab and restore
    chrome.runtime.sendMessage({
      action: 'restoreSession',
      session: session,
      openNewTab: true
    }, function(response) {
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (response && response.success) {
        showStatus('Tab baru dibuka dengan session restored!', 'success');
        window.close(); // Close popup
      } else {
        showStatus('Gagal membuka tab: ' + (response?.error || 'Unknown error'), 'error');
      }
    });
  });
}

// Delete session
function deleteSession(sessionId) {
  if (!confirm('Yakin ingin menghapus session ini?')) {
    return;
  }

  chrome.storage.local.get(['sessions'], function(result) {
    let sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    sessions = sessions.filter(s => s.id !== sessionId);
    
    chrome.storage.local.set({ sessions: sessions }, function() {
      if (chrome.runtime.lastError) {
        showStatus('Gagal menghapus session!', 'error');
        return;
      }
      
      showStatus(`Session "${session?.name || ''}" berhasil dihapus!`, 'success');
      loadSessions();
    });
  });
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type} show`;
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 4000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Functions are now attached via event listeners in loadSessions()
// No need for global window assignments (CSP compliant)
