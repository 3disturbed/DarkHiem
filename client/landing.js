const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1',
  '#e84393', '#00cec9', '#fdcb6e', '#6c5ce7',
  '#fab1a0', '#74b9ff', '#55efc4', '#ffeaa7'
];

// DOM refs
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const characterView = document.getElementById('character-view');
const messageEl = document.getElementById('message');

// Login
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const showRegisterLink = document.getElementById('show-register');

// Register
const regUsername = document.getElementById('reg-username');
const regPassword = document.getElementById('reg-password');
const regPasswordConfirm = document.getElementById('reg-password-confirm');
const registerBtn = document.getElementById('register-btn');
const showLoginLink = document.getElementById('show-login');

// Characters
const welcomeUser = document.getElementById('welcome-user');
const logoutBtn = document.getElementById('logout-btn');
const characterList = document.getElementById('character-list');
const charName = document.getElementById('char-name');
const colorPicker = document.getElementById('color-picker');
const createCharBtn = document.getElementById('create-char-btn');

let token = localStorage.getItem('darkheim_token');
let username = localStorage.getItem('darkheim_username');
let characters = [];
let selectedCharId = localStorage.getItem('darkheim_character_id');
let selectedColor = PLAYER_COLORS[0];

// --- API helpers ---

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  return res.json();
}

// --- View management ---

function showView(view) {
  loginView.classList.add('hidden');
  registerView.classList.add('hidden');
  characterView.classList.add('hidden');
  view.classList.remove('hidden');
}

function showMessage(text, type = 'error') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
  clearTimeout(showMessage._timer);
  showMessage._timer = setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 5000);
}

function hideMessage() {
  messageEl.classList.add('hidden');
}

// --- Color picker ---

function initColorPicker() {
  colorPicker.innerHTML = '';
  for (const color of PLAYER_COLORS) {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (color === selectedColor ? ' selected' : '');
    swatch.style.backgroundColor = color;
    swatch.addEventListener('click', () => {
      selectedColor = color;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    colorPicker.appendChild(swatch);
  }
}

// --- Character list rendering ---

function renderCharacters() {
  characterList.innerHTML = '';

  if (characters.length === 0) {
    characterList.innerHTML = '<div class="no-characters">No characters yet. Create one below.</div>';
    removePlayButton();
    return;
  }

  for (const char of characters) {
    const card = document.createElement('div');
    card.className = 'character-card' + (char.id === selectedCharId ? ' selected' : '');
    card.innerHTML = `
      <div class="char-avatar" style="background-color: ${char.color}"></div>
      <div class="char-info">
        <div class="char-name">${escapeHtml(char.name)}</div>
        <div class="char-meta">Created ${formatDate(char.createdAt)}</div>
      </div>
      <div class="char-actions">
        <button class="btn btn-danger delete-char-btn" data-id="${char.id}">Delete</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-char-btn')) return;
      selectedCharId = char.id;
      localStorage.setItem('darkheim_character_id', char.id);
      renderCharacters();
    });

    characterList.appendChild(card);
  }

  // Delete handlers
  characterList.querySelectorAll('.delete-char-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const charId = btn.dataset.id;
      const charObj = characters.find(c => c.id === charId);
      if (!confirm(`Delete character "${charObj?.name}"? This cannot be undone.`)) return;

      btn.disabled = true;
      const result = await api('DELETE', `/api/characters/${charId}`);
      if (result.success) {
        characters = result.characters;
        if (selectedCharId === charId) {
          selectedCharId = null;
          localStorage.removeItem('darkheim_character_id');
        }
        renderCharacters();
      } else {
        showMessage(result.error || 'Failed to delete character');
        btn.disabled = false;
      }
    });
  });

  // Play button
  if (selectedCharId) {
    ensurePlayButton();
  } else {
    removePlayButton();
  }
}

function ensurePlayButton() {
  let playBtn = document.getElementById('play-btn');
  if (!playBtn) {
    playBtn = document.createElement('button');
    playBtn.id = 'play-btn';
    playBtn.className = 'btn btn-play';
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', enterGame);
    characterView.appendChild(playBtn);
  }
}

function removePlayButton() {
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.remove();
}

// --- Auth actions ---

async function doLogin() {
  const u = loginUsername.value.trim();
  const p = loginPassword.value;
  if (!u || !p) return showMessage('Enter username and password');

  loginBtn.disabled = true;
  hideMessage();
  const result = await api('POST', '/api/login', { username: u, password: p });
  loginBtn.disabled = false;

  if (!result.success) return showMessage(result.error);

  token = result.token;
  username = result.username;
  characters = result.characters;
  localStorage.setItem('darkheim_token', token);
  localStorage.setItem('darkheim_username', username);
  showCharacterView();
}

async function doRegister() {
  const u = regUsername.value.trim();
  const p = regPassword.value;
  const pc = regPasswordConfirm.value;
  if (!u || !p) return showMessage('Enter username and password');
  if (p !== pc) return showMessage('Passwords do not match');

  registerBtn.disabled = true;
  hideMessage();
  const result = await api('POST', '/api/register', { username: u, password: p });
  registerBtn.disabled = false;

  if (!result.success) return showMessage(result.error);

  token = result.token;
  username = result.username;
  characters = result.characters;
  localStorage.setItem('darkheim_token', token);
  localStorage.setItem('darkheim_username', username);
  showMessage('Account created!', 'success');
  showCharacterView();
}

async function doCreateCharacter() {
  const name = charName.value.trim();
  if (!name) return showMessage('Enter a character name');

  createCharBtn.disabled = true;
  hideMessage();
  const result = await api('POST', '/api/characters', { name, color: selectedColor });
  createCharBtn.disabled = false;

  if (!result.success) return showMessage(result.error);

  characters = result.characters;
  selectedCharId = result.character.id;
  localStorage.setItem('darkheim_character_id', selectedCharId);
  charName.value = '';
  renderCharacters();
  showMessage(`${result.character.name} created!`, 'success');
}

function doLogout() {
  token = null;
  username = null;
  characters = [];
  selectedCharId = null;
  localStorage.removeItem('darkheim_token');
  localStorage.removeItem('darkheim_username');
  localStorage.removeItem('darkheim_character_id');
  loginUsername.value = '';
  loginPassword.value = '';
  hideMessage();
  showView(loginView);
}

function enterGame() {
  if (!token || !selectedCharId) return;
  // Store selected character info for the game client
  const char = characters.find(c => c.id === selectedCharId);
  if (char) {
    localStorage.setItem('darkheim_character_name', char.name);
    localStorage.setItem('darkheim_character_color', char.color);
  }
  window.location.href = '/game';
}

function showCharacterView() {
  welcomeUser.textContent = `Welcome, ${username}`;
  initColorPicker();
  renderCharacters();
  showView(characterView);
}

// --- Session check on load ---

async function checkSession() {
  if (!token) {
    showView(loginView);
    return;
  }

  try {
    const result = await api('GET', '/api/session');
    if (result.valid) {
      username = result.username;
      characters = result.characters;
      localStorage.setItem('darkheim_username', username);
      showCharacterView();
    } else {
      doLogout();
    }
  } catch {
    doLogout();
  }
}

// --- Utilities ---

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString();
}

// --- Event listeners ---

loginBtn.addEventListener('click', doLogin);
registerBtn.addEventListener('click', doRegister);
createCharBtn.addEventListener('click', doCreateCharacter);
logoutBtn.addEventListener('click', (e) => { e.preventDefault(); doLogout(); });
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); hideMessage(); showView(registerView); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); hideMessage(); showView(loginView); });

// Enter key on login/register forms
loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
regPasswordConfirm.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); });
charName.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCreateCharacter(); });

// Boot
checkSession();
