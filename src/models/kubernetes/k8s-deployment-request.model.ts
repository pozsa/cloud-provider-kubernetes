import { Image, Flavour, User } from '../domain';
import { APPLICATION_CONFIG } from '../../application-config';
import { IK8SRequestHelper } from '../../utils';

export interface K8sDeploymentRequestConfig {
  name: string,
  image: Image,
  flavour: Flavour,
  user: User,
  imagePullSecret?: string,
  helper?: IK8SRequestHelper
}

export class K8sDeploymentRequest {
  private _model: any;

  get name(): string {
    return this._config.name;
  }

  get model(): any {
    return this._model;
  }

  constructor(private _config: K8sDeploymentRequestConfig) {
    this._model = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: this._config.name,
        labels: {
          app: this._config.name,
          owner: APPLICATION_CONFIG().kubernetes.ownerLabel
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: this._config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: this._config.name
            }
          },
          spec: {
            containers: [
              {
                name: this._config.name,
                image: this._config.image.repository ? `${this._config.image.repository}/${this._config.image.path}` : this._config.image.path,
                ports: this._config.image.protocols.map(protocol => {
                  return { name: protocol.name.toLowerCase(), containerPort: protocol.port };
                }),
                command: this._config.image.command ? [this._config.image.command] : undefined,
                args: this._config.image.args ? this._config.image.args.split(',') : undefined,
                env: this._config.helper ? this._config.helper.getEnvVars(this._config.image, this._config.user) : undefined,
                volumeMounts: this._config.image.volumes ? this._config.image.volumes.map(volume => ({
                  mountPath: volume.path, 
                  name: volume.name, 
                  readOnly: volume.readonly
                })) : undefined,
                resources: {
                  limits: {
                    cpu: `${this._config.flavour.cpu}`,
                    memory: `${this._config.flavour.memory}Mi`
                  },
                  requests: {
                    cpu: `${this._config.flavour.cpu}`,
                    memory: `${this._config.flavour.memory}Mi`
                  }
                },
              }
            ],
            imagePullSecrets: this._config.imagePullSecret != null ? [{ name:this._config.imagePullSecret }] : [],
            volumes: this._config.helper ? this._config.helper.getVolumes(this._config.image, this._config.user) : undefined
          }
        }
      }
    };
  }
}
