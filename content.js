// Auto Login Extension - Content Script (Cookie-based Session)
// This script helps with cookie verification and session restoration

(function() {
  'use strict';

  // Log when content script loads
  console.log('[Auto Login] Content script loaded on:', window.location.href);

  // Listen for messages from background/popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkLoginStatus') {
      checkLoginStatus().then(sendResponse);
      return true; // Keep channel open for async
    }
    
    if (request.action === 'getPageInfo') {
      sendResponse({
        url: window.location.href,
        title: document.title,
        cookies: document.cookie,
        hasLoginForm: detectLoginForm()
      });
    }
    
    if (request.action === 'setCookies') {
      setCookies(request.cookies).then(sendResponse);
      return true;
    }
  });

  // Check if user is logged in (heuristic)
  async function checkLoginStatus() {
    const indicators = {
      // Common login indicator elements
      loginLink: !!document.querySelector('a[href*="login"], a[href*="signin"], button[data-testid="login"]'),
      logoutLink: !!document.querySelector('a[href*="logout"], a[href*="signout"], button[data-testid="logout"]'),
      userProfile: !!document.querySelector('[class*="profile"], [class*="avatar"], [class*="user-menu"]'),
      username: !!document.querySelector('[class*="username"], [class*="user-name"]')
    };

    // Check cookies for common session indicators
    const cookies = document.cookie;
    const sessionIndicators = [
      'session', 'auth', 'token', 'login', 'user', 'id', 'sid',
      'PHPSESSID', 'JSESSIONID', 'ASP.NET_SessionId'
    ];
    
    const hasSessionCookie = sessionIndicators.some(indicator => 
      cookies.toLowerCase().includes(indicator.toLowerCase())
    );

    return {
      isLoggedIn: indicators.logoutLink || indicators.userProfile || hasSessionCookie,
      indicators: indicators,
      hasSessionCookie: hasSessionCookie,
      cookieCount: cookies.split(';').filter(c => c.trim()).length
    };
  }

  // Detect if page has login form
  function detectLoginForm() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const loginButtons = document.querySelectorAll(
      'button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign in")'
    );
    
    return {
      hasPasswordField: passwordInputs.length > 0,
      passwordFieldCount: passwordInputs.length,
      hasSubmitButton: loginButtons.length > 0,
      isProbablyLoginPage: passwordInputs.length > 0
    };
  }

  // Set cookies from session data
  async function setCookies(cookies) {
    const results = { success: [], failed: [] };
    
    cookies.forEach(cookie => {
      try {
        // Skip httpOnly cookies - they can't be set via JavaScript
        if (cookie.httpOnly) {
          results.failed.push({ 
            name: cookie.name, 
            reason: 'httpOnly cookie cannot be set via JavaScript' 
          });
          return;
        }

        // Build cookie string
        let cookieStr = encodeURIComponent(cookie.name) + '=' + encodeURIComponent(cookie.value);
        
        if (cookie.path) {
          cookieStr += '; path=' + cookie.path;
        }
        
        if (cookie.domain) {
          // For JavaScript, we usually don't set domain explicitly
          // unless it's a subdomain situation
          const currentDomain = window.location.hostname;
          if (cookie.domain && cookie.domain !== currentDomain) {
            cookieStr += '; domain=' + cookie.domain;
          }
        }
        
        if (cookie.secure) {
          cookieStr += '; secure';
        }
        
        if (cookie.sameSite) {
          cookieStr += '; samesite=' + cookie.sameSite.toLowerCase();
        }
        
        if (cookie.expirationDate) {
          const date = new Date(cookie.expirationDate * 1000);
          cookieStr += '; expires=' + date.toUTCString();
        }

        // Set the cookie
        document.cookie = cookieStr;
        
        // Verify it was set
        if (document.cookie.includes(cookie.name + '=')) {
          results.success.push(cookie.name);
        } else {
          results.failed.push({ 
            name: cookie.name, 
            reason: 'Cookie not found after setting' 
          });
        }
        
      } catch (error) {
        results.failed.push({ 
          name: cookie.name, 
          reason: error.message 
        });
      }
    });

    return results;
  }

  // Auto-refresh if cookies were just restored (optional enhancement)
  // This helps ensure the page recognizes the new session
  function autoRefreshIfNeeded() {
    // Check if we just restored a session (can be set by background script)
    if (sessionStorage.getItem('autoLoginJustRestored')) {
      sessionStorage.removeItem('autoLoginJustRestored');
      
      // Only refresh if we're on a login page
      const loginInfo = detectLoginForm();
      if (loginInfo.isProbablyLoginPage) {
        console.log('[Auto Login] Auto-refreshing to apply restored session...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  }

  // Run on load
  autoRefreshIfNeeded();

  // Expose helper for debugging (only in development)
  if (location.hostname === 'localhost' || location.protocol === 'file:') {
    window.autoLoginHelper = {
      checkLoginStatus,
      detectLoginForm,
      getCookies: () => document.cookie,
      setCookies
    };
  }
})();
