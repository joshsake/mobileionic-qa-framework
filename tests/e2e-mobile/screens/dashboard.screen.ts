import { BaseScreen } from './base.screen';

/**
 * DashboardScreen covers the landing screen reached after a successful login.
 *
 * It exists so specs can assert they actually arrived somewhere rather than
 * merely that the login card went away — "no longer on login" also matches a
 * blank screen or a crashed renderer. Maps to data-testid attributes in
 * app/src/app/pages/dashboard/dashboard.page.ts.
 */
export class DashboardScreen extends BaseScreen {
  private selectors = {
    title: 'dashboard-title',
    logoutButton: 'logout-btn',
    totalWorkoutsCard: 'dashboard-total-workouts-card',
    totalDurationCard: 'dashboard-total-duration-card',
    navWorkouts: 'nav-workouts-btn',
    navHistory: 'nav-history-btn',
    navProfile: 'nav-profile-btn',
  };

  /**
   * Wait for the dashboard to be displayed.
   */
  async waitForDashboard(timeoutMs = 30000): Promise<void> {
    await this.waitForScreen(this.selectors.title, timeoutMs);
  }

  /**
   * Whether the dashboard is currently displayed.
   */
  async isDashboardDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.title);
  }

  /**
   * Navigate to the workouts list.
   */
  async goToWorkouts(): Promise<void> {
    await this.tapElement(this.selectors.navWorkouts);
  }

  /**
   * Read the "Total Workouts" tile.
   *
   * The dashboard derives this from GET /api/workouts, so a non-"0" value is
   * evidence the authenticated request actually reached the API — which is the
   * whole point of the emulator-to-host tunnel.
   */
  async getTotalWorkoutsText(): Promise<string> {
    return this.getTextById(this.selectors.totalWorkoutsCard);
  }

  /**
   * Log out, returning to the login screen.
   */
  async logout(): Promise<void> {
    await this.tapElement(this.selectors.logoutButton);
  }
}
