// Local offline authentication storage for contaHUB

const USERS_KEY = 'contahub_users_v1';
const SESSION_KEY = 'contahub_active_session_v1';

// Simple fast SHA-256 hash using Web Crypto API
async function hashPassword(password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash for older environments
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function registerUser(name, email, password) {
  const users = getStoredUsers();
  const cleanEmail = email.trim().toLowerCase();
  
  if (!name || !name.trim()) throw new Error('Nome é obrigatório.');
  if (!cleanEmail) throw new Error('E-mail é obrigatório.');
  if (!password || password.length < 4) throw new Error('A senha deve ter pelo menos 4 caracteres.');

  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  const passwordHash = await hashPassword(password);
  const isFirstUser = users.length === 0;

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    role: isFirstUser ? 'admin' : 'user',
    createdAt: new Date().toISOString()
  };

  const updatedUsers = [...users, newUser];
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

  // Return user without password hash
  const { passwordHash: _, ...safeUser } = newUser;
  setActiveSession(safeUser);
  return safeUser;
}

export async function loginUser(email, password) {
  const users = getStoredUsers();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error('Preencha o e-mail e a senha.');
  }

  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error('Usuário não encontrado. Verifique seu e-mail ou cadastre-se.');
  }

  const hash = await hashPassword(password);
  if (user.passwordHash !== hash) {
    throw new Error('Senha incorreta.');
  }

  const { passwordHash: _, ...safeUser } = user;
  setActiveSession(safeUser);
  return safeUser;
}

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(user) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}
