import { bind, BindingScope } from '@loopback/core';
import { Flavour } from '../models';
import { FlavourRepository } from '../repositories';
import { repository } from '@loopback/repository';
import { BaseService } from './base.service';

@bind({ scope: BindingScope.SINGLETON })
export class FlavourService extends BaseService<Flavour, FlavourRepository> {
  constructor(@repository(FlavourRepository) repo: FlavourRepository) {
    super(repo);
  }

  getUsageCount(): Promise<{flavourId: number, flavourName: string, instanceCount: number}[]> {
    return this._repository.getUsageCount();
  }
  
}
