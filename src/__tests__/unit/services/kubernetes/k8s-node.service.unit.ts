import { expect } from '@loopback/testlab';
import { createTestApplicationContext } from '../../../helpers/context.helper';
import { KubernetesMockServer } from '../../../mock/kubernetes-mock-server';
import { K8sNodeService } from '../../../../services/kubernetes/k8s-node.service';

describe('K8sNodeService', () => {
  let k8sNodeService: K8sNodeService;
  const kubernetesMockServer = new KubernetesMockServer();

  before('getK8sDeploymentManager', async () => {
    const testApplicationContext = createTestApplicationContext();
    k8sNodeService = testApplicationContext.k8sInstanceService.nodeService;
  });

  beforeEach('startMockServer', async () => {
    kubernetesMockServer.start();
  });

  afterEach('stopMockServer', async () => {
    kubernetesMockServer.stop();
  });

  it('get all nodes', async () => {
    const k8sNodes = await k8sNodeService.getAll();
    expect(k8sNodes).to.not.be.null();
  });

  it('get master node', async () => {
    const k8sMaster = await k8sNodeService.getMaster();
    expect(k8sMaster).to.not.be.null();
  });

  it('get specific node', async () => {
    const k8sNode = await k8sNodeService.get('k8s-test-master-1');
    expect(k8sNode).to.not.be.null();
  });

  it('get specific non existent node', async () => {
    const k8sNode = await k8sNodeService.get('k8s-test-no-1');
    expect(k8sNode).to.be.null();
  });


});
