import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScanner3Page } from './qr-scanner3.page';

describe('QrScanner3Page', () => {
  let component: QrScanner3Page;
  let fixture: ComponentFixture<QrScanner3Page>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(QrScanner3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
