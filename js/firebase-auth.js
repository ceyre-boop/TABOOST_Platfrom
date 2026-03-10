// Firebase Configuration for TABOOST Platform
// Replace these values with your Firebase project settings

const firebaseConfig = {
    apiKey: "AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE",
    authDomain: "taboost-platform.firebaseapp.com",
    projectId: "taboost-platform",
    storageBucket: "taboost-platform.firebasestorage.app",
    messagingSenderId: "379293685859",
    appId: "1:379293685859:web:d89592adbf67360b574056"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth reference
const auth = firebase.auth();
const db = firebase.firestore();

// User roles collection
const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CREATOR: 'creator'
};

// Firebase Auth Helper Functions

/**
 * Sign in with email and password
 * Returns user data with role
 */
async function signInWithEmail(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user role from Firestore (with fallback)
        let userData = null;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            userData = userDoc.data();
        } catch (dbError) {
            console.warn('Could not read from Firestore, using Auth data:', dbError);
        }
        
        // Determine role from Firestore or default to creator
        let role = userData?.role || ROLES.CREATOR;
        
        // Admin email check (hardcoded for now until Firestore is fully set up)
        if (email.toLowerCase() === 'marco@taboost.me') {
            role = ROLES.ADMIN;
        }
        
        return {
            uid: user.uid,
            email: user.email,
            role: role,
            name: userData?.name || user.displayName || user.email.split('@')[0],
            username: userData?.username || user.displayName || null,
            manager: userData?.manager || null,
            loginTime: Date.now()
        };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Sign up new creator
 */
async function signUpCreator(email, password, username, managerEmail = null) {
    try {
        // Check if username is in approved roster (skip if Firestore not ready)
        let rosterData = null;
        try {
            const rosterDoc = await db.collection('roster').doc(username.toLowerCase()).get();
            if (!rosterDoc.exists) {
                throw new Error('Username not found in Taboost roster. Contact your manager.');
            }
            rosterData = rosterDoc.data();
        } catch (rosterError) {
            console.warn('Roster check failed, allowing signup anyway:', rosterError);
            // During setup, allow signups even if roster check fails
        }
        
        // Create auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Set display name
        await user.updateProfile({ displayName: username });
        
        // Store user data in Firestore
        try {
            await db.collection('users').doc(user.uid).set({
                email: email,
                username: username.toLowerCase(),
                role: ROLES.CREATOR,
                name: username,
                manager: managerEmail,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (dbError) {
            console.warn('Could not write to Firestore (permissions), continuing with auth:', dbError);
            // Continue - user is created in Auth even if Firestore fails
        }
        
        // Log signup (best effort)
        try {
            await db.collection('signups').add({
                username: username.toLowerCase(),
                email: email,
                uid: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent.substring(0, 100)
            });
        } catch (logError) {
            console.warn('Could not log signup:', logError);
        }
        
        return {
            uid: user.uid,
            email: email,
            role: ROLES.CREATOR,
            name: username,
            username: username.toLowerCase()
        };
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
}

/**
 * Sign out
 */
async function signOut() {
    try {
        await auth.signOut();
        localStorage.removeItem('taboost_user');
        localStorage.removeItem('taboost_current_user');
        return true;
    } catch (error) {
        console.error('Signout error:', error);
        throw error;
    }
}

/**
 * Get current user with role
 */
async function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            
            if (user) {
                // Get user data from Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                
                resolve({
                    uid: user.uid,
                    email: user.email,
                    role: userData?.role || ROLES.CREATOR,
                    name: userData?.name || user.displayName,
                    username: userData?.username || null,
                    manager: userData?.manager || null
                });
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Check if user is authenticated and has required role
 */
async function requireAuth(requiredRole = null) {
    const user = await getCurrentUser();
    
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        // Redirect based on actual role
        if (user.role === ROLES.ADMIN) {
            window.location.href = 'dashboard.html';
        } else if (user.role === ROLES.MANAGER) {
            window.location.href = 'manager-dashboard.html';
        } else {
            window.location.href = 'creator-dashboard.html';
        }
        return null;
    }
    
    return user;
}

/**
 * Password reset
 */
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return true;
    } catch (error) {
        console.error('Password reset error:', error);
        throw error;
    }
}

/**
 * Admin: Create new user (admin, manager, or creator)
 */
async function adminCreateUser(email, password, role, name, username = null) {
    // Check current user is admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== ROLES.ADMIN) {
        throw new Error('Admin access required');
    }
    
    try {
        // Create user with Admin SDK (requires Cloud Function)
        // For now, use client-side creation with special admin function
        const response = await fetch('https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/createUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role, name, username })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create user');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Create user error:', error);
        throw error;
    }
}

// Export for use in other files
window.FirebaseAuth = {
    signIn: signInWithEmail,
    signUp: signUpCreator,
    signOut: signOut,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    resetPassword: resetPassword,
    adminCreateUser: adminCreateUser,
    ROLES: ROLES,
    auth: auth,
    db: db
};
