import { Tier, Role } from 'generated/prisma/enums';

/**
 * Maps the database Role.USER to custom role strings based on the user's Tier.
 * For non-USER roles, it returns the role as-is.
 */
export function mapRoleByTier(role: string, tier: string): string {
  if (role === Role.USER || role === 'USER') {
    switch (tier) {
      case Tier.T1:
      case 'T1':
        return 'customer';
      case Tier.T2:
      case 'T2':
        return 'businessCustomer';
      case Tier.T3:
      case 'T3':
        return 'personalizedCargo';
    }
  }
  return role;
}

/**
 * Recursively scans an object or array to find user properties containing both
 * 'role' and 'tier' fields, then maps the 'role' field accordingly.
 */
export function mapUserResponse<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => mapUserResponse(item)) as unknown as T;
  }

  const result = { ...obj } as any;

  if ('role' in result && 'tier' in result) {
    result.role = mapRoleByTier(result.role, result.tier);
  }

  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = mapUserResponse(val);
    }
  }

  return result as T;
}

/**
 * Maps user roles inside an array of objects.
 */
export function mapUsersResponse<T>(users: T[]): T[] {
  if (!users) return [];
  return users.map((user) => mapUserResponse(user));
}
