let peer = null;
let connections = []; 
let isHost = false;
let myUsername = "Anonymous";
let typingTimeout = null;

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const lobby = document.getElementById('lobby');
const roomDiv = document.getElementById('room');
const usernameInput = document.getElementById('username-input');
const roomCodeInput = document.getElementById('room-code-input');
const displayCode = document.getElementById('display-code');
const copyBtn = document.getElementById('copy-btn');
const chatBox = document.getElementById('chat-box');
const typingIndicator = document.getElementById('typing-indicator');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// --- Feature: Light/Dark Theme Toggle ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    themeToggle.innerText = document.body.classList.contains('dark-theme') ? 'Light Mode' : 'Dark Mode';
});

// --- Feature: Copy Room Code ---
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(displayCode.innerText).then(() => {
        copyBtn.innerText = "Copied!";
        setTimeout(() => copyBtn.innerText = "Copy Code", 2000);
    });
});

// --- UI Helpers ---
function appendMessage(sender, text, type = 'user') {
    let msgHtml = '';
    if (type === 'system') {
        msgHtml = `<div class="msg msg-system">${text}</div>`;
    } else {
        msgHtml = `<div class="msg"><span class="msg-user">${sender}</span>${text}</div>`;
    }
    chatBox.innerHTML += msgHtml;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Broadcast Helper ---
function broadcast(payload, ignoreConnection = null) {
    connections.forEach(conn => {
        if (conn.open && conn !== ignoreConnection) {
            conn.send(payload);
        }
    });
}

// --- Setup Connection Flow ---
function setupConnection(conn) {
    connections.push(conn);

    conn.on('data', (data) => {
        if (data.type === 'join') {
            // Store username on connection metadata
            conn.peerUsername = data.username;
            appendMessage('System', `${data.username} joined the room!`, 'system');
            
            // If Host, broadcast this join message to all other connected peers
            if (isHost) {
                broadcast({ type: 'join', username: data.username }, conn);
            }
        } 
        else if (data.type === 'chat') {
            appendMessage(data.sender, data.text);
            if (isHost) broadcast(data, conn); // Host relays to everyone else
        } 
        else if (data.type === 'typing') {
            if (data.isTyping) {
                typingIndicator.innerText = `${data.username} is typing...`;
            } else {
                typingIndicator.innerText = '';
            }
            if (isHost) broadcast(data, conn); // Host relays typing status
        }
    });

    conn.on('close', () => {
        const leftUser = conn.peerUsername || 'Someone';
        appendMessage('System', `${leftUser} left the room.`, 'system');
        connections = connections.filter(c => c !== conn);
        typingIndicator.innerText = '';
    });
}

// --- Action: Create Room (Host) ---
document.getElementById('create-btn').addEventListener('click', () => {
    if (usernameInput.value.trim()) myUsername = usernameInput.value.trim();
    isHost = true;

    // Generate clean 6-digit capitalized code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    peer = new Peer(roomCode);

    peer.on('open', (id) => {
        lobby.classList.add('hidden');
        roomDiv.classList.remove('hidden');
        displayCode.innerText = id;
        appendMessage('System', `Room created. You joined as "${myUsername}".`, 'system');
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });
});

// --- Action: Join Room (Guest) ---
document.getElementById('join-btn').addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) return alert('Please enter a room code');
    if (usernameInput.value.trim()) myUsername = usernameInput.value.trim();

    peer = new Peer(); // Random ID for guest

    peer.on('open', () => {
        lobby.classList.add('hidden');
        roomDiv.classList.remove('hidden');
        displayCode.innerText = code;
        
        const conn = peer.connect(code);
        setupConnection(conn);

        conn.on('open', () => {
            appendMessage('System', `You joined the room as "${myUsername}".`, 'system');
            // Tell the host our username immediately upon connecting
            conn.send({ type: 'join', username: myUsername });
        });
    });
});

// --- Action: Send Message ---
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const payload = { type: 'chat', sender: myUsername, text: text };
    
    broadcast(payload); // Send to everyone else
    appendMessage('You', text); // Add to our screen

    // Stop typing status instantly on send
    messageInput.value = '';
    sendTypingStatus(false);
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// --- Feature: "** is typing..." Logic ---
function sendTypingStatus(isTyping) {
    broadcast({ type: 'typing', username: myUsername, isTyping: isTyping });
}

messageInput.addEventListener('input', () => {
    // Clear old timer if typing continues
    if (typingTimeout) clearTimeout(typingTimeout);
    else sendTypingStatus(true); // Broadcast that we started typing

    // If user stops typing for 1.5 seconds, clear the status
    typingTimeout = setTimeout(() => {
        sendTypingStatus(false);
        typingTimeout = null;
    }, 1500);
});