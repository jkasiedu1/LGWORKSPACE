import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
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
  const [roleAccess, setRoleAccess] = useState({ isSeniorPastor: false, isAdmin: false });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          if (currentUser) {
            // Attempt to load custom claims for RBAC
            try {
              const tokenResult = await currentUser.getIdTokenResult();
              const claims = tokenResult.claims;
              const rolesFromClaims = resolveRoleAccess(currentUser.email, claims);
              setRoleAccess(rolesFromClaims);
            } catch (claimsError) {
              console.warn('[useAuth] Failed to fetch custom claims, falling back to email-based roles:', claimsError);
              // Fall back to email-based role resolution
              const rolesFromEmail = resolveRoleAccess(currentUser.email, {});
              setRoleAccess(rolesFromEmail);
            }
            setUser(currentUser);
          } else {
            setUser(null);
            setRoleAccess({ isSeniorPastor: false, isAdmin: false });
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
   * Get the primary role name (admin > seniorPastor > member)
   */
  const getRole = () => {
    if (roleAccess.isAdmin) return 'admin';
    if (roleAccess.isSeniorPastor) return 'seniorPastor';
    return 'member';
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRoleAccess({ isSeniorPastor: false, isAdmin: false });
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
    isAuthenticated: !!user,
    logout
  };
}
