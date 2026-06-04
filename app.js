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
let currentPronouns = "";
let currentAboutMe = "";
let currentBannerColor = "#5865f2";
let targetReplyUser = "";

const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23949ba4'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

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

const userDisplayPfp = document.getElementById('user-display-pfp');
const editPfpPreview = document.getElementById('edit-pfp-preview');
const editRoomIconPreview = document.getElementById('edit-room-icon-preview');

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
});

function showAlert(text) {
    alertBanner.innerText = text || "An unexpected action error occurred.";
    alertBanner.classList.remove('hidden');
    setTimeout(() => alertBanner.classList.add('hidden'), 4000);
}

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

function processFileAsync(fileInputEl) {
    return new Promise((resolve) => {
        const file = fileInputEl.files[0];
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

document.getElementById('edit-pfp-file').addEventListener('change', async function() {
    const res = await processFileAsync(this);
    if (res) editPfpPreview.src = res;
});
document.getElementById('edit-room-icon-file').addEventListener('change', async function() {
    const res = await processFileAsync(this);
    if (res) editRoomIconPreview.src = res;
});

// Settings button binding
document.getElementById('profile-nav-btn').addEventListener('click', () => {
    welcomeView.classList.add('hidden');
    roomView.classList.add('hidden');
    roomSettingsCard.classList.add('hidden');
    profileCard.classList.remove('hidden');
    
    document.getElementById('edit-username-input').value = currentUsername;
    document.getElementById('edit-status-input').value = currentStatus;
    document.getElementById('edit-color-input').value = currentTextColor;
    document.getElementById('edit-pronouns-input').value = currentPronouns;
    document.getElementById('edit-aboutme-input').value = currentAboutMe;
    document.getElementById('edit-banner-color-input').value = currentBannerColor;
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

document.getElementById('save-profile-btn').addEventListener('click', async () => {
const newName = document.getElementById('edit-username-input').value.trim();
const newStatus = document.getElementById('edit-status-input').value.trim();
const newColor = document.getElementById('edit-color-input').value;
const newPfp = editPfpPreview.src;
// New fields to capture:
const newPronouns = document.getElementById('edit-pronouns-input').value.trim();
const newAboutMe = document.getElementById('edit-aboutme-input').value.trim();
const newBanner = document.getElementById('edit-banner-color-input').value;

if (!newName) return showAlert("Username cannot be empty!");
try {
    await updateProfile(auth.currentUser, { displayName: newName });
    await update(ref(db, `users/${currentUid}/profile`), {
        username: newName,
        statusText: newStatus,
        colorAccent: newColor,
        avatarData: newPfp,
        pronouns: newPronouns,
        aboutMe: newAboutMe,
        bannerColor: newBanner
    });
    profileCard.classList.add('hidden');
    if (currentRoomCode) roomView.classList.remove('hidden');
    else welcomeView.classList.remove('hidden');
} catch (e) { showAlert(e.message); }
});

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
            currentPronouns = data.pronouns || "";
            currentAboutMe = data.aboutMe || "";
            currentBannerColor = data.bannerColor || "#5865f2";

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

function syncSidebarMenu() {
    onValue(ref(db, `users/${currentUid}/joinedRooms`), (snapshot) => {
        roomMenuList.innerHTML = '';
        const list = snapshot.val() || {};
        
        Object.keys(list).forEach(code => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `room-item ${currentRoomCode === code ? 'active' : ''}`;
            
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

function selectRoom(roomCode) {
    profileCard.classList.add('hidden');
    roomSettingsCard.classList.add('hidden');
    welcomeView.classList.add('hidden');
    roomView.classList.remove('hidden');
    cancelReply();

    if (currentRoomCode) set(ref(db, `rooms/${currentRoomCode}/typing/${currentUsername}`), null);
    detachActiveRoomListeners();
    currentRoomCode = roomCode;

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

    const messagesRef = ref(db, `rooms/${roomCode}/messages`);
    const msgListener = onValue(messagesRef, (snapshot) => {
        chatBox.innerHTML = '';
        let isFirstLoad = chatBox.children.length === 0;
        snapshot.forEach(child => {
            appendBubble(child.key, child.val(), !isFirstLoad);
        });
    });
    activeRoomListeners.push({ ref: messagesRef, callback: msgListener });

    const pinListener = onValue(ref(db, `rooms/${roomCode}/messages`), (snapshot) => {
        let count = 0;
        snapshot.forEach(child => { if (child.val().isPinned) count++; });
        document.getElementById('pin-count').innerText = count;
    });
    activeRoomListeners.push({ ref: ref(db, `rooms/${roomCode}/messages`), callback: pinListener });

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

// FORMATTED UNIFORM DISCORD MESSAGES WITH FLAT HIGH-CONTRAST SVG ASSETS
function appendBubble(msgId, data, triggerSound) {
    const identity = data.sender === currentUsername ? 'me' : 'them';
    const colorStyle = data.senderColor ? `style="color: ${data.senderColor};"` : '';
    const userAvatar = data.senderAvatar || fallbackSvg;
    const timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

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
        replyContextHtml = `<div class="reply-line-ancestor">↳ <strong>@${data.replyTo.user}</strong>: <span>${data.replyTo.snippet}</span></div>`;
    }

    let reactionsHtml = '<div class="reactions-row">';
    if (data.reactions) {
        Object.keys(data.reactions).forEach(emoji => {
            const usersObj = data.reactions[emoji] || {};
            const count = Object.keys(usersObj).length;
            const amIReacted = usersObj[currentUid] ? 'active' : '';
            if (count > 0) {
                // Vector alternatives map to maintain inline visual integrity
                let displayIcon = emoji;
                if(emoji === '👍') displayIcon = `<svg style="width:12px;height:12px;display:inline-block;" viewBox="0 0 24 24"><path fill="currentColor" d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.58C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.75 0 1.41-.41 1.76-1.03l3.57-8.34c.04-.15.07-.31.07-.47V10M1 9v12h4V9H1z"/></svg>`;
                if(emoji === '❤️') displayIcon = `<svg style="width:12px;height:12px;display:inline-block;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
                
                reactionsHtml += `<span class="react-badge ${amIReacted}" onclick="window.toggleReaction('${msgId}', '${emoji}')">${displayIcon} <span>${count}</span></span>`;
            }
        });
    }
    reactionsHtml += '</div>';

    const html = `
        <div class="bubble-row" id="row-${msgId}">
            <img class="bubble-avatar-side" src="${userAvatar}" onclick="window.inspectUserAccount('${data.senderUid}')">
            <div class="bubble-message-content">
                ${replyContextHtml}
                <div class="bubble-user-row">
                    <span class="bubble-user" onclick="window.inspectUserAccount('${data.senderUid}')">${data.sender}</span>
                    <span class="bubble-timestamp">${timeString}</span>
                </div>
                <div class="bubble-text" ${colorStyle}>${data.text}</div>
                ${mediaHtml}
                ${reactionsHtml}
                
                <div class="bubble-menu-strip">
                    <button class="strip-btn" title="Reply Message" onclick="window.triggerReplySetup('${msgId}', '${data.sender}', '${data.text.substring(0,20)}')">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M10 9V5l-7 7l7 7v-4.1c5 0 8.5 1.6 11 5.1c-1-5-4-10-11-11z"/></svg>
                    </button>
                    <button class="strip-btn" title="Thumbs Up" onclick="window.toggleReaction('${msgId}', '👍')">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.58C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.75 0 1.41-.41 1.76-1.03l3.57-8.34c.04-.15.07-.31.07-.47V10M1 9v12h4V9H1z"/></svg>
                    </button>
                    <button class="strip-btn" title="Heart" onclick="window.toggleReaction('${msgId}', '❤️')">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                    <button class="strip-btn" title="Pin Message" onclick="window.togglePinStatus('${msgId}', ${!!data.isPinned})">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                    </button>
                    ${identity === 'me' ? `
                    <button class="strip-btn" title="Edit Content" onclick="window.triggerEditMessage('${msgId}', '${data.text}')">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.000 1.000 0 0 0 0-1.41l-2.34-2.34a1.000 1.000 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>
                    </button>
                    <button class="strip-btn danger-text" title="Delete Message" onclick="window.deleteMessage('${msgId}')">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>` : ''}
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
