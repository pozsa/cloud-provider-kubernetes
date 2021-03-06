import { get, getModelSchemaRef } from '@loopback/openapi-v3';
import { Info } from '../models';
import { inject } from '@loopback/context';
import { InfoService } from '../services';

export class InfoController {
  constructor(@inject('services.InfoService') private _infoservice: InfoService) {}

  @get('/info', {
    summary: 'Get information about the provider ',
    responses: {
      '200': {
        description: 'Ok',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Info)
          }
        }
      }
    }
  })
  getInfo(): Promise<Info> {
    return this._infoservice.getInfo();
  }
}
