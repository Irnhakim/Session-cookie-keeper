// Auto Login Extension - Popup Script (Cookie-based Session)

// Global variable to track edit state
let currentEditHandler = null;

document.addEventListener('DOMContentLoaded', function() {
  // Load saved sessions on startup
  loadSessions();

  // Form submission handler
  document.getElementById('saveSessionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveCurrentSession();
  });

  // Export/Import handlers
  document.getElementById('exportBtn').addEventListener('click', exportSessions);
  document.getElementById('importBtn').addEventListener('click', function() {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importSessions);
});

// Save current session (cookies from active tab)
function saveCurrentSession() {
  const sessionName = document.getElementById('sessionName').value.trim();

  if (!sessionName) {
    showStatus('Please enter a session name!', 'error');
    return;
  }

  // Get active tab to extract URL and cookies
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showStatus('No active tab!', 'error');
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
        showStatus('No cookies found. Make sure you are logged in!', 'error');
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
          if (!confirm(`Session "${sessionName}" already exists. Overwrite?`)) {
            return;
          }
          sessions[existingIndex] = sessionData;
        } else {
          sessions.push(sessionData);
        }
        
        chrome.storage.local.set({ sessions: sessions }, function() {
          if (chrome.runtime.lastError) {
            showStatus('Failed to save session!', 'error');
            return;
          }
          
          const cookieCount = cookies ? cookies.length : 0;
          showStatus(`Session "${sessionName}" saved successfully! (${cookieCount} cookies)`, 'success');
          document.getElementById('saveSessionForm').reset();
          loadSessions();
        });
      });
    }).catch(function(error) {
      console.error('Error getting cookies:', error);
      showStatus('Error getting cookies: ' + error.message, 'error');
    });
  });
}

// Load and display saved sessions
function loadSessions() {
  // Clean up any existing edit handler
  if (currentEditHandler) {
    document.removeEventListener('click', currentEditHandler);
    currentEditHandler = null;
  }

  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    const sessionsList = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
      sessionsList.innerHTML = '<p class="empty-state">No sessions saved yet</p>';
      return;
    }

    sessionsList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'account-item';
      sessionItem.dataset.sessionId = session.id;
      
      const cookieCount = session.cookies ? session.cookies.length : 0;
      const createdDate = new Date(session.createdAt).toLocaleDateString('en-US');
      
      sessionItem.innerHTML = `
        <div class="account-header">
          <div class="account-name-wrapper">
            <span class="account-name">${escapeHtml(session.name)}</span>
            <button class="btn-edit" data-action="edit" title="Edit session name">✏️</button>
          </div>
          <span class="cookie-count">${cookieCount} 🍪</span>
        </div>
        <div class="account-url">${escapeHtml(session.domain)}</div>
        <div class="account-meta">Saved: ${createdDate}</div>
        <div class="account-actions">
          <button class="btn btn-success" data-action="restore">
            🔓 Restore Session
          </button>
          <button class="btn btn-secondary" data-action="open">
            🌐 Open & Login
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
      const editBtn = sessionItem.querySelector('[data-action="edit"]');
      
      restoreBtn.addEventListener('click', () => restoreSession(session.id));
      openBtn.addEventListener('click', () => openAndRestore(session.id));
      deleteBtn.addEventListener('click', () => deleteSession(session.id));
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering other clicks
        editSessionName(session.id, sessionItem);
      });
      
      sessionsList.appendChild(sessionItem);
    });
  });
}

// Edit session name
function editSessionName(sessionId, sessionItem) {
  // Clean up any existing edit handler first
  if (currentEditHandler) {
    document.removeEventListener('click', currentEditHandler);
    currentEditHandler = null;
  }

  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      showStatus('Session not found!', 'error');
      return;
    }

    const nameWrapper = sessionItem.querySelector('.account-name-wrapper');
    const currentName = session.name;
    
    // Create edit input
    nameWrapper.innerHTML = `
      <input type="text" class="edit-name-input" value="${escapeHtml(currentName)}" />
      <button class="btn-save-edit" title="Save">✅</button>
      <button class="btn-cancel-edit" title="Cancel">❌</button>
    `;
    
    const input = nameWrapper.querySelector('.edit-name-input');
    const saveBtn = nameWrapper.querySelector('.btn-save-edit');
    const cancelBtn = nameWrapper.querySelector('.btn-cancel-edit');
    
    // Focus on input
    input.focus();
    input.select();
    
    // Save handler
    const saveEdit = () => {
      const newName = input.value.trim();
      
      if (!newName) {
        showStatus('Session name cannot be empty!', 'error');
        return;
      }
      
      if (newName === currentName) {
        // No change, just reload
        cleanupAndReload();
        return;
      }
      
      // Check for duplicate names
      const nameExists = sessions.some(s => s.id !== sessionId && s.name === newName);
      if (nameExists) {
        showStatus('A session with this name already exists!', 'error');
        return;
      }
      
      // Update session name
      session.name = newName;
      session.updatedAt = new Date().toISOString();
      
      chrome.storage.local.set({ sessions: sessions }, function() {
        if (chrome.runtime.lastError) {
          showStatus('Failed to update session name!', 'error');
          return;
        }
        
        showStatus(`Session renamed to "${newName}" successfully!`, 'success');
        cleanupAndReload();
      });
    };
    
    // Cancel handler
    const cancelEdit = () => {
      cleanupAndReload();
    };
    
    // Cleanup function
    const cleanupAndReload = () => {
      if (currentEditHandler) {
        document.removeEventListener('click', currentEditHandler);
        currentEditHandler = null;
      }
      loadSessions();
    };
    
    // Event listeners for buttons
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveEdit();
    });
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelEdit();
    });
    
    // Enter key to save, Escape key to cancel
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
    
    // Click outside to cancel
    currentEditHandler = (e) => {
      if (!nameWrapper.contains(e.target)) {
        cancelEdit();
      }
    };
    
    // Delay adding the click listener to avoid immediate trigger
    setTimeout(() => {
      if (currentEditHandler) {
        document.addEventListener('click', currentEditHandler);
      }
    }, 100);
  });
}

// Restore session cookies to current tab
function restoreSession(sessionId) {
  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      showStatus('Session not found!', 'error');
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
        showStatus('Session restored successfully! Refresh the page to see the effect.', 'success');
      } else {
        showStatus('Failed to restore session: ' + (response?.error || 'Unknown error'), 'error');
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
      showStatus('Session not found!', 'error');
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
        showStatus('New tab opened with session restored!', 'success');
        window.close(); // Close popup
      } else {
        showStatus('Failed to open tab: ' + (response?.error || 'Unknown error'), 'error');
      }
    });
  });
}

// Delete session
function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) {
    return;
  }

  chrome.storage.local.get(['sessions'], function(result) {
    let sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    sessions = sessions.filter(s => s.id !== sessionId);
    
    chrome.storage.local.set({ sessions: sessions }, function() {
      if (chrome.runtime.lastError) {
        showStatus('Failed to delete session!', 'error');
        return;
      }
      
      showStatus(`Session "${session?.name || ''}" deleted successfully!`, 'success');
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

// Export sessions to JSON file
function exportSessions() {
  chrome.storage.local.get(['sessions'], function(result) {
    const sessions = result.sessions || [];
    
    if (sessions.length === 0) {
      showStatus('No sessions to export!', 'error');
      return;
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sessions: sessions
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-cookies-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showStatus(`Exported ${sessions.length} sessions successfully!`, 'success');
  });
}

// Import sessions from JSON file
function importSessions(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importData = JSON.parse(e.target.result);
      
      if (!importData.sessions || !Array.isArray(importData.sessions)) {
        throw new Error('Invalid file format: sessions array not found');
      }

      const sessions = importData.sessions;
      
      // Validate session structure
      const validSessions = sessions.filter(session => {
        return session.id && session.name && session.url && session.cookies;
      });

      if (validSessions.length === 0) {
        throw new Error('No valid sessions found in file');
      }

      // Check for duplicates and merge
      chrome.storage.local.get(['sessions'], function(result) {
        const existingSessions = result.sessions || [];
        const existingIds = new Set(existingSessions.map(s => s.id));
        const existingNames = new Set(existingSessions.map(s => s.name));
        
        let addedCount = 0;
        let skippedCount = 0;
        
        validSessions.forEach(session => {
          if (existingIds.has(session.id)) {
            // Skip duplicate ID
            skippedCount++;
          } else if (existingNames.has(session.name)) {
            // Rename if name exists
            let newName = session.name;
            let counter = 1;
            while (existingNames.has(newName)) {
              newName = `${session.name} (imported ${counter})`;
              counter++;
            }
            session.name = newName;
            existingNames.add(newName);
            existingSessions.push(session);
            addedCount++;
          } else {
            existingNames.add(session.name);
            existingSessions.push(session);
            addedCount++;
          }
        });

        chrome.storage.local.set({ sessions: existingSessions }, function() {
          if (chrome.runtime.lastError) {
            showStatus('Failed to import sessions!', 'error');
            return;
          }
          
          showStatus(`Import complete! Added ${addedCount} sessions, skipped ${skippedCount} duplicates.`, 'success');
          loadSessions();
        });
      });

    } catch (error) {
      showStatus('Import failed: ' + error.message, 'error');
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  reader.onerror = function() {
    showStatus('Error reading file!', 'error');
    event.target.value = '';
  };
  
  reader.readAsText(file);
}
