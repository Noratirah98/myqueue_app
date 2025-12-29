import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Notification2Page } from './notification2.page';

describe('Notification2Page', () => {
  let component: Notification2Page;
  let fixture: ComponentFixture<Notification2Page>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(Notification2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
