// Authentication utility functions
const TOKEN_KEY = 'pet_vaccination_token';
const USER_KEY = 'pet_vaccination_user';

export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr || userStr === 'null' || userStr === 'undefined') {
      return null;
    }
    const user = JSON.parse(userStr);
    return user || null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const removeAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
  const token = getToken();
  const user = getUser();
  return !!(token && user);
};

export const hasRole = (requiredRoles) => {
  const user = getUser();
  if (!user) return false;
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  
  return user.role === requiredRoles;
};

export const isSuperAdmin = () => {
  return hasRole('super_admin');
};

export const isBarangayOfficial = () => {
  return hasRole('barangay_official');
};

export const isPetOwner = () => {
  return hasRole('pet_owner');
};

export const getUserBarangay = () => {
  const user = getUser();
  return user ? user.assigned_barangay_id : null;
};

export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};