// AUTH.JS - Complete Authentication System for Taboost
// Handles login, signup, and password storage

console.log('🔐 AUTH SYSTEM: Loading...');

// ============================================
// CONFIGURATION
// ============================================
const AUTH_CONFIG = {
    // GitHub raw URL for shared passwords (syncs across devices)
    githubPasswordsUrl: 'https://raw.githubusercontent.com/ceyre-boop/TABOOST_Platfrom/main/data/passwords.json',
    
    // Admin credentials
    adminEmail: 'marco@taboost.me',
    adminPassword: 'admin',
    
    // Local storage keys
    storageKeys: {
        user: 'taboost_user',
        passwords: 'taboost_passwords_v2',
        signupLog: 'taboost_signup_log'
    }
};

// ============================================
// PASSWORD STORAGE (Multi-source)
// ============================================
class PasswordStore {
    constructor() {
        this.githubPasswords = {};
        this.localPasswords = this.loadLocalPasswords();
        this.loaded = false;
    }
    
    // Load from localStorage
    loadLocalPasswords() {
        try {
            const stored = localStorage.getItem(AUTH_CONFIG.storageKeys.passwords);
            const passwords = stored ? JSON.parse(stored) : {};
            console.log('🔐 Loaded local passwords:', Object.keys(passwords));
            return passwords;
        } catch (e) {
            console.error('Error loading local passwords:', e);
            return {};
        }
    }
    
    // Save to localStorage
    saveLocalPasswords() {
        try {
            localStorage.setItem(AUTH_CONFIG.storageKeys.passwords, JSON.stringify(this.localPasswords));
            console.log('💾 Saved passwords to localStorage');
        } catch (e) {
            console.error('Error saving passwords:', e);
        }
    }
    
    // Load from GitHub (for cross-device sync)
    async loadFromGitHub() {
        try {
            console.log('🌐 Fetching passwords from GitHub...');
            const response = await fetch(AUTH_CONFIG.githubPasswordsUrl + '?t=' + Date.now());
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            this.githubPasswords = data.creators || {};
            console.log('✅ GitHub passwords loaded:', Object.keys(this.githubPasswords).length, 'users');
            this.loaded = true;
            return true;
        } catch (e) {
            console.error('❌ Failed to load GitHub passwords:', e);
            this.githubPasswords = {};
            this.loaded = true;
            return false;
        }
    }
    
    // Get password for user (checks all sources)
    getPassword(username) {
        const key = username.toLowerCase().replace(/^@/, '');
        
        // 1. Check GitHub (highest priority - set by Marco)
        if (this.githubPasswords[key]) {
            console.log('🔑 Found password in GitHub for:', key);
            return { password: this.githubPasswords[key], source: 'github' };
        }
        
        // 2. Check localStorage (user created on this device)
        if (this.localPasswords[key]) {
            console.log('🔑 Found password in localStorage for:', key);
            return { password: this.localPasswords[key], source: 'local' };
        }
        
        console.log('❌ No password found for:', key);
        return null;
    }
    
    // Set password (saves to localStorage)
    setPassword(username, password) {
        const key = username.toLowerCase().replace(/^@/, '');
        this.localPasswords[key] = password;
        this.saveLocalPasswords();
        console.log('✅ Password set for:', key);
        return true;
    }
    
    // Get all usernames with passwords
    getAllUsernames() {
        const github = Object.keys(this.githubPasswords);
        const local = Object.keys(this.localPasswords);
        return [...new Set([...github, ...local])];
    }
}

// ============================================
// AUTH MANAGER
// ============================================
class AuthManager {
    constructor() {
        this.passwordStore = new PasswordStore();
        this.currentUser = null;
    }
    
    // Initialize - load passwords
    async init() {
        console.log('🔐 AUTH: Initializing...');
        await this.passwordStore.loadFromGitHub();
        this.currentUser = this.getCurrentUser();
        console.log('🔐 AUTH: Ready. Current user:', this.currentUser?.username || 'none');
    }
    
    // Get current logged-in user
    getCurrentUser() {
        try {
            const user = localStorage.getItem(AUTH_CONFIG.storageKeys.user);
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    }
    
    // Set current user
    setCurrentUser(userData) {
        this.currentUser = userData;
        localStorage.setItem(AUTH_CONFIG.storageKeys.user, JSON.stringify(userData));
    }
    
    // Clear current user (logout)
    logout() {
        this.currentUser = null;
        localStorage.removeItem(AUTH_CONFIG.storageKeys.user);
    }
    
    // LOGIN
    async login(username, password) {
        console.log('🔐 LOGIN attempt:', username);
        
        // Normalize username
        const cleanUsername = username.toLowerCase().replace(/^@/, '');
        
        // Admin login
        if (cleanUsername === AUTH_CONFIG.adminEmail && password === AUTH_CONFIG.adminPassword) {
            this.setCurrentUser({
                username: AUTH_CONFIG.adminEmail,
                role: 'admin',
                name: 'Marco',
                avatar: 'M'
            });
            return { success: true, role: 'admin', redirect: 'dashboard.html' };
        }
        
        // Reload passwords (in case they were updated)
        await this.passwordStore.loadFromGitHub();
        
        // Find password
        const passData = this.passwordStore.getPassword(cleanUsername);
        
        if (!passData) {
            console.log('❌ LOGIN FAILED: User not found:', cleanUsername);
            return { 
                success: false, 
                error: 'ACCOUNT_NOT_FOUND',
                message: 'Account not found. Please sign up first.'
            };
        }
        
        // Check password
        if (password !== passData.password) {
            console.log('❌ LOGIN FAILED: Wrong password for:', cleanUsername);
            return { 
                success: false, 
                error: 'WRONG_PASSWORD',
                message: 'Invalid password. Please try again.'
            };
        }
        
        // SUCCESS!
        console.log('✅ LOGIN SUCCESS:', cleanUsername);
        this.setCurrentUser({
            username: cleanUsername,
            role: 'creator',
            name: cleanUsername,
            avatar: cleanUsername.charAt(0).toUpperCase()
        });
        
        return { 
            success: true, 
            role: 'creator', 
            redirect: 'creator-dashboard.html' 
        };
    }
    
    // SIGNUP
    signup(username, email, password) {
        console.log('🔐 SIGNUP attempt:', username, email);
        
        // Normalize
        const cleanUsername = username.toLowerCase().replace(/^@/, '');
        
        // Check if username already has password
        const existing = this.passwordStore.getPassword(cleanUsername);
        if (existing) {
            return {
                success: false,
                error: 'USER_EXISTS',
                message: 'This username already has an account. Please log in.'
            };
        }
        
        // Save password
        this.passwordStore.setPassword(cleanUsername, password);
        
        // Set as current user
        this.setCurrentUser({
            username: cleanUsername,
            email: email,
            role: 'creator',
            name: cleanUsername,
            avatar: cleanUsername.charAt(0).toUpperCase(),
            isNewUser: true
        });
        
        // Log signup
        this.logSignup(cleanUsername, email);
        
        console.log('✅ SIGNUP SUCCESS:', cleanUsername);
        return {
            success: true,
            redirect: 'creator-dashboard.html'
        };
    }
    
    // Log signup
    logSignup(username, email) {
        try {
            const log = JSON.parse(localStorage.getItem(AUTH_CONFIG.storageKeys.signupLog) || '[]');
            log.push({
                username,
                email,
                timestamp: new Date().toISOString(),
                device: navigator.userAgent
            });
            localStorage.setItem(AUTH_CONFIG.storageKeys.signupLog, JSON.stringify(log));
        } catch (e) {
            console.error('Error logging signup:', e);
        }
    }
    
    // Check if logged in
    isLoggedIn() {
        return !!this.currentUser;
    }
    
    // Require auth (for protected pages)
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================
const auth = new AuthManager();

// Auto-init on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        auth.init();
    });
}

console.log('🔐 AUTH SYSTEM: Loaded successfully');