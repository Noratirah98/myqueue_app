import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QueueStatusPage } from './queue-status.page';

describe('QueueStatusPage', () => {
  let component: QueueStatusPage;
  let fixture: ComponentFixture<QueueStatusPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(QueueStatusPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
