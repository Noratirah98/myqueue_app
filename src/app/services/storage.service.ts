import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _storage!: Storage;

  constructor(private storage: Storage) {}

  async init() {
    if (!this._storage) {
      this._storage = await this.storage.create();
    }
  }

  async set(key: string, value: any) {
    await this.init();
    return this._storage.set(key, value);
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();
    return this._storage.get(key);
  }

  async remove(key: string) {
    await this.init();
    return this._storage.remove(key);
  }

  async clear() {
    await this.init();
    return this._storage.clear();
  }
}
