# 🍪 Session Cookies Keeper - Chrome Extension

A Chrome Extension to save and restore login sessions using cookies. No more remembering passwords — just save your session cookies! 

<img width="507" height="754" alt="image" src="https://github.com/user-attachments/assets/41c17bd8-de65-461e-8de2-0a7dede30436" />


## 🎯 Main Features

- **Save Session** – Save login cookies from the active tab with one click  
- **Restore Session** – Restore cookies for automatic login  
- **Open & Login** – Open the website in a new tab with the session instantly active  
- **Multi Session** – Save multiple sessions for different websites  
- **Secure** – Does not store passwords, only session cookies  

## 📁 File Structure

```
../Session-cookie-keeper/
├── manifest.json      # Chrome extension configuration
├── popup.html         # Extension popup UI
├── popup.css          # Popup styling
├── popup.js           # Popup logic (save/load sessions)
├── background.js      # Service worker (restore cookies)
├── content.js         # Content script (cookie injection)
├── icons/             # Extension icons folder
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This documentation
```

## 🚀 How to Install

1. **Open Chrome Extensions**
   - Type `chrome://extensions/` in the Chrome address bar  
   - Or click Chrome menu → More tools → Extensions  

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner (ON)

3. **Load the Extension**
   - Click **"Load unpacked"**
   - Select the folder `../Session-cookie-keeper`
   - The extension will appear in the list

4. **Pin the Extension (Optional)**
   - Click the puzzle icon 🧩 in the toolbar
   - Click the pin icon 📌 next to "Auto Login"
   - The icon will appear in the toolbar for quick access

## 📖 How to Use

### Saving a Login Session

1. **Log in to the website** you want to save (example: Gmail, Facebook, Netflix)
2. **Make sure you are logged in** and the session is active
3. **Click the Auto Login icon** in the Chrome toolbar
4. **Enter a session name** (example: "Personal Gmail")
5. Click **"Save Session"**
6. The extension will capture all cookies from that website

### Restoring a Session (Auto Login)

**Method 1: Restore in the Active Tab**
1. Open the website you want to log in to (or stay on any page)
2. Click the Auto Login icon
3. Click **"🔓 Restore Session"** on the session you want
4. Cookies will be applied to the active tab
5. Refresh the page (F5) if needed

**Method 2: Open a New Tab + Auto Login**
1. Click the Auto Login icon
2. Click **"🌐 Open & Login"** on the session you want
3. A new tab will open with the saved website URL
4. Session cookies will automatically be restored
5. You will be logged in instantly!

### Deleting a Session

1. Click the Auto Login icon
2. Click the **"🗑️"** (delete) button on the session you want to remove
3. Confirm deletion

## 🔧 Required Permissions

| Permission | Function |
|------------|----------|
| `storage` | Stores session data locally |
| `cookies` | Reads and sets cookies |
| `tabs` | Opens new tabs and accesses the active tab |
| `activeTab` | Accesses the currently active tab |
| `scripting` | Injects scripts to set cookies |
| `<all_urls>` | Access to all websites |

## ⚠️ Important Notes

### Security & Privacy
- **Cookies are stored locally** in your browser (Chrome Storage)
- **No data is sent to any server** — 100% offline
- **Be careful when sharing your device** — anyone with browser access can use saved sessions

### Limitations
- **HttpOnly Cookies** – Some cookies with the `httpOnly` flag cannot be accessed by JavaScript, but the extension still attempts restoration via Chrome Cookies API  
- **Session Expired** – If the server session has expired, restoring cookies will not work  
- **Cross-Domain** – Cookies with domain restrictions may not work across different subdomains  
- **Secure Cookies** – Cookies with the `secure` flag only work on HTTPS websites  

### Troubleshooting

**Session does not work after restoring?**
- Make sure you did not log out from the website on another device
- Try refreshing the page (F5) after restoring
- Check if the session has expired on the server

**Cookies are not saved?**
- Make sure you are logged in before saving the session
- Some websites use anti-cookie-stealing protections
- Try saving the session again a few seconds after logging in

**Website does not recognize the login?**
- Some websites use additional fingerprinting (IP, User-Agent, etc.)
- Sessions may be limited to a specific device/browser

## 🛠️ Technical Details

### How Does It Work?

1. **Save Session**
   - Collect all cookies from the website domain using `chrome.cookies.getAll()`
   - Store them in Chrome Storage with metadata (name, URL, timestamp)

2. **Restore Session**
   - Use `chrome.cookies.set()` to restore HttpOnly cookies
   - Inject JavaScript to restore cookies accessible via JS
   - Refresh the tab to apply changes

3. **Auto-Login**
   - Open a new tab with the saved URL
   - Wait for the page to load
   - Restore cookies
   - Refresh to apply the session

### Browser Support

- ✅ Chrome (Chromium-based)
- ✅ Microsoft Edge
- ✅ Brave
- ✅ Opera
- ❌ Firefox (requires Manifest V2 modifications)

## 🤝 Contributing

Feel free to fork and submit a pull request for improvements or new features!

## 📄 License

MIT License — Free to use for personal or commercial purposes.

---

**Made with ❤️ to make accessing your favorite websites easier**
