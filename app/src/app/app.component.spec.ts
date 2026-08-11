import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

/**
 * The shell is trivial, but it is the one component every route renders
 * inside. If ion-app or ion-router-outlet stops resolving — a bad Ionic
 * upgrade, a dropped standalone import — every page goes blank at once, and
 * this is the cheapest place to notice.
 */
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the Ionic app shell with a router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('ion-app')).toBeTruthy();
    expect(host.querySelector('ion-router-outlet')).toBeTruthy();
  });
});
