import type { AdminAccount, Me } from "@overpass/shared";

/** The API refuses oneself and other admins; the buttons are absent rather than refused. */
const manageable = (me: Me, account: AdminAccount): boolean =>
  me.role === "admin" && account.role !== "admin" && account.id !== me.id;

export const canSuspend = (me: Me, account: AdminAccount): boolean =>
  manageable(me, account) && account.suspendedAt === null;

export const canReactivate = (me: Me, account: AdminAccount): boolean =>
  manageable(me, account) && account.suspendedAt !== null;
