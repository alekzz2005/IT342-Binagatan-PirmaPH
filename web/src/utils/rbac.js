export const USER_ROLES = {
  RESIDENT: 'RESIDENT',
  OFFICER: 'OFFICER',
  BARANGAY_ADMIN: 'BARANGAY_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const USER_STATUS = {
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

export function getDashboardPathByRole(role) {
  return ROLE_TO_DASHBOARD_PATH[role] || '/dashboard/resident';
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