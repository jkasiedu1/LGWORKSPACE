import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { resolveRoleAccess } from '../config/accessControl';

/**
 * Custom hook for managing authentication state
 * Handles Firebase auth lifecycle, custom claims resolution, and role mapping
 * @returns {Object} Auth context: { user, loading, error, role (role name), hasRole (check function), logout }
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleAccess, setRoleAccess] = useState({ isSeniorPastor: false, isAdmin: false, appAccess: [] });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          if (currentUser) {
            // Force-refresh the token so custom claims set via the worker
            // are always reflected immediately after sign-in.
            try {
              const tokenResult = await currentUser.getIdTokenResult(true);
              const claims = tokenResult.claims;
              const rolesFromClaims = resolveRoleAccess(currentUser.email, claims);
              setRoleAccess(rolesFromClaims);
            } catch (claimsError) {
              console.warn('[useAuth] Failed to fetch custom claims. Defaulting to least-privilege access:', claimsError);
            setRoleAccess({ isSeniorPastor: false, isAdmin: false, appAccess: [] });
            }
            setUser(currentUser);
            // Register/refresh this user's profile so others can DM them
            if (db) {
              const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
              setDoc(doc(db, 'userProfiles', currentUser.uid), {
                uid: currentUser.uid,
                displayName: name,
                email: currentUser.email || '',
                lastSeen: serverTimestamp(),
              }, { merge: true }).catch(() => {});
            }
          } else {
            setUser(null);
            setRoleAccess({ isSeniorPastor: false, isAdmin: false, appAccess: [] });
          }
          setError(null);
        } catch (err) {
          console.error('[useAuth] Error during auth state change:', err);
          setError(err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('[useAuth] Auth error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Helper: check if user has a specific role
   */
  const hasRole = (roleName) => {
    if (!user) return false;
    const roleKey = `is${roleName.charAt(0).toUpperCase()}${roleName.slice(1).toLowerCase()}`;
    return roleAccess[roleKey] === true;
  };

  /**
   * Helper: check if user can access a specific app by ID.
   * Admins and senior pastors have access to everything.
   * App-scoped users only have access to their assigned apps.
   */
  const canAccess = (appId) => {
    if (!user) return false;
    if (roleAccess.isAdmin || roleAccess.isSeniorPastor) return true;
    return Array.isArray(roleAccess.appAccess) && roleAccess.appAccess.includes(appId);
  };

  /**
   * Get the primary role name (admin > seniorPastor > appAccess > member)
   */
  const getRole = () => {
    if (roleAccess.isAdmin) return 'admin';
    if (roleAccess.isSeniorPastor) return 'seniorPastor';
    if (roleAccess.appAccess?.length > 0) return 'appAccess';
    return 'member';
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRoleAccess({ isSeniorPastor: false, isAdmin: false, appAccess: [] });
    } catch (err) {
      console.error('[useAuth] Logout failed:', err);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    role: getRole(),
    roleAccess,
    hasRole,
    canAccess,
    isAuthenticated: !!user,
    logout
  };
}
