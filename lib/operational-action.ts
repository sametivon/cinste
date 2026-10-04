export type OperationalActionState = {
  ok: boolean;
  message: string;
};

export const initialOperationalActionState: OperationalActionState = { ok: false, message: '' };

export type OperationalAction = (
  previous: OperationalActionState,
  form: FormData,
) => Promise<OperationalActionState>;
