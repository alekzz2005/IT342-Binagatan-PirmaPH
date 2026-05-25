export const USER_ROLES = {
  RESIDENT: 'RESIDENT',
  OFFICER: 'OFFICER',
  BARANGAY_ADMIN: 'BARANGAY_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const USER_STATUS = {
  INCOMPLETE_PROFILE: 'INCOMPLETE_PROFILE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
};

const ROLE_TO_DASHBOARD_PATH = {
  [USER_ROLES.RESIDENT]: '/dashboard/resident',
  [USER_ROLES.OFFICER]: '/dashboard/officer',
  [USER_ROLES.BARANGAY_ADMIN]: '/dashboard/barangay-admin',
  [USER_ROLES.SUPER_ADMIN]: '/dashboard/super-admin',
};

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return USER_ROLES.RESIDENT;
  }

  const normalized = role.toUpperCase().replace(/^ROLE_/, '');

  if (Object.values(USER_ROLES).includes(normalized)) {
    return normalized;
  }

  return USER_ROLES.RESIDENT;
}

export function getDashboardPathByRole(role) {
  return ROLE_TO_DASHBOARD_PATH[normalizeRole(role)] || '/dashboard/resident';
}

export function getLandingPathForUser(user) {
  if (!user) {
    return '/';
  }

  if (user.status === USER_STATUS.INCOMPLETE_PROFILE) {
    return '/complete-profile';
  }

  const normalizedRole = normalizeRole(user.role);

  if (normalizedRole === USER_ROLES.RESIDENT && (user.status === USER_STATUS.PENDING_VERIFICATION || user.status === USER_STATUS.REJECTED)) {
    return '/dashboard/pending';
  }

  return getDashboardPathByRole(normalizedRole);
}

export function isApprovedUser(user) {
  return user?.status === USER_STATUS.APPROVED;
}

export function normalizeRolePathSegment(role) {
  switch (role) {
    case USER_ROLES.OFFICER:
      return 'officer';
    case USER_ROLES.BARANGAY_ADMIN:
      return 'barangay-admin';
    case USER_ROLES.SUPER_ADMIN:
      return 'super-admin';
    case USER_ROLES.RESIDENT:
    default:
      return 'resident';
  }
}