# Focus Flow Voice Setup Guide for MacBook Air M1

This guide will help you set up and test the voice features (Speech-to-Text and Text-to-Speech) for the Focus Flow dashboard on your MacBook Air M1.

## Server Details

- **Frontend URL (Tailscale)**: `http://100.98.205.110:5173`
- **Frontend URL (Public IP)**: `http://167.235.63.193:5173`
- **Backend API**: Port 3001
- **Current Setup**: HTTP only (no HTTPS)
- **Voice Implementation**: React-based, uses browser's Web Speech API

## Overview

Focus Flow uses:
- **Web Speech API** for voice recognition (STT)
- **SpeechSynthesis API** for text-to-speech (TTS)
- **AI-powered intent classification** via OpenClaw Gateway for intelligent command routing

---

## Phase 1: System Verification & Browser Selection

### 1.1 Check macOS Voice Input Settings

```bash
# Open System Settings
open "/System/Library/PreferencePanes/Security.prefPane"
```

**Checklist:**
- ✅ Verify microphone is working (test with Voice Memos or QuickTime)
- ✅ Check **System Settings > Privacy & Security > Microphone** permissions
- ✅ Enable Enhanced Dictation: **System Settings > Keyboard > Dictation**

### 1.2 Browser Compatibility Testing

Web Speech API support varies by browser on M1 Mac:

| Browser | STT Support | TTS Support | Recommendation |
|---------|-------------|-------------|----------------|
| Chrome  | ✅ Excellent | ✅ Excellent | **RECOMMENDED** |
| Edge    | ✅ Excellent | ✅ Excellent | Good alternative |
| Arc     | ✅ Good      | ✅ Good      | Based on Chromium |
| Safari  | ⚠️ Limited  | ✅ Good      | Not recommended |
| Firefox | ❌ Poor     | ⚠️ Limited  | Not recommended |

**Test in Browser Console:**

```javascript
// Check if Web Speech API is available
console.log('webkitSpeechRecognition' in window); // Should return true
console.log('SpeechRecognition' in window); // May return false (use webkit version)

// Test basic recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.onresult = (e) => console.log('Heard:', e.results[0][0].transcript);
recognition.start(); // Speak "hello" after allowing mic access

// Test TTS
const utterance = new SpeechSynthesisUtterance("Hello from Focus Flow");
speechSynthesis.speak(utterance);
```

**Recommendation:** Use **Google Chrome** or **Microsoft Edge** for best compatibility.

---

## Phase 2: Network & Access Setup

### 2.1 Access Dashboard from Mac

**Option 1: Tailscale (Recommended)**
```bash
# Assuming Tailscale is installed on Mac
open "http://100.98.205.110:5173"
```

**Option 2: Public IP**
```bash
open "http://167.235.63.193:5173"
```

### 2.2 HTTPS Solution for Microphone Access

Modern browsers require HTTPS for microphone access (except localhost). Choose one of these methods:

#### **Method A: SSH Tunnel (Recommended for Testing)**

```bash
# Create SSH tunnel to access via localhost
ssh -L 5173:localhost:5173 root@167.235.63.193

# Then access in browser:
open "http://localhost:5173"
```

Browsers trust `localhost`, so microphone will work over HTTP.

#### **Method B: Tailscale HTTPS Serving**

On the Ubuntu server:
```bash
# Serve frontend via Tailscale HTTPS
tailscale serve https:443 http://localhost:5173
```

Then access via: `https://[tailscale-machine-name].ts.net`

#### **Method C: Self-Signed Certificate (Advanced)**

If you need HTTPS without tunneling, see the server's nginx/caddy documentation.

---

## Phase 3: Voice Input Testing & Debugging

### 3.1 Test Web Speech API in Browser

Open browser console on any page and run:

```javascript
// Check API availability
if ('webkitSpeechRecognition' in window) {
  console.log('✅ Web Speech API is available');

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => console.log('🎤 Listening...');
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    console.log('📝 Heard:', transcript);
  };
  recognition.onerror = (e) => console.error('❌ Error:', e.error);
  recognition.onend = () => console.log('✋ Stopped');

  // Start listening
  recognition.start();
  console.log('Speak now...');
} else {
  console.log('❌ Web Speech API not supported');
}
```

### 3.2 Test Focus Flow Voice Features

1. **Access Dashboard**:
   - Navigate to `http://localhost:5173` (if using SSH tunnel)
   - Or access via Tailscale/public IP (may need HTTPS for mic)

2. **Test Global Voice FAB**:
   - Look for the floating blue microphone button in bottom-right corner
   - Click it and allow microphone permission when prompted
   - Speak a command: **"Go to inbox"**
   - Should navigate to inbox page

3. **Test Voice Page**:
   - Navigate to `/voice` route
   - Click microphone icon in chat panel
   - Verify:
     - ✅ Permission prompt appears
     - ✅ Microphone icon changes to red when active
     - ✅ Waveform animation shows when speaking
     - ✅ Live transcript appears
     - ✅ Commands are executed

4. **Test Voice Commands**:
   Try these commands:
   ```
   "Go to projects"           → Should navigate to projects page
   "Create a task to test"    → Should create a task
   "How many inbox items?"    → Should query and speak result
   "Show me my projects"      → Should navigate and list projects
   ```

### 3.3 Microphone Permission Troubleshooting

**If permission denied:**
1. Check **System Settings > Privacy & Security > Microphone**
2. Add your browser to allowed apps
3. Reset browser permissions:
   - **Chrome**: Settings → Privacy → Site Settings → Microphone
   - **Safari**: Safari Preferences → Websites → Microphone

**If permission granted but not working:**
1. Check which microphone is selected: **System Settings > Sound > Input**
2. Test with different microphone source
3. Check browser's microphone selection in browser settings

---

## Phase 4: TTS Testing & Voice Selection

### 4.1 Test Text-to-Speech

Open browser console on Focus Flow dashboard:

```javascript
const utterance = new SpeechSynthesisUtterance("Hello from Focus Flow");
speechSynthesis.speak(utterance);
```

Should hear audio through Mac speakers.

### 4.2 Optimize TTS Voice Selection

List available voices:

```javascript
speechSynthesis.getVoices().forEach(v =>
  console.log(`${v.name} (${v.lang}) ${v.localService ? '[local]' : '[remote]'}`)
);
```

**Best English Voices on macOS:**
- "Samantha" (en-US) - Natural female voice
- "Alex" (en-US) - Default male voice
- "Ava" (en-US) - Enhanced female voice

Focus Flow prefers:
1. Voices with "natural" in the name
2. Non-local English voices (higher quality)
3. Local voices as fallback

**Test voice quality:**
```javascript
const voices = speechSynthesis.getVoices();
const samantha = voices.find(v => v.name === 'Samantha');
const utterance = new SpeechSynthesisUtterance("This is a test of the Samantha voice");
utterance.voice = samantha;
speechSynthesis.speak(utterance);
```

---

## Phase 5: Voice Quality Optimization

### 5.1 Microphone Setup & Noise Reduction

1. **Adjust Input Level**:
   - System Settings > Sound > Input > Input Level
   - Test with Voice Memos - adjust so level is in the green range

2. **Enable Noise Reduction** (if available):
   - System Settings > Sound > Input > Use ambient noise reduction

3. **Test Microphone Position**:
   - Speak 12-18 inches from built-in mic
   - If using AirPods, verify Bluetooth connection quality

### 5.2 Voice Recognition Quality Testing

Test with different speech patterns:

```
Normal speed: "Go to inbox and show me my tasks"
Faster speed: "Create task finish report by Friday"
With background noise: (turn on music and try commands)
Commands: "Go to projects" (short, direct)
Sentences: "I need to create a new project called website redesign" (natural)
```

**Expected Accuracy**: >90% for clear speech in quiet environment

### 5.3 Performance Testing

Monitor performance:
1. Open **Activity Monitor** (Applications > Utilities)
2. Test voice commands
3. Check:
   - CPU usage (should be <30% during recognition)
   - Memory usage (browser should stay <500MB)
   - Energy impact (Activity Monitor > Energy tab)

**Latency benchmarks:**
- Speech end to transcript: <500ms
- Command classification: <750ms
- Total command execution: <2 seconds

---

## Phase 6: Advanced Features & Optimization

### 6.1 Hands-Free Mode Testing

In ChatPanel on `/voice` route:
1. Toggle "Hands-Free Mode" switch
2. Speak a command
3. Wait for response
4. Speak another command (should auto-restart listening)
5. Verify continuous operation

**Note:** Hands-free mode increases battery usage. Monitor in Activity Monitor.

### 6.2 Browser-Specific Optimizations

#### **Chrome/Edge on M1:**
```bash
# Check if using ARM or Rosetta
# In browser URL bar:
chrome://version
# Look for "arm64" in the path (native M1) vs "x86_64" (Rosetta)
```

Enable hardware acceleration:
1. Settings → System → Use hardware acceleration when available
2. Restart browser

#### **Safari on M1:**
- Native ARM support (best performance)
- Check: Develop menu → Web Speech API Status
- Test energy impact: Activity Monitor > Energy tab

### 6.3 Create Quick Access Shortcuts

**Bookmark Voice Dashboard:**
```
Name: Focus Flow Voice
URL: http://localhost:5173/voice
```

**Create Keyboard Shortcut (macOS Shortcuts.app):**
1. Open Shortcuts app
2. New Shortcut: "Open Focus Flow"
3. Action: "Open URL" → http://localhost:5173
4. Assign keyboard shortcut: ⌘⌥F (or your preference)

---

## Phase 7: Troubleshooting & Common Issues

### Common Issues Checklist

| Issue | Solution |
|-------|----------|
| ❌ "Speech recognition not supported" | Use Chrome or Edge browser |
| ❌ Microphone permission denied | System Settings > Privacy > Microphone → Add browser |
| ❌ No HTTPS, can't access mic | Use localhost SSH tunnel |
| ❌ Recognition starts but doesn't capture | Check mic selection in System Settings |
| ❌ TTS voice sounds robotic | Switch to "Samantha" or enhanced macOS voice |
| ❌ High CPU usage | Close other tabs, check Activity Monitor |
| ⚠️ Commands not executing | Check backend API is running (port 3001) |
| ⚠️ Classification errors | Verify OpenClaw gateway is running on server |

### Debug Voice Command Flow

Test the full pipeline:

1. **Frontend (Browser Console)**:
   ```javascript
   // Test classification API
   fetch('http://localhost:3001/api/voice-command/classify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ command: 'go to inbox' })
   }).then(r => r.json()).then(console.log);
   ```

2. **Backend (SSH to server)**:
   ```bash
   # Check backend logs
   journalctl -u focus-flow-backend -n 50 -f

   # Test API directly
   curl -X POST http://localhost:3001/api/voice-command/classify \
     -H "Content-Type: application/json" \
     -d '{"command": "show me my inbox"}'
   ```

3. **OpenClaw Gateway**:
   ```bash
   # Check OpenClaw status
   openclaw gateway status

   # View logs
   journalctl -u openclaw-gateway -n 50
   ```

---

## Phase 8: Verification & Final Setup

### End-to-End Workflow Test

Complete this checklist to verify everything works:

- [ ] Can access dashboard from Mac (localhost or Tailscale)
- [ ] Browser console shows Web Speech API available
- [ ] Microphone permission granted
- [ ] Voice FAB visible on dashboard pages (not on /voice)
- [ ] Clicking FAB activates voice command mode
- [ ] Overlay appears with listening indicator
- [ ] Speaking "go to inbox" navigates to inbox
- [ ] Speaking "how many inbox items" returns spoken count
- [ ] Speaking "create a task" creates a task
- [ ] /voice page works for extended conversations
- [ ] Hands-free mode works continuously
- [ ] TTS quality is acceptable
- [ ] No high CPU/battery drain
- [ ] Latency is under 2 seconds

### Save Optimal Configuration

Document your working setup:

```markdown
## My Working Configuration

**Browser**: Chrome 12x (ARM native)
**Access Method**: SSH tunnel to localhost:5173
**Microphone**: Built-in MacBook Air mic
**System Input Level**: 60%
**TTS Voice**: Samantha (en-US)
**Browser Settings**:
  - Hardware acceleration: Enabled
  - Microphone permission: Allowed

**Performance**:
  - Average latency: ~1.2s
  - CPU usage: ~25%
  - Battery impact: Minimal
```

---

## Quick Start Command Reference

### Voice Commands You Can Use

**Navigation:**
```
"Go to inbox"
"Show me my projects"
"Open calendar"
"Go to ideas"
"Show wellbeing"
```

**Create:**
```
"Create a task to [task name]"
"Create a task to [task name] by [day]"
"Create a project called [project name]"
"Create an idea about [idea description]"
"Capture: [quick note text]"
```

**Query:**
```
"How many inbox items do I have?"
"What's on my agenda today?"
"Show me active projects"
"List my tasks"
```

**Update:**
```
"Mark [task name] as done"
"Mark [task name] as in progress"
```

---

## Expected Results Summary

After completing this setup, you should have:

✅ **Browser**: Chrome or Edge with Web Speech API working
✅ **Access**: localhost:5173 via SSH tunnel (or HTTPS via Tailscale)
✅ **Microphone**: Permission granted, input level optimized
✅ **Voice Commands**: Navigation, create, query working
✅ **TTS**: Clear audio output with quality voice
✅ **Performance**: <2s latency, <30% CPU, minimal battery impact
✅ **Documentation**: Your working config saved for future reference

---

## Support

If you encounter issues:

1. Check backend API is running: `systemctl status focus-flow-backend`
2. Check OpenClaw gateway: `openclaw gateway status`
3. Review browser console for JavaScript errors
4. Check backend logs: `journalctl -u focus-flow-backend -n 100`
5. Verify microphone works in other apps (Voice Memos, QuickTime)

**Test the full stack:**
```bash
# On server (via SSH)
curl http://localhost:3001/health
curl http://localhost:3001/api/voice-command/status
curl http://localhost:5173
```

All should return successful responses.

---

**Ready to test!** Start with the SSH tunnel method and work through Phase 3 to test voice commands. 🎤
