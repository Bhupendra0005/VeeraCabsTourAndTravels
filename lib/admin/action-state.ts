/** What every admin server action returns to its form. */
export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

export const idle: ActionState = { ok: false };
