import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, off, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your verified Firebase configuration keys
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

// Initialize Application Stacks
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// State tracking variables
let currentUid = null;
let currentUsername = "";
let currentStatus = "";
let currentTextColor = "#22c55e"; // Default fallback
let currentRoomCode = null;
let isSignUpMode = true;
let typingTimeout = null;
let activeRoomListeners = [];
let myJoinedRoomsList = {};

// DOM Elements
const authCard = document.getElementById('auth-card');
const appLayout = document.getElementById('app-layout');
const profileCard = document.getElementById('profile-card');
const welcomeView = document.getElementById('welcome-view');
const roomView = document.getElementById('room-view');
const roomMenuList = document.getElementById('room-menu-list');
const alertBanner = document.getElementById('alert-banner');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');
const pingSound = document.getElementById('ping-sound');

// --- Visual Theme Toggle ---
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
});

function showAlert(text) {
    alertBanner.innerText = text || "Error matching inputs!";
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
}

// --- Textarea Expand On Input Type ---
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// --- Settings Profile Dashboard Handlers ---
document.getElementById('profile-nav-btn').addEventListener('click', () => {
    welcomeView.classList.add('hidden');
    roomView.classList.add('hidden');
    profileCard.classList.remove('hidden');
    
    // Fill out settings panels with current user profile values
    document.getElementById('edit-username-input').value = currentUsername;
    document.getElementById('edit-status-input').value = currentStatus;
    document.getElementById('edit-color-input').value = currentTextColor;
});

document.getElementById('close-profile-btn').addEventListener('click', () => {
    profileCard.classList.add('hidden');
    if (currentRoomCode) roomView.classList.remove('hidden');
    else welcomeView.classList.remove('hidden');
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const newName = document.getElementById('edit-username-input').value.trim();
    const newStatus = document.getElementById('edit-status-input').value.trim();
    const newColor = document.getElementById('edit-color-input').value;

    if (!newName) return showAlert("Name cannot be empty!");
    
    try {
        await updateProfile(auth.currentUser, { displayName: newName });
        
        // Save metadata into global shared profile tree
        await update(ref(db, `users/${currentUid}/profile`), {
            username: newName,
            statusText: newStatus,
            colorAccent: newColor
        });

        profileCard.classList.add('hidden');
        if (currentRoomCode) roomView.classList.remove('hidden');
        else welcomeView.classList.remove('hidden');
        showAlert("Profile changes saved!");
    } catch (e) { showAlert(e.message); }
});

// --- Authentication Operations ---
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
    if (!email || !password || (isSignUpMode && !username)) return showAlert("Fill out fields!");
    try {
        if (isSignUpMode) {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: username });
            await set(ref(db, `users/${res.user.uid}/profile`), {
                username: username,
                statusText: "",
                colorAccent: "#22c55e"
            });
        } else { await signInWithEmailAndPassword(auth, email, password); }
    } catch (e) { showAlert(e.message); }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUid = user.uid;
        authCard.classList.add('hidden');
        appLayout.classList.remove('hidden');

        // Watch user profile variations dynamically
        onValue(ref(db, `users/${currentUid}/profile`), (snapshot) => {
            const data = snapshot.val() || {};
            currentUsername = data.username || user.displayName || "User";
            currentStatus = data.statusText || "";
            currentTextColor = data.colorAccent || "#22c55e";

            document.getElementById('user-display-name').innerText = currentUsername;
            document.getElementById('user-custom-status').innerText = currentStatus;
        });

        syncSidebarMenu();
    } else {
        detachActiveRoomListeners();
        currentUid = null;
        currentRoomCode = null;
        appLayout.classList.add('hidden');
        authCard.classList.remove('hidden');
    }
});

// --- Sidebar Menu Management ---
function syncSidebarMenu() {
    const userMenuRef = ref(db, `users/${currentUid}/joinedRooms`);
    onValue(userMenuRef, (snapshot) => {
        roomMenuList.innerHTML = '';
        myJoinedRoomsList = snapshot.val() || {};
        
        Object.keys(myJoinedRoomsList).forEach(code => {
            const div = document.createElement('div');
            div.className = `room-item ${currentRoomCode === code ? 'active' : ''}`;
            div.innerText = code;
            div.onclick = () => selectRoom(code);
            roomMenuList.appendChild(div);
        });
    });
}

// Create Room Action
document.getElementById('create-room-btn').addEventListener('click', async () => {
    const pass = document.getElementById('sidebar-room-pass').value.trim();
    if (!pass) return showAlert("Please set a room password!");

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await set(ref(db, `rooms/${roomCode}/meta`), { password: pass });
    await set(ref(db, `users/${currentUid}/joinedRooms/${roomCode}`), true);
    
    document.getElementById('sidebar-room-pass').value = '';
    selectRoom(roomCode);
});

// Join Room Action
document.getElementById('join-room-btn').addEventListener('click', async () => {
    const code = document.getElementById('sidebar-room-code').value.trim().toUpperCase();
    const pass = document.getElementById('sidebar-room-pass').value.trim();
    if (!code || !pass) return showAlert("Enter Room Code and Password!");

    const roomMetaPassRef = ref(db, `rooms/${code}/meta/password`);
    const snapshot = await get(roomMetaPassRef);
    
    if (snapshot.exists() && snapshot.val() === pass) {
        await set(ref(db, `users/${currentUid}/joinedRooms/${code}`), true);
        document.getElementById('sidebar-room-code').value = '';
        document.getElementById('sidebar-room-pass').value = '';
        selectRoom(code);
    } else {
        showAlert("Invalid Code or Password!");
    }
});

// Remove Room Action
document.getElementById('remove-room-btn').addEventListener('click', async () => {
    if (!currentRoomCode) return;
    await set(ref(db, `users/${currentUid}/joinedRooms/${currentRoomCode}`), null);
    welcomeView.classList.remove('hidden');
    roomView.classList.add('hidden');
    detachActiveRoomListeners();
    currentRoomCode = null;
    syncSidebarMenu();
});

// --- Chat Workspace Loader ---
function selectRoom(roomCode) {
    profileCard.classList.add('hidden');
    welcomeView.classList.add('hidden');
    roomView.classList.remove('hidden');
    
    if (currentRoomCode) {
        set(ref(db, `rooms/${currentRoomCode}/typing/${currentUsername}`), null);
    }
    detachActiveRoomListeners();
    
    currentRoomCode = roomCode;
    document.getElementById('active-room-title').innerText = roomCode;
    chatBox.innerHTML = '';

    Array.from(roomMenuList.children).forEach(el => {
        el.classList.toggle('active', el.innerText === roomCode);
    });

    // Sub to message history nodes
    const messagesRef = ref(db, `rooms/${roomCode}/messages`);
    const msgListener = onValue(messagesRef, (snapshot) => {
        chatBox.innerHTML = '';
        let isFirstLoad = chatBox.children.length === 0;
        snapshot.forEach(child => {
            const data = child.val();
            const id = data.sender === currentUsername ? 'me' : 'them';
            appendBubble(data.sender, data.text, id, data.senderColor, !isFirstLoad);
        });
    });
    activeRoomListeners.push({ ref: messagesRef, callback: msgListener });

    // Sub to typing alerts node
    const typingRef = ref(db, `rooms/${roomCode}/typing`);
    const typeListener = onValue(typingRef, (snapshot) => {
        let typingUsers = [];
        snapshot.forEach(child => {
            if (child.val() === true && child.key !== currentUsername) typingUsers.push(child.key);
        });
        typingIndicator.innerText = typingUsers.length > 0 ? `${typingUsers.join(', ')} is typing...` : '';
    });
    activeRoomListeners.push({ ref: typingRef, callback: typeListener });
}

function detachActiveRoomListeners() {
    activeRoomListeners.forEach(l => off(l.ref, 'value', l.callback));
    activeRoomListeners = [];
}

function appendBubble(sender, text, identity, customColor, triggerSound = false) {
    // If user has a custom color saved, apply it to their message text
    const colorStyle = customColor ? `style="color: ${customColor};"` : '';
    
    const html = `
        <div class="bubble-row ${identity}">
            <span class="bubble-user">${sender}</span>
            <div class="bubble-text" ${colorStyle}>${text}</div>
        </div>`;
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;

    if (identity === 'them' && triggerSound) {
        pingSound.currentTime = 0;
        pingSound.play().catch(() => {});
    }
}

// --- Outbound Processing Actions ---
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentRoomCode) return;

    await push(ref(db, `rooms/${currentRoomCode}/messages`), {
        sender: currentUsername,
        text: text,
        senderColor: currentTextColor, // Pass your profile theme color along with your text
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

messageInput.addEventListener('input', () => {
    if (!currentRoomCode) return;
    if (!typingTimeout) {
        update(ref(db, `rooms/${currentRoomCode}/typing`), { [currentUsername]: true });
    } else clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        update(ref(db, `rooms/${currentRoomCode}/typing`), { [currentUsername]: false });
        typingTimeout = null;
    }, 1500);
});

document.getElementById('copy-btn').addEventListener('click', (e) => {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        e.target.innerText = "Copied!";
        setTimeout(() => e.target.innerText = "Copy Room Code", 2000);
    });
});
