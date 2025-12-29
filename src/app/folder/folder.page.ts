import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MainService } from '../services/main.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
})
export class FolderPage implements OnInit {
  public folder!: string;
  private activatedRoute = inject(ActivatedRoute);

  features: any[] = [
    {
      id: 1,
      name: 'Profile',
      src: 'assets/icons/patient.png',
      link: '/patient',
    },
    {
      id: 2,
      name: 'Record',
      src: 'assets/icons/record.png',
      link: '',
    },
    {
      id: 3,
      name: 'Health',
      src: 'assets/icons/health.png',
      link: '',
    },
    {
      id: 4,
      name: 'Feedback',
      src: 'assets/icons/feedback.png',
      link: '',
    },
  ];

  constructor(public main: MainService) {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }

  slidesOptions = {
    slidesPerView: 1.5,
  };
}
