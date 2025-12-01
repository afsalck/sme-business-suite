import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth } from "../config/firebase";
import apiClient from "../services/apiClient";

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define refreshRole function first so it can be used in useEffect
  const refreshRole = useCallback(async () => {
    if (!user) return;
    
    try {
      // Force token refresh to ensure we have a valid token
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      await currentUser.getIdToken(true); // Force refresh
      
      // Get updated role from backend
      const { data } = await apiClient.get("/auth/me");
      
      if (data?.user?.role) {
        setUser(prevUser => ({
          ...prevUser,
          role: data.user.role
        }));
        console.log(`✅ Role refreshed: ${data.user.role}`);
      }
    } catch (err) {
      console.error("Failed to refresh role:", err.message);
    }
  }, [user]);

  // Separate effect for auto-refresh listeners (only depends on refreshRole)
  useEffect(() => {
    if (!user) return;

    // Auto-refresh role when page becomes visible (user might have changed role in SQL)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshRole();
      }
    };

    // Auto-refresh role when window regains focus
    const handleFocus = () => {
      if (user) {
        refreshRole();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refreshRole]);

  // Main auth state listener (should only run once on mount)
  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmount
    let isMounted = true;
    let hasInitialized = false;

    // Set up listener for auth state changes
    // onAuthStateChanged fires immediately with current user (or null)
    // This is how we detect when auth is ready in Firebase v10
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Prevent state updates if component unmounted
      if (!isMounted) return;

      if (firebaseUser) {
        try {
          // Get token to ensure it's ready (with timeout to prevent hanging)
          const tokenPromise = firebaseUser.getIdToken(true);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Token timeout")), 5000)
          );
          
          await Promise.race([tokenPromise, timeoutPromise]);
          
          // Set user immediately with default role (don't wait for API)
          // This ensures redirect happens quickly
          if (isMounted) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: "staff" // Default, will be updated by API call below
            });
          }
          
          // Try to get user role from backend (non-blocking, in background)
          // This updates the role after redirect if successful
          apiClient.get("/auth/me")
            .then(({ data }) => {
              if (isMounted && data?.user?.role) {
                setUser(prevUser => ({
                  ...prevUser,
                  role: data.user.role
                }));
                console.log(`✅ User role loaded: ${data.user.role}`);
              }
            })
            .catch((err) => {
              // If API call fails, user already has default role - that's fine
              console.warn("Failed to load user role from backend, using default:", err.message);
            });
        } catch (tokenError) {
          console.error("Failed to get token:", tokenError);
          // Even if token fails, set user so redirect can happen
          // The ProtectedRoute will handle auth errors
          if (isMounted) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: "staff"
            });
          }
        }
      } else {
        // No user logged in
        if (isMounted) {
          setUser(null);
        }
      }

      // Set loading to false after first auth state check
      // This happens immediately when onAuthStateChanged fires
      if (isMounted && !hasInitialized) {
        hasInitialized = true;
        setLoading(false);
      } else if (isMounted) {
        // For subsequent changes, loading should already be false
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const loginWithEmail = async (email, password) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      loading,
      error,
      loginWithEmail,
      loginWithGoogle,
      logout,
      refreshRole
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}

