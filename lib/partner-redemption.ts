export type PartnerInspection = {
  state: string | null;
  offer_name: string | null;
  partner_name: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
};

export type RedemptionPresentation = {
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  title: string;
  description: string;
  canConfirm: boolean;
  isSuccess: boolean;
};

const presentations: Record<string, RedemptionPresentation> = {
  VALID: { tone: 'success', title: 'Gata de răscumpărare', description: 'Confirmă doar după ce experiența a fost oferită studentului.', canConfirm: true, isSuccess: false },
  REDEEMED: { tone: 'success', title: 'Răscumpărat cu succes', description: 'CINSTE-ul a fost confirmat. Poți continua cu următoarea scanare.', canConfirm: false, isSuccess: true },
  'INVALID CODE': { tone: 'danger', title: 'Cod invalid', description: 'CINSTE-ul nu a putut fi validat. Verifică codul sau scanează din nou.', canConfirm: false, isSuccess: false },
  'ALREADY REDEEMED': { tone: 'warning', title: 'Deja răscumpărat', description: 'Acest CINSTE a fost deja folosit.', canConfirm: false, isSuccess: false },
  EXPIRED: { tone: 'warning', title: 'Expirat', description: 'Acest CINSTE nu mai este valabil.', canConfirm: false, isSuccess: false },
  'NOT VALID AT THIS PARTNER': { tone: 'danger', title: 'Alt partener', description: 'Acest CINSTE aparține altui partener.', canConfirm: false, isSuccess: false },
  'NOT YET VALID': { tone: 'warning', title: 'Încă nu este valabil', description: 'Acest CINSTE nu poate fi răscumpărat încă.', canConfirm: false, isSuccess: false },
  ERROR: { tone: 'danger', title: 'Nu am putut finaliza', description: 'Încearcă din nou. Dacă problema continuă, folosește codul manual sau contactează CINSTE.', canConfirm: false, isSuccess: false },
};

export function redemptionPresentation(state: string | null | undefined): RedemptionPresentation {
  if (state && presentations[state]) return presentations[state];
  return { tone: 'neutral', title: 'CINSTE indisponibil', description: 'Detaliile acestei experiențe nu sunt disponibile acum. Nu confirma răscumpărarea.', canConfirm: false, isSuccess: false };
}
