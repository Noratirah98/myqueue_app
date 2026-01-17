import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Scan2Page } from './scan2.page';

describe('Scan2Page', () => {
  let component: Scan2Page;
  let fixture: ComponentFixture<Scan2Page>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(Scan2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
