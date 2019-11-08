import {Model, model, property} from '@loopback/repository';

@model()
export class K8sServiceRequest extends Model {

  @property({
    type: 'object',
    required: true,
  })
  modal: object;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  constructor(data?: Partial<K8sServiceRequest>) {
    super(data);
    this.modal= {
      "apiVersion": "v1",
      "kind": "Service",
      "metadata": {
        "name": this.name,
        "labels": {
          "app": "visa"
        }
      },
      "spec": {
        "type": "NodePort",
        "ports": [
          {
            "name": "xrdp",
            "port": 3389
          }
        ],
        "selector": {
          "app": "visa"
        }
      }
    }
  }
}

export interface K8SServiceRequestRelations {
  // describe navigational properties here
}

export type K8SServiceRequestWithRelations = K8sServiceRequest & K8SServiceRequestRelations;
