export function formattedAwardDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DEFAULT_CERTIFICATE_STATE = {
  templateId: 'custom_generic',
  studentName: 'John Doe',
  customTitle: '',
  shortNote: 'For working incredibly hard, displaying an outstanding attitude, and achieving fantastic progress.',
  awardDate: formattedAwardDate(),
  issuerName: 'Bodhana Academy',
};

export const DEFAULT_NOTE_MAX_WORDS = 150;

export function freshCertificateState() {
  return {
    ...DEFAULT_CERTIFICATE_STATE,
    awardDate: formattedAwardDate(),
  };
}
