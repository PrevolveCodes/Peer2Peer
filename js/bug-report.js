const BUG_REPORT_EMAIL = 'prevolveyt@gmail.com';

function setupBugReport() {
  if (document.getElementById('bug-report-button')) return;

  const button = document.createElement('button');
  button.id = 'bug-report-button';
  button.type = 'button';
  button.className = 'bug-report-button';
  button.textContent = 'Report a bug';
  button.onclick = openBugReport;

  const target = document.querySelector('.brand');
  if (target) target.parentElement.insertBefore(button, target.nextSibling);
  else document.body.appendChild(button);
}

function openBugReport() {
  const existing = document.getElementById('bug-report-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'bug-report-modal';
  modal.className = 'modal-bg';
  modal.innerHTML = `
    <div class="modal bug-report-modal">
      <button class="x" id="bug-report-close">×</button>
      <h2>Report a bug</h2>
      <p class="muted">Tell me what went wrong. Your email app will open with the report ready to send to ${BUG_REPORT_EMAIL}.</p>
      <label>What happened?<textarea id="bug-description" placeholder="Describe the bug..." required></textarea></label>
      <label>What were you doing when it happened?<textarea id="bug-steps" placeholder="For example: I opened a group and pressed Reply..."></textarea></label>
      <label>Your email (optional)<input id="bug-contact" type="email" placeholder="you@example.com"></label>
      <div class="modal-actions">
        <button id="bug-report-cancel">Cancel</button>
        <button class="primary" id="bug-report-send">Send report</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  document.getElementById('bug-report-close').onclick = close;
  document.getElementById('bug-report-cancel').onclick = close;

  document.getElementById('bug-report-send').onclick = () => {
    const description = document.getElementById('bug-description').value.trim();
    if (!description) {
      alert('Please describe the bug first.');
      return;
    }

    const steps = document.getElementById('bug-steps').value.trim() || 'Not provided';
    const contact = document.getElementById('bug-contact').value.trim() || 'Not provided';
    const browser = navigator.userAgent;
    const page = location.href;
    const username = window.me?.displayName || 'Not available';

    const subject = encodeURIComponent(`Peer2Peer Bug Report`);
    const body = encodeURIComponent(
      `Bug description:\n${description}\n\n` +
      `What I was doing:\n${steps}\n\n` +
      `Contact email:\n${contact}\n\n` +
      `Username:\n${username}\n\n` +
      `Page:\n${page}\n\n` +
      `Browser/device info:\n${browser}`
    );

    window.location.href = `mailto:${BUG_REPORT_EMAIL}?subject=${subject}&body=${body}`;
    close();
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupBugReport);
else setupBugReport();
