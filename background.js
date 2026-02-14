// Auto Login Extension - Background Script (Cookie-based Session)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'restoreSession') {
    handleRestoreSession(request.session, request.openNewTab)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async
  }
});

// Handle session restoration
async function handleRestoreSession(session, openNewTab = false) {
  try {
    if (!session || !session.cookies || session.cookies.length === 0) {
      throw new Error('Session has no cookies');
    }


    let targetTabId;

    if (openNewTab) {
      // Create new tab with the session URL
      const tab = await chrome.tabs.create({ url: session.url });
      targetTabId = tab.id;
      
      // Wait a bit for the page to start loading
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // Use current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab');
      }

      targetTabId = tabs[0].id;
    }

    // Restore cookies
    const cookieResults = await restoreCookies(session.cookies, session.url);
    
    // Inject cookies via content script for JavaScript-accessible cookies
    // and use chrome.cookies API for httpOnly cookies
    await injectCookiesViaContentScript(targetTabId, session.cookies);

    // If opening new tab, refresh to apply cookies
    if (openNewTab) {
      await chrome.tabs.reload(targetTabId);
    }

    return {
      cookiesRestored: cookieResults.success,
      cookiesFailed: cookieResults.failed,
      tabId: targetTabId
    };

  } catch (error) {
    console.error('Error restoring session:', error);
    throw error;
  }
}

// Restore cookies using Chrome Cookies API
async function restoreCookies(cookies, url) {
  const results = { success: 0, failed: 0, errors: [] };
  const urlObj = new URL(url);

  for (const cookie of cookies) {
    try {
      // Prepare cookie data
      const cookieData = {
        url: url,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || '/',
        secure: cookie.secure || false,
        httpOnly: cookie.httpOnly || false,
        sameSite: cookie.sameSite || 'no_restriction'
      };

      // Add domain if specified
      if (cookie.domain) {
        // Remove leading dot if present for chrome.cookies API
        cookieData.domain = cookie.domain.startsWith('.') 
          ? cookie.domain.substring(1) 
          : cookie.domain;
      }

      // Add expiration if exists
      if (cookie.expirationDate) {
        cookieData.expirationDate = cookie.expirationDate;
      }

      // Try to set the cookie
      await chrome.cookies.set(cookieData);
      results.success++;

    } catch (error) {
      results.failed++;
      results.errors.push({ cookie: cookie.name, error: error.message });
      console.warn(`Failed to restore cookie ${cookie.name}:`, error);
    }
  }

  return results;
}

// Inject cookies via content script for better compatibility
async function injectCookiesViaContentScript(tabId, cookies) {
  try {
    // Filter out httpOnly cookies (can't be accessed by JavaScript)
    const jsCookies = cookies.filter(c => !c.httpOnly);
    
    if (jsCookies.length === 0) return;

    // Create script to inject cookies
    const cookieScript = `
      (function() {
        const cookies = ${JSON.stringify(jsCookies)};
        const results = { success: [], failed: [] };
        
        cookies.forEach(cookie => {
          try {
            // Build cookie string
            let cookieStr = encodeURIComponent(cookie.name) + '=' + encodeURIComponent(cookie.value);
            
            if (cookie.path) cookieStr += '; path=' + cookie.path;
            if (cookie.domain) cookieStr += '; domain=' + cookie.domain;
            if (cookie.secure) cookieStr += '; secure';
            if (cookie.sameSite) cookieStr += '; samesite=' + cookie.sameSite.toLowerCase();
            
            // Set expiration if provided
            if (cookie.expirationDate) {
              const date = new Date(cookie.expirationDate * 1000);
              cookieStr += '; expires=' + date.toUTCString();
            }
            
            document.cookie = cookieStr;
            
            // Verify cookie was set
            if (document.cookie.includes(cookie.name + '=')) {
              results.success.push(cookie.name);
            } else {
              results.failed.push({ name: cookie.name, reason: 'Not found after setting' });
            }
          } catch (e) {
            results.failed.push({ name: cookie.name, reason: e.message });
          }
        });
        
        return results;
      })();
    `;

    // Execute script in tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (cookies) => {
        const results = { success: [], failed: [] };
        
        cookies.forEach(cookie => {
          try {
            let cookieStr = encodeURIComponent(cookie.name) + '=' + encodeURIComponent(cookie.value);
            
            if (cookie.path) cookieStr += '; path=' + cookie.path;
            if (cookie.domain) cookieStr += '; domain=' + cookie.domain;
            if (cookie.secure) cookieStr += '; secure';
            if (cookie.sameSite) cookieStr += '; samesite=' + (cookie.sameSite || 'Lax').toLowerCase();
            
            if (cookie.expirationDate) {
              const date = new Date(cookie.expirationDate * 1000);
              cookieStr += '; expires=' + date.toUTCString();
            }
            
            document.cookie = cookieStr;
            results.success.push(cookie.name);
          } catch (e) {
            results.failed.push({ name: cookie.name, error: e.message });
          }
        });
        
        return results;
      },
      args: [jsCookies]
    });

    return results[0]?.result || { success: [], failed: [] };

  } catch (error) {
    console.error('Error injecting cookies via content script:', error);
    return { success: [], failed: [], error: error.message };
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Auto Login Extension installed');
    
    // Initialize storage
    chrome.storage.local.set({ sessions: [] }, () => {
      console.log('Storage initialized');
    });
  }
});

// Handle tab updates (optional: auto-restore on specific URLs)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // This can be used for auto-restore functionality in the future
  // For now, we keep it empty to avoid unexpected behavior
});
