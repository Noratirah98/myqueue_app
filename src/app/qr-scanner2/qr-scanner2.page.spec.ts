import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScanner2Page } from './qr-scanner2.page';

describe('QrScanner2Page', () => {
  let component: QrScanner2Page;
  let fixture: ComponentFixture<QrScanner2Page>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(QrScanner2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
