import {bind, BindingScope, inject} from '@loopback/core';
import {Image} from '../models';
import {ImageRepository} from '../repositories';

@bind({scope: BindingScope.SINGLETON})
export class ImageService {
  constructor(@inject('image-repository') private _imageRepository: ImageRepository) {}

  async getAll(): Promise<Image[]> {
    return this._imageRepository.getAll();
  }

  getById(id:number): Promise<Image>{
    return this._imageRepository.getById(id);
  }

  async update(id:number,image:Image):Promise<Image>{
    await this._imageRepository.updateById(id,image);
    return this._imageRepository.getById(id);
    }
  }

