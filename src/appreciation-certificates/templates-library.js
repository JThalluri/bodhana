export const CERTIFICATE_TEMPLATES = {
  penmanship_hero: {
    label: 'Penmanship Hero',
    defaultTitle: 'Mastery of the Pen Award',
    presentedLine: 'This certificate is proudly presented to',
  },
  speed_fluency: {
    label: 'Speed Fluency',
    defaultTitle: 'Speed & Accuracy Champion',
    presentedLine: 'This certificate is proudly presented to',
  },
  math_master: {
    label: 'Math Master',
    defaultTitle: 'Grand Math Master',
    presentedLine: 'This certificate is proudly presented to',
  },
  spelling_hero: {
    label: 'Spelling Hero',
    defaultTitle: 'Spelling Hero Award',
    presentedLine: 'This certificate is proudly presented to',
  },
  reading_milestone: {
    label: 'Reading Milestone',
    defaultTitle: 'Literacy Milestone Achievement',
    presentedLine: 'This certificate is proudly presented to',
  },
  custom_generic: {
    label: 'Custom Generic',
    defaultTitle: 'Certificate of Excellence',
    presentedLine: 'This certificate is proudly presented to',
  },
};

export function getCertificateTemplate(templateId) {
  return CERTIFICATE_TEMPLATES[templateId] ?? CERTIFICATE_TEMPLATES.custom_generic;
}
