import { getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const app = getApps().length ? getApp() : null;
const auth = app ? getAuth(app) : null;
const db = app ? getDatabase(app) : null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar = p => p?.avatarData || p?.avatar || null;
const avatarHTML = (p, name = 'User') => avatar(p)
  ? `<img src="${esc(avatar(p))}" alt="">`
  : `<span class="people-avatar-fallback">${esc((name || 'U').trim().charAt(0).toUpperCase() || 'U')}</span>`;

function setupSidebarResize() {
  const sidebar = document.querySelector('.sidebar');
  const appRoot = document.querySelector('.app');
  if (!sidebar || !appRoot || sidebar.querySelector('.sidebar-resizer')) return;

  const resizer = document.createElement('div');
  resizer.className = 'sidebar-resizer';
  resizer.title = 'Drag to resize sidebar';
  sidebar.appendChild(resizer);

  const saved = Number(localStorage.getItem('p2p-sidebar-width'));
  if (saved >= 220 && saved <= 450) sidebar.style.width = `${saved}px`;

  let dragging = false;
  resizer.addEventListener('pointerdown', e => {
    dragging = true;
    resizer.setPointerCapture?.(e.pointerId);
    document.body.classList.add('resizing-sidebar');
    e.preventDefault();
  });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const width = Math.max(220, Math.min(450, e.clientX));
    sidebar.style.width = `${width}px`;
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('resizing-sidebar');
    localStorage.setItem('p2p-sidebar-width', parseInt(sidebar.getBoundingClientRect().width, 10));
  });
}

let peopleOpen = localStorage.getItem('p2p-people-open') === '1';
let membersUnsubscribe = null;
let currentRoomCode = null;

function ensurePeoplePanel() {
  const appRoot = document.querySelector('.app');
  if (!appRoot || $('people-panel')) return;
  const panel = document.createElement('aside');
  panel.id = 'people-panel';
  panel.className = `people-panel${peopleOpen ? '' : ' hidden'}`;
  panel.innerHTML = `<div class="people-header"><b>People</b><button id="people-close" title="Hide people">×</button></div><div id="people-list" class="people-list"><div class="muted">Select a group to see its members.</div></div>`;
  appRoot.appendChild(panel);
  $('people-close').onclick = () => setPeopleOpen(false);
}

function setPeopleOpen(open) {
  peopleOpen = open;
  localStorage.setItem('p2p-people-open', open ? '1' : '0');
  ensurePeoplePanel();
  $('people-panel')?.classList.toggle('hidden', !open);
}

function findRoomCodeByHeader() {
  const title = $('view-title')?.textContent?.trim();
  if (!title) return null;
  const roomButtons = document.querySelectorAll('[data-room]');
  for (const button of roomButtons) {
    const code = button.dataset.room;
    const label = button.querySelector('span')?.textContent?.trim() || button.textContent.trim();
    if (label === title) return code;
  }
  return null;
}

async function loadPeople(code) {
  ensurePeoplePanel();
  currentRoomCode = code;
  if (membersUnsubscribe) membersUnsubscribe();
  if (!code || !db) {
    if ($('people-list')) $('people-list').innerHTML = '<div class="muted">No group selected.</div>';
    return;
  }
  membersUnsubscribe = onValue(ref(db, `rooms/${code}/members`), snap => {
    const members = Object.values(snap.val() || {});
    renderPeople(members, code);
  });
}

async function renderPeople(members, code) {
  const list = $('people-list');
  if (!list || currentRoomCode !== code) return;
  if (!members.length) {
    list.innerHTML = '<div class="muted">No members yet.</div>';
    return;
  }

  const enriched = await Promise.all(members.map(async member => {
    if (!db || avatar(member)) return member;
    try {
      const snap = await get(ref(db, `users/${member.uid}/profile`));
      return snap.exists() ? {...member, ...snap.val()} : member;
    } catch {
      return member;
    }
  }));

  if (currentRoomCode !== code) return;
  list.innerHTML = enriched.map(member => {
    const name = member.username || member.displayName || 'User';
    const isMe = auth?.currentUser?.uid === member.uid;
    return `<button class="people-user" data-people-uid="${esc(member.uid || '')}">${avatarHTML(member, name)}<span><b>${esc(name)}</b><small>${isMe ? 'You' : esc(member.status || 'Member')}</small></span></button>`;
  }).join('');

  list.querySelectorAll('[data-people-uid]').forEach(button => {
    button.onclick = () => {
      const uid = button.dataset.peopleUid;
      if (uid && typeof window.showUserProfile === 'function') window.showUserProfile(uid);
    };
  });
}

function updatePeopleButton() {
  ensurePeoplePanel();
  const actions = $('header-actions');
  if (!actions) return;
  const leave = $('leave-room');
  let button = $('people-toggle');
  if (!leave) {
    button?.remove();
    setPeopleOpen(false);
    if (membersUnsubscribe) { membersUnsubscribe(); membersUnsubscribe = null; }
    currentRoomCode = null;
    return;
  }

  if (!button) {
    button = document.createElement('button');
    button.id = 'people-toggle';
    button.className = 'header-action people-toggle';
    button.title = 'Show or hide group members';
    button.innerHTML = 'People';
    actions.insertBefore(button, leave);
    button.onclick = () => setPeopleOpen(!peopleOpen);
  }
  button.classList.toggle('active', peopleOpen);
  const code = findRoomCodeByHeader();
  if (code !== currentRoomCode) loadPeople(code);
  $('people-panel')?.classList.toggle('hidden', !peopleOpen);
}

function start() {
  setupSidebarResize();
  ensurePeoplePanel();
  const observer = new MutationObserver(() => updatePeopleButton());
  const actions = $('header-actions');
  if (actions) observer.observe(actions, {childList:true, subtree:true});
  const roomList = $('room-list');
  if (roomList) observer.observe(roomList, {childList:true, subtree:true});
  updatePeopleButton();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
