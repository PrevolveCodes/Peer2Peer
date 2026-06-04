// --- MODULE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, off, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- YOUR FIREBASE CONFIGURATION (PLUGGED IN) ---
const firebaseConfig = {
  apiKey: "AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec",
  authDomain: "p2pminimalchat.firebaseapp.com",
  databaseURL: "https://p2pminimalchat-default-rtdb.firebaseio.com",
  projectId: "p2pminimalchat",
  storageBucket: "p2pminimalchat.firebasestorage.app",
  messagingSenderId: "37869407438",
  appId: "1:37869407438:web:63485dde33bb8710f8d49f",
  measurementId: "G-9JNKBE87C3"
};

// --- INITIALIZE REALTIME APP STACKS ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Tracking variables
let currentRoomCode = null;
let currentUsername = "";
let isSignUpMode = true;
let typingTimeout = null;
let databaseListeners = [];

// DOM elements
const authCard = document.getElementById('auth-card');
const lobbyCard = document.getElementById('lobby-card');
const roomCard = document.getElementById('room-card');
const alertBanner = document.getElementById('alert-banner');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');
const pingSound = document.getElementById('ping-sound');

// --- Visual Theme Toggle ---
document.getElementById('theme-toggle').addEventListener('click', (e) => {
    document.body.classList.toggle('light-theme');
    e.target.innerText = document.body.classList.contains('light-theme') ? 'Dark Mode' : 'Light Mode';
});

function showAlert(text) {
    alertBanner.innerText = text || "You need to fill this in before chatting!";
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
}

// --- Dynamic Textarea Sizing ---
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// --- Authentication Engine ---
document.getElementById('auth-switch-btn').addEventListener('click', (e) => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create an Account" : "Welcome Back";
    document.getElementById('auth-username').parentNode.classList.toggle('hidden', !isSignUpMode);
    document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Log In";
    e.target.innerText = isSignUpMode ? "Already have an account? Log In" : "Need an account? Sign Up";
});

document.getElementById('auth-submit-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('auth-username').value.trim();

    if (!email || !password || (isSignUpMode && !username)) return showAlert();

    try {
        if (isSignUpMode) {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName: username });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showAlert(error.message);
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUsername = user.displayName || "Anonymous";
        document.getElementById('user-display-name').innerText = currentUsername;
        authCard.classList.add('hidden');
        lobbyCard.classList.remove('hidden');
    } else {
        leaveRoom();
        lobbyCard.classList.add('hidden');
        roomCard.classList.add('hidden');
        authCard.classList.remove('hidden');
    }
});

// --- Room Logic Components ---
document.getElementById('create-btn').addEventListener('click', async () => {
    const password = document.getElementById('room-password-input').value.trim();
    if (!password) return showAlert();

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Write setup structural node into Firebase
    await set(ref(db, `rooms/${roomCode}/meta`), { password: password });
    enterRoom(roomCode);
});

document.getElementById('join-btn').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const password = document.getElementById('room-password-input').value.trim();

    if (!code || !password) return showAlert();

    // Verify password against database entry
    onValue(ref(db, `rooms/${code}/meta/password`), (snapshot) => {
        if (snapshot.exists() && snapshot.val() === password) {
            enterRoom(code);
        } else {
            showAlert("Invalid Room Code or Password!");
        }
    }, { onlyOnce: true });
});

// --- Active Chat Implementation ---
function enterRoom(roomCode) {
    currentRoomCode = roomCode;
    lobbyCard.classList.add('hidden');
    roomCard.classList.remove('hidden');
    document.getElementById('display-code').innerText = roomCode;
    chatBox.innerHTML = '';

    // Listen to real-time database messages
    const messagesRef = ref(db, `rooms/${roomCode}/messages`);
    const msgListener = onValue(messagesRef, (snapshot) => {
        chatBox.innerHTML = '';
        let isFirstLoad = chatBox.children.length === 0;
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const identity = data.sender === currentUsername ? 'me' : 'them';
            appendBubble(data.sender, data.text, identity, !isFirstLoad);
        });
    });
    databaseListeners.push({ ref: messagesRef, callback: msgListener });

    // Listen to typing alerts from other users
    const typingRef = ref(db, `rooms/${roomCode}/typing`);
    const typeListener = onValue(typingRef, (snapshot) => {
        let typingUsers = [];
        snapshot.forEach((child) => {
            if (child.val() === true && child.key !== currentUsername) {
                typingUsers.push(child.key);
            }
        });
        typingIndicator.innerText = typingUsers.length > 0 ? `${typingUsers.join(', ')} is typing...` : '';
    });
    databaseListeners.push({ ref: typingRef, callback: typeListener });
}

function leaveRoom() {
    if (!currentRoomCode) return;
    set(ref(db, `rooms/${currentRoomCode}/typing/${currentUsername}`), null);
    
    // Clear dynamic bindings
    databaseListeners.forEach(listener => off(listener.ref, 'value', listener.callback));
    databaseListeners = [];
    
    currentRoomCode = null;
    roomCard.classList.add('hidden');
    lobbyCard.classList.remove('hidden');
}
document.getElementById('leave-btn').addEventListener('click', leaveRoom);

function appendBubble(sender, text, identity, triggerSound = false) {
    const html = `
        <div class="bubble-row ${identity}">
            <span class="bubble-user">${sender}</span>
            <div class="bubble-text">${text}</div>
        </div>`;
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;

    if (identity === 'them' && triggerSound) {
        pingSound.currentTime = 0;
        pingSound.play().catch(() => {});
    }
}

// --- Output Dispatch System ---
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentRoomCode) return;

    await push(ref(db, `rooms/${currentRoomCode}/messages`), {
        sender: currentUsername,
        text: text,
        timestamp: Date.now()
    });

    messageInput.value = '';
    messageInput.style.height = 'auto';
    update(ref(db, `rooms/${currentRoomCode}/typing`), { [currentUsername]: false });
}

document.getElementById('send-btn').addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// --- Transmit Dynamic Typing Signals ---
messageInput.addEventListener('input', () => {
    if (!currentRoomCode) return;
    
    if (!typingTimeout) {
        update(ref(db, `rooms/${currentRoomCode}/typing`), { [currentUsername]: true });
    } else {
        clearTimeout(typingTimeout);
    }

    typingTimeout = setTimeout(() => {
        update(ref(db, `rooms/${currentRoomCode}/typing`), { [currentUsername]: false });
        typingTimeout = null;
    }, 1500);
});

// --- Utility Actions ---
document.getElementById('copy-btn').addEventListener('click', (e) => {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        e.target.innerText = "Copied!";
        setTimeout(() => e.target.innerText = "Copy Code", 2000);
    });
});
