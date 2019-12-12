import { K8sDeployment, K8sService } from '../../models/kubernetes';
import { K8sInstanceState } from '../../models/kubernetes';
import { logger } from '../../utils';
import { K8sInstanceStatus } from '../../models/enumerations';

enum K8sDeploymentStatus {
  UNKNOWN = 'UNKNOWN',
  BUILDING = 'BUILDING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
}

enum K8sServiceStatus {
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
}

interface K8sServiceState {
  status: K8sServiceStatus
  message?: string
}

interface K8sDeploymentState {
  status: K8sDeploymentStatus
  message?: string
}

export class K8sInstanceStatusHelper {

  static getK8sInstanceState(deployment: K8sDeployment, service: K8sService): K8sInstanceState {
    const deploymentState = K8sInstanceStatusHelper.getK8sDeploymentState(deployment);
    const deploymentStatus = deploymentState.status;
    if (deploymentStatus === 'ERROR') {
      return new K8sInstanceState(K8sInstanceStatus.ERROR, deploymentState.message);
    } else if (deploymentStatus === 'BUILDING') {
      return new K8sInstanceState(K8sInstanceStatus.BUILDING, deploymentState.message);
    } else if (deploymentStatus === 'UNKNOWN') {
      return new K8sInstanceState(K8sInstanceStatus.UNKNOWN);
    } else if (deploymentStatus === 'ACTIVE') {
      const serviceState = K8sInstanceStatusHelper.getK8sServiceState(service, deployment);
      const serviceStatus = serviceState.status;
      if (serviceStatus === 'ERROR') {
        return new K8sInstanceState(K8sInstanceStatus.ERROR, serviceState.message);
      } else if (serviceStatus === 'ACTIVE') {
        return new K8sInstanceState(K8sInstanceStatus.ACTIVE);
      }
    }

  }

  static getK8sServiceState(service: K8sService, deployment: K8sDeployment): K8sServiceState {
    const serviceEndpoint = service.endpoint;
    if (serviceEndpoint && serviceEndpoint.length === 1) {
      const deploymentPorts = deployment.ports;
      const endpointsPorts = serviceEndpoint[0].ports;
      for (const deploymentPort of deploymentPorts) {
        if (endpointsPorts.find((p: any) => p.port === deploymentPort.containerPort) == null) {
          return {
            status: K8sServiceStatus.ERROR,
            message: `port ${deploymentPort.name} has not been mapped to the service`
          };
        }
      }
      return { status: K8sServiceStatus.ACTIVE };
    } else {
      return { status: K8sServiceStatus.ERROR, message: 'Service has no or too many endpoints ' };
    }
  }


  static getK8sDeploymentState(deployment: K8sDeployment): K8sDeploymentState {
    const statuses = deployment.statuses;

    const mostRecentDate = new Date(Math.max.apply(null, statuses.map((e: any) => {
      return new Date(e.lastTransitionTime);
    })));

    const mostRecentObjects = statuses.filter((e: any) => {
      const d = new Date(e.lastTransitionTime);
      return d.getTime() === mostRecentDate.getTime();
    });

    const currentStatus = mostRecentObjects.find((object: any) => object.status === 'True');
    if (currentStatus != null) {
      const statusType = currentStatus.type.toLowerCase();
      switch (statusType) {
        case 'available':
          return { status: K8sDeploymentStatus.ACTIVE, message: currentStatus.message };
        case 'progressing':
          return { status: K8sDeploymentStatus.BUILDING, message: currentStatus.message };
        case 'replicafailure':
          return { status: K8sDeploymentStatus.ERROR, message: currentStatus.message };
        default:
          return { status: K8sDeploymentStatus.UNKNOWN };
      }

    } else {
      logger.warn(`Couldn't find a current status object`);
      return { status: K8sDeploymentStatus.UNKNOWN };
    }
  }
}