import { expect } from '@loopback/testlab';
import { createTestApplicationContext } from '../../../helpers/context.helper';
import {
  InstanceService,
  K8sInstanceService,
  K8sNamespaceManager
} from '../../../../services';
import { K8sDeploymentRequest, K8sNamespaceRequest, K8sServiceRequest } from '../../../../models/kubernetes';
import { givenInitialisedTestDatabase } from '../../../helpers/database.helper';
import { KubernetesMockServer } from '../../../mock/kubernetes-mock-server';

describe('K8sInstanceService', () => {
  let k8sInstanceService: K8sInstanceService;
  let k8sNamespaceManager: K8sNamespaceManager;
  let instanceService: InstanceService;
  const kubernetesMockServer = new KubernetesMockServer();

  before('getK8sNamespaceManager', async () => {
    const testApplicationContext = createTestApplicationContext();
    k8sNamespaceManager = testApplicationContext.k8sInstanceService.namespaceManager;
    k8sInstanceService = testApplicationContext.k8sInstanceService;
    instanceService = testApplicationContext.instanceService;
  });

  beforeEach('Initialise Database', givenInitialisedTestDatabase);

  beforeEach('startMockServer', async () => {
    kubernetesMockServer.start();
  });

  afterEach('stopMockServer', async () => {
    kubernetesMockServer.stop();
  });

  it('create kubernetes instance', async () => {
    const k8sNamespace = await k8sNamespaceManager.create(new K8sNamespaceRequest('panosc'));
    expect(k8sNamespace).to.not.be.null();

    const instance = await instanceService.getById(3);
    const k8sInstance = await k8sInstanceService.create(instance);
    expect(k8sInstance).to.be.not.null();
  });

  it('create and delete kubernetes instance', async () => {
    const k8sNamespace = await k8sNamespaceManager.create(new K8sNamespaceRequest('panosc'));
    expect(k8sNamespace).to.not.be.null();

    const instance = await instanceService.getById(3);
    const k8sInstance = await k8sInstanceService.create(instance);
    const instanceDeleted = await k8sInstanceService.delete(k8sInstance.computeId);

    expect(instanceDeleted).to.be.true();
  });

  it('create instance and verify label connection', async()=>{
    const k8sNamespace = await k8sNamespaceManager.create(new K8sNamespaceRequest('panosc'));
    expect(k8sNamespace).to.not.be.null();
    const instance = await instanceService.getById(3);
    const k8sInstance = await k8sInstanceService.create(instance);
    const deploymentLabels= k8sInstance.deployment.labels;
    const serviceLabels = k8sInstance.service.selectorLabel;
    expect(deploymentLabels.app).to.be.equal(serviceLabels.app)

  });




});
