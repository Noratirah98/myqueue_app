import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QueueStatus2Page } from './queue-status2.page';

describe('QueueStatus2Page', () => {
  let component: QueueStatus2Page;
  let fixture: ComponentFixture<QueueStatus2Page>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(QueueStatus2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
