import type { Language, Role, TokenCreateInput } from "@overpass/shared";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  handle: string;
  country: string;
  language: Language;
  role: Role;
  sessionVersion: number;
  newsletterConsentAt: Date | null;
  createdAt: Date;
  stacks: string[];
};

export type NewUser = Pick<
  UserRecord,
  "email" | "passwordHash" | "handle" | "country" | "language"
>;

type Patchable = Pick<UserRecord, "country" | "language" | "handle" | "newsletterConsentAt"> & {
  stacks: string[];
};

/** Fields left undefined are not changed. */
export type UserPatch = { [Key in keyof Patchable]?: Patchable[Key] | undefined };

export type TokenRecord = {
  id: string;
  userId: string;
  name: string;
  usage: TokenCreateInput["usage"];
  createdAt: Date;
  lastUsedAt: Date | null;
};

export type NewToken = Pick<TokenRecord, "userId" | "name" | "usage"> & { tokenHash: string };

/** Storage port of the module; the service never sees SQL. */
export type AccountsRepository = {
  createUser(user: NewUser): Promise<UserRecord>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByHandle(handle: string): Promise<UserRecord | null>;
  updateUser(id: string, patch: UserPatch): Promise<UserRecord>;
  deleteUser(id: string): Promise<void>;
  /** Optionally sets a new hash and increments session_version in one statement. */
  rotateCredentials(id: string, change: { passwordHash?: string }): Promise<UserRecord>;
  revokeAllTokens(userId: string, at: Date): Promise<void>;
  createToken(token: NewToken): Promise<TokenRecord>;
  listActiveTokens(userId: string): Promise<TokenRecord[]>;
  revokeToken(userId: string, tokenId: string, at: Date): Promise<boolean>;
  findUserByActiveTokenHash(tokenHash: string, usedAt: Date): Promise<UserRecord | null>;
};

/** Raised by a repository when a unique column already holds the value. */
export class UniqueViolation extends Error {
  constructor(readonly field: "email" | "handle") {
    super(field);
    this.name = "UniqueViolation";
  }
}
