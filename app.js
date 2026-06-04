import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, off, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Application Local State Variables
let currentUid = null;
let currentUsername = "";
let currentStatus = "";
let currentTextColor = "#ffffff";
let currentPfpData = ""; 
let currentRoomCode = null;
let isSignUpMode = true;
let typingTimeout = null;
let activeRoomListeners = [];
let replyMessageId = null; 
let targetReplyUser = "";

// Default placeholder SVG string fallback
const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23949ba4'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

// DOM Bindings
const authCard = document.getElementById('auth-card');
const appLayout = document.getElementById('app-layout');
const profileCard = document.getElementById('profile-card');
const roomSettingsCard = document.getElementById('room-settings-card');
const welcomeView = document.getElementById('welcome-view');
const roomView = document.getElementById('room-view');
const roomMenuList = document.getElementById('room-menu-list');
const alertBanner = document.getElementById('alert-banner');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');
const pingSound = document.getElementById('ping-sound');

// Interactive Settings Previews
const userDisplayPfp = document.getElementById('user-display-pfp');
const editPfpPreview = document.getElementById('edit-pfp-preview');
const editRoomIconPreview = document.getElementById('edit-room-icon-preview');

// --- Feature: Theme Toggler ---
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
});

function showAlert(text) {
    alertBanner.innerText = text || "An unexpected action error occurred.";
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
}

// Auto-Expanding Textarea Input field
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// --- File Attachment Data Encoding Pipeline ---
// Reads images instantly and returns raw string codes ready to inject directly into Firebase logs
function processFileAsync(fileInputEl) {
    return new Promise((resolve) => {
        const file = fileInputEl.files[0];
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

// Instant local previews for profile edits
document.getElementById('edit-pfp-file').addEventListener('change', async function() {
    const res = await processFileAsync(this);
    if (res) editPfpPreview.src = res;
});
document.getElementById('edit-room-icon-file').addEventListener('change', async function() {
    const res = await processFileAsync(this);
    if (res) editRoomIconPreview.src = res;
});

// --- View Panel Routing Managers ---
document.getElementById('profile-nav-btn').addEventListener('click', () => {
    welcomeView.classList.add('hidden');
    roomView.classList.add('hidden');
    roomSettingsCard.classList.add('hidden');
    profileCard.classList.remove('hidden');
    document.getElementById('edit-username-input').value = currentUsername;
    document.getElementById('edit-status-input').value = currentStatus;
    document.getElementById('edit-color-input').value = currentTextColor;
    editPfpPreview.src = currentPfpData || fallbackSvg;
});

document.getElementById('close-profile-btn').addEventListener('click', () => {
    profileCard.classList.add('hidden');
    if (currentRoomCode) roomView.classList.remove('hidden');
    else welcomeView.classList.remove('hidden');
});

document.getElementById('room-settings-btn').addEventListener('click', async () => {
    if (!currentRoomCode) return;
    welcomeView.classList.add('hidden');
    roomView.classList.add('hidden');
    profileCard.classList.add('hidden');
    roomSettingsCard.classList.remove('hidden');
    
    const snap = await get(ref(db, `rooms/${currentRoomCode}/meta`));
    const data = snap.val() || {};
    document.getElementById('edit-room-name-input').value = data.roomName || currentRoomCode;
    editRoomIconPreview.src = data.roomIcon || fallbackSvg;
});

document.getElementById('close-room-settings-btn').addEventListener('click', () => {
    roomSettingsCard.classList.add('hidden');
    roomView.classList.remove('hidden');
});

// --- Feature: Save Room Details Configuration Changes ---
document.getElementById('save-room-settings-btn').addEventListener('click', async () => {
    const targetName = document.getElementById('edit-room-name-input').value.trim();
    const targetIcon = editRoomIconPreview.src;

    if (!targetName) return showAlert("Room name cannot be empty!");
    
    await update(ref(db, `rooms/${currentRoomCode}/meta`), {
        roomName: targetName,
        roomIcon: targetIcon
    });

    roomSettingsCard.classList.add('hidden');
    roomView.classList.remove('hidden');
    document.getElementById('active-room-title').innerText = targetName;
});

// --- Feature: Save User Settings Changes ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const newName = document.getElementById('edit-username-input').value.trim();
    const newStatus = document.getElementById('edit-status-input').value.trim();
    const newColor = document.getElementById('edit-color-input').value;
    const newPfp = editPfpPreview.src;

    if (!newName) return showAlert("Username cannot be empty!");
    
    try {
        await updateProfile(auth.currentUser, { displayName: newName });
        await update(ref(db, `users/${currentUid}/profile`), {
            username: newName,
            statusText: newStatus,
            colorAccent: newColor,
            avatarData: newPfp
        });
        profileCard.classList.add('hidden');
        if (currentRoomCode) roomView.classList.remove('hidden');
        else welcomeView.classList.remove('hidden');
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
                colorAccent: "#ffffff",
                avatarData: fallbackSvg
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

        onValue(ref(db, `users/${currentUid}/profile`), (snapshot) => {
            const data = snapshot.val() || {};
            currentUsername = data.username || user.displayName || "User";
            currentStatus = data.statusText || "";
            currentTextColor = data.colorAccent || "#ffffff";
            currentPfpData = data.avatarData || fallbackSvg;

            document.getElementById('user-display-name').innerText = currentUsername;
            document.getElementById('user-custom-status').innerText = currentStatus;
            userDisplayPfp.src = currentPfpData;
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

// --- Sidebar Menu Synchronization ---
function syncSidebarMenu() {
    onValue(ref(db, `users/${currentUid}/joinedRooms`), (snapshot) => {
        roomMenuList.innerHTML = '';
        const list = snapshot.val() || {};
        
        Object.keys(list).forEach(code => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `room-item ${currentRoomCode === code ? 'active' : ''}`;
            
            // Listen real-time to specific individual channel meta parameters
            onValue(ref(db, `rooms/${code}/meta`), (metaSnap) => {
                const meta = metaSnap.val() || {};
                const nameStr = meta.roomName || code;
                
                if (meta.roomIcon) {
                    itemDiv.innerHTML = `<img class="room-item-avatar" src="${meta.roomIcon}"> <span>${nameStr}</span>`;
                } else {
                    itemDiv.innerHTML = `<span class="room-item-hashtag">#</span> <span>${nameStr}</span>`;
                }
            });

            itemDiv.onclick = () => selectRoom(code);
            roomMenuList.appendChild(itemDiv);
        });
    });
}

document.getElementById('create-room-btn').addEventListener('click', async () => {
    const pass = document.getElementById('sidebar-room-pass').value.trim();
    if (!pass) return showAlert("Please set a room password!");
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await set(ref(db, `rooms/${roomCode}/meta`), { password: pass, roomName: `Room-${roomCode}`, roomIcon: "" });
    await set(ref(db, `users/${currentUid}/joinedRooms/${roomCode}`), true);
    selectRoom(roomCode);
});

document.getElementById('join-room-btn').addEventListener('click', async () => {
    const code = document.getElementById('sidebar-room-code').value.trim().toUpperCase();
    const pass = document.getElementById('sidebar-room-pass').value.trim();
    if (!code || !pass) return showAlert("Enter Code and Password!");

    const snap = await get(ref(db, `rooms/${code}/meta/password`));
    if (snap.exists() && snap.val() === pass) {
        await set(ref(db, `users/${currentUid}/joinedRooms/${code}`), true);
        selectRoom(code);
    } else { showAlert("Invalid Code or Password!"); }
});

document.getElementById('remove-room-btn').addEventListener('click', async () => {
    if (!currentRoomCode) return;
    await set(ref(db, `users/${currentUid}/joinedRooms/${currentRoomCode}`), null);
    welcomeView.classList.remove('hidden');
    roomView.classList.add('hidden');
    detachActiveRoomListeners();
    currentRoomCode = null;
});

// --- Active Selected Room Lifecycle ---
function selectRoom(roomCode) {
    profileCard.classList.add('hidden');
    roomSettingsCard.classList.add('hidden');
    welcomeView.classList.add('hidden');
    roomView.classList.remove('hidden');
    cancelReply();

    if (currentRoomCode) set(ref(db, `rooms/${currentRoomCode}/typing/${currentUsername}`), null);
    detachActiveRoomListeners();
    currentRoomCode = roomCode;

    // Stream Active Header Metadata
    onValue(ref(db, `rooms/${roomCode}/meta`), (snap) => {
        const meta = snap.val() || {};
        document.getElementById('active-room-title').innerText = meta.roomName || roomCode;
        if (meta.roomIcon) {
            document.getElementById('active-room-avatar').src = meta.roomIcon;
            document.getElementById('active-room-avatar').classList.remove('hidden');
            document.getElementById('active-room-hashtag').classList.add('hidden');
        } else {
            document.getElementById('active-room-avatar').classList.add('hidden');
            document.getElementById('active-room-hashtag').classList.remove('hidden');
        }
    });

    // Stream live message feeds
    const messagesRef = ref(db, `rooms/${roomCode}/messages`);
    const msgListener = onValue(messagesRef, (snapshot) => {
        chatBox.innerHTML = '';
        let isFirstLoad = chatBox.children.length === 0;
        snapshot.forEach(child => {
            appendBubble(child.key, child.val(), !isFirstLoad);
        });
    });
    activeRoomListeners.push({ ref: messagesRef, callback: msgListener });

    // Stream pin counters
    const pinListener = onValue(ref(db, `rooms/${roomCode}/messages`), (snapshot) => {
        let count = 0;
        snapshot.forEach(child => { if (child.val().isPinned) count++; });
        document.getElementById('pin-count').innerText = count;
    });
    activeRoomListeners.push({ ref: ref(db, `rooms/${roomCode}/messages`), callback: pinListener });

    // Stream real-time typing indicators
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

// --- Feature: Message Rendering (Reactions, Edit/Delete Menu, Replies, Avatar clicks) ---
function appendBubble(msgId, data, triggerSound) {
    const identity = data.sender === currentUsername ? 'me' : 'them';
    const colorStyle = data.senderColor ? `style="color: ${data.senderColor};"` : '';
    const userAvatar = data.senderAvatar || fallbackSvg;

    let mediaHtml = '';
    if (data.media) {
        if (data.media.startsWith('data:image')) {
            mediaHtml = `<img class="chat-image-payload" src="${data.media}" alt="uploaded image">`;
        } else if (data.media.startsWith('data:video')) {
            mediaHtml = `<video class="chat-media-player" src="${data.media}" controls></video>`;
        } else if (data.media.startsWith('data:audio')) {
            mediaHtml = `<audio class="chat-media-player" src="${data.media}" controls></audio>`;
        }
    }

    let replyContextHtml = '';
    if (data.replyTo) {
        replyContextHtml = `<div class="reply-line-ancestor">↳ Replying to @${data.replyTo.user}: "${data.replyTo.snippet}"</div>`;
    }

    let reactionsHtml = '<div class="reactions-row">';
    if (data.reactions) {
        Object.keys(data.reactions).forEach(emoji => {
            const usersObj = data.reactions[emoji] || {};
            const count = Object.keys(usersObj).length;
            const amIReacted = usersObj[currentUid] ? 'active' : '';
            if (count > 0) {
                reactionsHtml += `<span class="react-badge ${amIReacted}" onclick="window.toggleReaction('${msgId}', '${emoji}')">${emoji} <span>${count}</span></span>`;
            }
        });
    }
    reactionsHtml += '</div>';

    // Interactive custom HTML string inject
    const html = `
        <div class="bubble-row ${identity}" id="row-${msgId}">
            ${replyContextHtml}
            <div class="bubble-user-row" onclick="window.inspectUserAccount('${data.senderUid}')">
                <img class="bubble-avatar" src="${userAvatar}">
                <span class="bubble-user">${data.sender}</span>
            </div>
            <div class="bubble-text" ${colorStyle}>
                <div>${data.text}</div>
                ${mediaHtml}
                ${reactionsHtml}
                <div class="bubble-menu-strip">
                    <button class="strip-btn" onclick="window.triggerReplySetup('${msgId}', '${data.sender}', '${data.text.substring(0,20)}')">Reply</button>
                    <button class="strip-btn" onclick="window.toggleReaction('${msgId}', '👍')">👍</button>
                    <button class="strip-btn" onclick="window.toggleReaction('${msgId}', '❤️')">❤️</button>
                    <button class="strip-btn" onclick="window.togglePinStatus('${msgId}', ${!!data.isPinned})">📌</button>
                    ${identity === 'me' ? `<button class="strip-btn" onclick="window.triggerEditMessage('${msgId}', '${data.text}')">Edit</button>` : ''}
                    ${identity === 'me' ? `<button class="strip-btn danger-text" onclick="window.deleteMessage('${msgId}')">Delete</button>` : ''}
                </div>
            </div>
        </div>`;
        
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;

    if (identity === 'them' && triggerSound) {
        pingSound.currentTime = 0;
        pingSound.play().catch(() => {});
    }
}

// --- Global Window Handler Mappings ---
window.inspectUserAccount = async function(userId) {
    if (!userId) return;
    const snap = await get(ref(db, `users/${userId}/profile`));
    if (!snap.exists()) return;
    const profile = snap.val();
    document.getElementById('inspect-username').innerText = profile.username || "Unknown Profile";
    document.getElementById('inspect-status').innerText = profile.statusText || "No status message set.";
    document.getElementById('inspect-pfp').src = profile.avatarData || fallbackSvg;
    document.getElementById('user-inspect-modal').classList.remove('hidden');
};
document.getElementById('close-inspect-btn').addEventListener('click', () => {
    document.getElementById('user-inspect-modal').classList.add('hidden');
});

window.triggerReplySetup = function(msgId, senderName, textSnippet) {
    replyMessageId = msgId;
    targetReplyUser = senderName;
    document.getElementById('reply-context-text').innerText = `Replying to @${senderName}: "${textSnippet}..."`;
    document.getElementById('reply-context-bar').classList.remove('hidden');
    messageInput.focus();
};

function cancelReply() {
    replyMessageId = null;
    targetReplyUser = "";
    document.getElementById('reply-context-bar').classList.add('hidden');
}
document.getElementById('cancel-reply-btn').addEventListener('click', cancelReply);

window.toggleReaction = async function(msgId, emoji) {
    const rRef = ref(db, `rooms/${currentRoomCode}/messages/${msgId}/reactions/${emoji}/${currentUid}`);
    const snap = await get(rRef);
    if (snap.exists()) { await set(rRef, null); } 
    else { await set(rRef, true); }
};

window.togglePinStatus = async function(msgId, isCurrentPinned) {
    await update(ref(db, `rooms/${currentRoomCode}/messages/${msgId}`), { isPinned: !isCurrentPinned });
};

window.triggerEditMessage = function(msgId, oldText) {
    const textPrompt = prompt("Edit your message text content:", oldText);
    if (textPrompt !== null && textPrompt.trim() !== "") {
        update(ref(db, `rooms/${currentRoomCode}/messages/${msgId}`), { text: textPrompt.trim() + " (edited)" });
    }
};

window.deleteMessage = function(msgId) {
    if (confirm("Are you sure you want to permanently delete this message?")) {
        set(ref(db, `rooms/${currentRoomCode}/messages/${msgId}`), null);
    }
};

// --- Feature: Pins Drawer View Engine ---
document.getElementById('view-pins-btn').addEventListener('click', async () => {
    const drawer = document.getElementById('pins-drawer');
    drawer.classList.toggle('hidden');
    if (drawer.classList.contains('hidden')) return;

    const listContainer = document.getElementById('pins-list-box');
    listContainer.innerHTML = '';
    
    const snap = await get(ref(db, `rooms/${currentRoomCode}/messages`));
    snap.forEach(child => {
        const d = child.val();
        if (d.isPinned) {
            listContainer.innerHTML += `
                <div class="pinned-item-row">
                    <div><strong>@${d.sender}:</strong> ${d.text}</div>
                    <button class="btn-text-close" onclick="window.togglePinStatus('${child.key}', true)">Unpin</button>
                </div>`;
        }
    });
    if (!listContainer.children.length) listContainer.innerHTML = '<p style="font-size:0.8rem;color:grey;">No pinned messages found.</p>';
});

// --- Outbound Message Processing & Dispatch Pipeline ---
document.getElementById('media-attach-btn').addEventListener('click', () => document.getElementById('hidden-media-input').click());

async function sendMessage() {
    const text = messageInput.value.trim();
    const mediaInput = document.getElementById('hidden-media-input');
    const encodedMediaString = await processFileAsync(mediaInput);

    if (!text && !encodedMediaString || !currentRoomCode) return;

    let outboundPayload = {
        sender: currentUsername,
        senderUid: currentUid,
        senderColor: currentTextColor,
        senderAvatar: currentPfpData,
        text: text,
        media: encodedMediaString,
        timestamp: Date.now(),
        isPinned: false
    };

    if (replyMessageId) {
        outboundPayload.replyTo = {
            messageId: replyMessageId,
            user: targetReplyUser,
            snippet: document.getElementById('reply-context-text').innerText.split('"')[1] || ""
        };
    }

    await push(ref(db, `rooms/${currentRoomCode}/messages`), outboundPayload);

    messageInput.value = '';
    mediaInput.value = '';
    messageInput.style.height = 'auto';
    cancelReply();
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
