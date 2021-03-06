import { del, get, getModelSchemaRef, param, post, requestBody, put } from '@loopback/openapi-v3';
import { Instance, InstanceState, InstanceCommand, InstanceCommandType, InstanceAccount } from '../models';
import { inject } from '@loopback/context';
import { FlavourService, ImageService, InstanceService, InstanceActionService } from '../services';
import { InstanceCreatorDto } from './dto/instance-creator-dto';
import { InstanceStatus } from '../models';
import { InstanceCommandDto } from './dto/instance-command-dto';
import { BaseController } from './base.controller';
import { InstanceUpdatorDto } from './dto/instance-updator-dto';
import { InstanceNetworkDto } from './dto/instance-network-dto';
import { InstanceDto } from './dto/instance-dto';

export class InstanceController extends BaseController {
  constructor(
    @inject('services.InstanceService') private _instanceService: InstanceService,
    @inject('services.InstanceActionService') private _instanceActionService: InstanceActionService,
    @inject('services.ImageService') private _imageservice: ImageService,
    @inject('services.FlavourService') private _flavourservice: FlavourService
  ) {
    super();
  }

  @get('/instances', {
    summary: 'Get a list of all instances',
    responses: {
      '200': {
        description: 'Ok',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Instance) }
          }
        }
      }
    }
  })
  async getAll(): Promise<InstanceDto[]> {
    const instances = await this._instanceService.getAll();
    return instances.map(instance => this._mapInstance(instance));
  }

  @get('/instances/{id}', {
    summary: 'Get an instance by a given identifier',
    responses: {
      '200': {
        description: 'Ok',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Instance)
          }
        }
      }
    }
  })
  async getById(@param.path.string('id') id: number): Promise<InstanceDto> {
    const instance = await this._instanceService.getById(id);
    this.throwNotFoundIfNull(instance, 'Instance with given id does not exist');

    return this._mapInstance(instance);
  }

  @post('/instances', {
    summary: 'Create a new instance',
    responses: {
      '201': {
        description: 'Created',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Instance)
          }
        }
      }
    }
  })
  async create(@requestBody() instanceCreator: InstanceCreatorDto): Promise<InstanceDto> {
    const image = await this._imageservice.getById(instanceCreator.imageId);
    const flavour = await this._flavourservice.getById(instanceCreator.flavourId);

    this.throwBadRequestIfNull(image, 'Invalid image');
    this.throwBadRequestIfNull(flavour, 'Invalid flavour');
    this.throwBadRequestIfNull(instanceCreator.account, 'Invalid instance account');

    const instance: Instance = new Instance({
      name: instanceCreator.name,
      description: instanceCreator.description,
      status: InstanceStatus.BUILDING,
      image: image,
      flavour: flavour,
      account: new InstanceAccount({
        userId: instanceCreator.account.userId,
        username: instanceCreator.account.username,
        uid: instanceCreator.account.uid,
        gid: instanceCreator.account.gid,
        homePath: instanceCreator.account.homePath,
        email: instanceCreator.account.email,
      })
    });

    const persistedInstance = await this._instanceService.save(instance);

    const command: InstanceCommand = new InstanceCommand(persistedInstance, InstanceCommandType.CREATE);
    this._instanceActionService.execute(command);

    return this._mapInstance(persistedInstance);
  }

  @put('/instances/{id}', {
    summary: 'Update an instance by a given identifier',
    responses: {
      '200': {
        description: 'Ok',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Instance)
          }
        }
      }
    }
  })
  async update(@param.path.number('id') id: number, @requestBody() instanceUpdatorDto: InstanceUpdatorDto): Promise<InstanceDto> {
    this.throwBadRequestIfNull(InstanceUpdatorDto, 'Invalid instance in request');
    this.throwBadRequestIfNotEqual(id, instanceUpdatorDto.id, 'Id in path is not the same as body id');

    const instance = await this._instanceService.getById(id);
    this.throwNotFoundIfNull(instance, 'Instance with given id does not exist');

    instance.name = instanceUpdatorDto.name;
    instance.description = instanceUpdatorDto.description

    const persistedInstance = await this._instanceService.save(instance);
    return this._mapInstance(persistedInstance);
  }

  @get('/instances/{id}/state', {
    summary: 'Get the state of an instance by a given identifier',
    responses: {
      '200': {
        description: 'Ok',
        content: {
          'application/json': {
            schema: getModelSchemaRef(InstanceState)
          }
        }
      }
    }
  })
  async getState(@param.path.string('id') id: number): Promise<InstanceState> {
    const instance = await this._instanceService.getById(id);
    this.throwNotFoundIfNull(instance, 'Instance with given id does not exist');

    return instance.state;
  }

  @get('/instances/{id}/network', {
    summary: 'Get the network of an instance by a given identifier',
    responses: {
      '200': {
        description: 'Ok',
        content: {
          'application/json': {
            schema: getModelSchemaRef(InstanceNetworkDto)
          }
        }
      }
    }
  })
  async getNetwork(@param.path.string('id') id: number): Promise<InstanceNetworkDto> {
    const instance = await this._instanceService.getById(id);
    this.throwNotFoundIfNull(instance, 'Instance with given id does not exist');

    return new InstanceNetworkDto({
      hostname: instance.hostname,
      protocols: instance.protocols
    });
  }

  @del('/instances/{id}', {
    summary: 'Delete an instance by a given identifier',
    responses: {
      '200': {
        description: 'Ok'
      }
    }
  })
  async delete(@param.path.string('id') id: number): Promise<InstanceDto> {
    const instance = await this._instanceService.getById(id);
    this.throwNotFoundIfNull(instance, 'Instance with given id does not exist');

    return this._performAction(instance, InstanceCommandType.DELETE);
  }

  @post('/instances/{id}/actions', {
    summary: 'Invoke an action by a given identifier i.e. REBOOT, TERMINATE',
    responses: {
      '201': {
        description: 'Created'
      }
    }
  })
  async executeAction(@param.path.string('id') id: number, @requestBody() command: InstanceCommandDto): Promise<InstanceDto> {
    const instance = await this._instanceService.getById(id);
    this.throwNotFoundIfNull(instance, 'Instance with given id does not exist');

    return this._performAction(instance, command.type);
  }

  private async _performAction(instance: Instance, instanceCommandType: InstanceCommandType): Promise<InstanceDto> {
    if (instanceCommandType === InstanceCommandType.START) {
      instance.status = InstanceStatus.STARTING;
      instance.statusMessage = 'Instance starting';

    } else if (instanceCommandType === InstanceCommandType.REBOOT) {
      instance.status = InstanceStatus.REBOOTING;
      instance.statusMessage = 'Instance rebooting';

    } else if (instanceCommandType === InstanceCommandType.SHUTDOWN) {
      instance.status = InstanceStatus.STOPPING;
      instance.statusMessage = 'Instance stopping';

    } else if (instanceCommandType === InstanceCommandType.DELETE) {
      instance.status = InstanceStatus.DELETING;
      instance.statusMessage = 'Instance deleting';
    }

    // Save state of the instance
    await this._instanceService.save(instance);

    // create and queue action
    const instanceCommand = new InstanceCommand(instance, instanceCommandType);
    this._instanceActionService.execute(instanceCommand);

    return this._mapInstance(instance);
  }

  private _mapInstance(instance: Instance): InstanceDto {
    return new InstanceDto({
      id: instance.id,
      name: instance.name,
      description: instance.description,
      computeId: instance.computeId,
      hostname: instance.hostname,
      protocols: instance.protocols,
      createdAt: instance.createdAt,
      image: instance.image,
      flavour: instance.flavour,
      state: instance.state,
      account: instance.account
    });
  }
}
