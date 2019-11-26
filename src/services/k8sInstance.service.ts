import {bind, BindingScope, inject, lifeCycleObserver} from '@loopback/core';
import {K8sServiceManager} from './k8sService.manager';
import {Flavour, Image, K8sInstance} from '../models';
import {K8sRequestFactoryService} from './k8sRequestFactory.service';
import {K8sDeploymentManager} from './k8sDeployment.manager';
import {InstanceCreatorDto} from '../controllers/dto/instanceCreatorDto';
import {KubernetesDataSource} from '../datasources';
import {logger} from '../utils';
import {K8sNamespaceManager} from './k8sNamespace.manager';

@lifeCycleObserver('server')
@bind({scope: BindingScope.SINGLETON})
export class K8sInstanceService {

  private _requestFactoryService = new K8sRequestFactoryService();
  private _deploymentManager: K8sDeploymentManager;
  private _serviceManager: K8sServiceManager;
  private _namespaceManager: K8sNamespaceManager;

  private _defaultNamespace = 'panosc';

  get defaultNamespace(): string {
    return this._defaultNamespace;
  }

  get deploymentManager(): K8sDeploymentManager {
    return this._deploymentManager;
  }

  get serviceManager(): K8sServiceManager {
    return this._serviceManager;
  }

  get namespaceManager(): K8sNamespaceManager {
    return this._namespaceManager;
  }

  get requestFactoryService(): K8sRequestFactoryService {
    return this._requestFactoryService;
  }

  constructor(@inject('datasources.kubernetes') dataSource: KubernetesDataSource) {
    this._deploymentManager = new K8sDeploymentManager(dataSource);
    this._serviceManager = new K8sServiceManager(dataSource);
    this._namespaceManager = new K8sNamespaceManager(dataSource);
  }

  async createK8sInstance(instanceCreator:InstanceCreatorDto,image:Image,flavour:Flavour): Promise<K8sInstance> {
    const deploymentRequest = this._requestFactoryService.createK8sDeploymentRequest(instanceCreator.name,image.name);
    logger.info('Creating Deployment in Kubernetes');
    const deployment = await this._deploymentManager.createDeploymentIfNotExist(deploymentRequest, this._defaultNamespace);
    const serviceRequest = this._requestFactoryService.createK8sServiceRequest(instanceCreator.name);
    logger.info('Creating Service in Kubernetes');
    const service = await this._serviceManager.createServiceIfNotExist(serviceRequest, this._defaultNamespace);
    return new K8sInstance(deployment, service);
  }

  /**
   * Start the datasource when application is started
   */
  async start(): Promise<void> {
    this._defaultNamespace = process.env.CLOUD_PROVIDER_K8S_KUBERNETES_DEFAULT_NAMESPACE || this.defaultNamespace;
    const defaultNamespaceRequest = this.requestFactoryService.createK8sNamespaceRequest(this._defaultNamespace);
    await this.namespaceManager.createNamespaceIfNotExist(defaultNamespaceRequest);
  }

}