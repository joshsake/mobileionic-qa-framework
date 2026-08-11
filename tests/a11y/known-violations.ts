/**
 * Accessibility violations this app is currently known to have.
 *
 * The a11y specs assert that no violation appears *outside* this list, which
 * makes the suite a regression gate from day one instead of a wall of red that
 * gets ignored. Every entry is a real defect with a real user impact — this is
 * a record of them, not an exemption.
 *
 * Each entry must be removed once the defect is fixed. `accessibility.spec.ts`
 * has a spec that fails if an entry here no longer reproduces, so the list
 * cannot quietly rot into a permanent allowlist.
 */

export interface KnownViolation {
  /** axe rule id. */
  rule: string;
  /** axe impact rating, as reported. */
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  /** Routes the violation reproduces on. */
  routes: string[];
  /** What is wrong, where it comes from, and who it affects. */
  note: string;
}

export const KNOWN_VIOLATIONS: KnownViolation[] = [
  {
    rule: 'meta-viewport',
    impact: 'critical',
    routes: ['/login', '/dashboard', '/workouts', '/workouts/add', '/history', '/profile'],
    note:
      'app/src/index.html sets `maximum-scale=1.0, user-scalable=no`, which stops ' +
      'the user pinch-zooming anywhere in the app. This is the Ionic starter ' +
      'default and it fails WCAG 2.1 SC 1.4.4 (Resize Text). It affects anyone ' +
      'with low vision who relies on zoom, and it is the single highest-impact ' +
      'item here because it applies to every page. Removing `maximum-scale` and ' +
      '`user-scalable` is the whole fix.',
  },
  {
    rule: 'button-name',
    impact: 'critical',
    routes: ['/dashboard', '/workouts'],
    note:
      'Two icon-only controls have no accessible name: the logout button in ' +
      'dashboard.page.ts and the add-workout FAB in workouts.page.ts. Both are ' +
      'an <ion-icon> inside a button with no text and no aria-label, so a screen ' +
      'reader announces only "button". The FAB is the sole way to add a workout, ' +
      'so this makes the primary action unusable non-visually. Fix is an ' +
      'aria-label on each button.',
  },
  {
    rule: 'role-img-alt',
    impact: 'serious',
    routes: ['/dashboard', '/workouts'],
    note:
      'The <ion-icon> elements render with role="img" and no alternative text. ' +
      'Ionic does not add one automatically — icons need either aria-hidden="true" ' +
      'when decorative (which is the right answer for the nav-button icons, since ' +
      'the button already carries the label) or an aria-label when meaningful.',
  },
];

/** Rule ids that are currently accepted. */
export const KNOWN_RULE_IDS = new Set(KNOWN_VIOLATIONS.map((v) => v.rule));
