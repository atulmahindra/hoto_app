export const getStringValue = (
  source: Record<string, unknown>,
  keys: string[]
): string => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return "";
};

export const getRoleId = (user: Record<string, unknown> | null): string => {
  if (!user) return "";

  const userDetails =
    user.user_details && typeof user.user_details === "object"
      ? (user.user_details as Record<string, unknown>)
      : {};
  const nestedUser =
    user.user && typeof user.user === "object"
      ? (user.user as Record<string, unknown>)
      : {};

  return getStringValue({ ...nestedUser, ...userDetails, ...user }, [
    "role_id",
    "roleId",
  ]);
};

// Where a user should land after login, based on their role
export const getDefaultRoute = (user: Record<string, unknown> | null): string => {
  const roleId = getRoleId(user);
  if (roleId === "7") return "/dashboard/cash-receipt";
  if (roleId === "5") return "/dashboard/driver-self-audit";
  return "/dashboard";
};
