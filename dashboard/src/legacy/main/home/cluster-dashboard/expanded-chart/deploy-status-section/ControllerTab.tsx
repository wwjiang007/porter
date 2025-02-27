import React, { useContext, useEffect, useMemo, useState } from "react";
import { timeFormat } from "d3-time-format";
import ConfirmOverlay from "legacy/components/ConfirmOverlay";
import api from "legacy/shared/api";
import {
  useWebsockets,
  type NewWebsocketOptions,
} from "legacy/shared/hooks/useWebsockets";
import _ from "lodash";
import styled from "styled-components";

import { Context } from "shared/Context";

import PodRow from "./PodRow";
import ResourceTab from "./ResourceTab";
import { getAvailability, getPodStatus } from "./util";

type Props = {
  controller: any;
  selectedPod: any;
  selectPod: (newPod: any, userSelected: boolean) => unknown;
  selectors: any;
  isLast?: boolean;
  isFirst?: boolean;
  setPodError: (x: string) => void;
  onUpdate: (update: any) => void;
};

// Controller tab in log section that displays list of pods on click.
export type ControllerTabPodType = {
  namespace: string;
  name: string;
  phase: string;
  status: any;
  replicaSetName: string;
  restartCount: number | string;
  podAge: string;
  revisionNumber?: number;
  containerStatus: any;
};

const formatCreationTimestamp = timeFormat("%H:%M:%S %b %d, '%y");

const ControllerTabFC: React.FunctionComponent<Props> = ({
  controller,
  selectPod,
  isFirst,
  isLast,
  selectors,
  setPodError,
  selectedPod,
  onUpdate,
}) => {
  const [pods, setPods] = useState<ControllerTabPodType[]>([]);
  const [rawPodList, setRawPodList] = useState<any[]>([]);
  const [podPendingDelete, setPodPendingDelete] = useState<any>(null);
  const [available, setAvailable] = useState<number>(null);
  const [total, setTotal] = useState<number>(null);
  const [userSelectedPod, setUserSelectedPod] = useState<boolean>(false);

  const { currentCluster, currentProject, setCurrentError } =
    useContext(Context);
  const { newWebsocket, openWebsocket, closeAllWebsockets, closeWebsocket } =
    useWebsockets();

  const currentSelectors = useMemo(() => {
    if (controller.kind.toLowerCase() == "job" && selectors) {
      return [...selectors];
    }
    const newSelectors = [] as string[];
    const ml =
      controller?.spec?.selector?.matchLabels || controller?.spec?.selector;
    let i = 1;
    let selector = "";
    for (const key in ml) {
      selector += key + "=" + ml[key];
      if (i != Object.keys(ml).length) {
        selector += ",";
      }
      i += 1;
    }
    newSelectors.push(selector);
    return [...newSelectors];
  }, [controller, selectors]);

  useEffect(() => {
    updatePods();
    [controller?.kind, "pod"].forEach((kind) => {
      setupWebsocket(kind, controller?.metadata?.uid);
    });
    () => {
      closeAllWebsockets();
    };
  }, [currentSelectors, controller, currentCluster, currentProject]);

  const updatePods = async () => {
    try {
      const res = await api.getMatchingPods(
        "<token>",
        {
          namespace: controller?.metadata?.namespace,
          selectors: currentSelectors,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      const data = res?.data as any[];
      const newPods = data
        // Parse only data that we need
        .map<ControllerTabPodType>((pod: any) => {
          const replicaSetName =
            Array.isArray(pod?.metadata?.ownerReferences) &&
            pod?.metadata?.ownerReferences[0]?.name;
          const containerStatus =
            Array.isArray(pod?.status?.containerStatuses) &&
            pod?.status?.containerStatuses[0];

          const restartCount = containerStatus
            ? containerStatus.restartCount
            : "N/A";

          const podAge = formatCreationTimestamp(
            new Date(pod?.metadata?.creationTimestamp)
          );

          return {
            namespace: pod?.metadata?.namespace,
            name: pod?.metadata?.name,
            phase: pod?.status?.phase,
            status: pod?.status,
            replicaSetName,
            restartCount,
            containerStatus,
            podAge: pod?.metadata?.creationTimestamp ? podAge : "N/A",
            revisionNumber:
              pod?.metadata?.annotations?.["helm.sh/revision"] || "N/A",
          };
        });

      setPods(newPods);
      setRawPodList(data);
      // If the user didn't click a pod, select the first returned from list.
      if (!userSelectedPod) {
        const status = getPodStatus(newPods[0].status);
        status === "failed" &&
          newPods[0].status?.message &&
          setPodError(newPods[0].status?.message);
        handleSelectPod(newPods[0], data);
      }
    } catch (error) {}
  };

  /**
   * handleSelectPod is a wrapper for the selectPod function received from parent.
   * Internally we use the ControllerPodType but we want to pass to the parent the
   * raw pod returned from the API.
   *
   * @param pod A ControllerPodType pod that will be used to search the raw pod to pass
   * @param rawList A rawList of pods in case we don't want to use the state one. Useful to
   * avoid problems with reactivity
   */
  const handleSelectPod = (
    pod: ControllerTabPodType,
    rawList?: any[],
    userSelected?: boolean
  ) => {
    const rawPod = [...rawPodList, ...(rawList || [])].find(
      (rawPod) => rawPod?.metadata?.name === pod?.name
    );
    selectPod(rawPod, !!userSelected);
  };

  const currentSelectedPod = useMemo(() => {
    const pod = selectedPod;
    const replicaSetName =
      Array.isArray(pod?.metadata?.ownerReferences) &&
      pod?.metadata?.ownerReferences[0]?.name;
    return {
      namespace: pod?.metadata?.namespace,
      name: pod?.metadata?.name,
      phase: pod?.status?.phase,
      status: pod?.status,
      replicaSetName,
    } as ControllerTabPodType;
  }, [selectedPod]);

  const currentControllerStatus = useMemo(() => {
    let status = available == total ? "running" : "waiting";

    controller?.status?.conditions?.forEach((condition: any) => {
      if (
        condition.type == "Progressing" &&
        condition.status == "False" &&
        condition.reason == "ProgressDeadlineExceeded"
      ) {
        status = "failed";
      }
    });

    if (controller.kind.toLowerCase() === "job" && pods.length == 0) {
      status = "completed";
    }
    return status;
  }, [controller, available, total, pods]);

  const handleDeletePod = (pod: any) => {
    api
      .deletePod(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          name: pod?.name,
          namespace: pod?.namespace,
          id: currentProject.id,
        }
      )
      .then((res) => {
        updatePods();
        setPodPendingDelete(null);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        setPodPendingDelete(null);
      });
  };

  const replicaSetArray = useMemo(() => {
    const podsDividedByReplicaSet = _.sortBy(pods, ["revisionNumber"])
      .reverse()
      .reduce<ControllerTabPodType[][]>(function (prev, currentPod, i) {
        if (
          !i ||
          prev[prev.length - 1][0].replicaSetName !== currentPod.replicaSetName
        ) {
          return prev.concat([[currentPod]]);
        }
        prev[prev.length - 1].push(currentPod);
        return prev;
      }, []);

    return podsDividedByReplicaSet.length === 1 ? [] : podsDividedByReplicaSet;
  }, [pods]);

  const setupWebsocket = (kind: string, controllerUid: string) => {
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status?`;
    if (kind == "pod" && currentSelectors) {
      apiEndpoint += `selectors=${currentSelectors[0]}`;
    }

    const options: NewWebsocketOptions = {};
    options.onopen = () => {
      console.log("connected to websocket");
    };

    options.onmessage = (evt: MessageEvent) => {
      const event = JSON.parse(evt.data);
      const object = event.Object;
      object.metadata.kind = event.Kind;

      // Make a new API call to update pods only when the event type is UPDATE
      if (event.event_type !== "UPDATE") {
        return;
      }
      // update pods no matter what if ws message is a pod event.
      // If controller event, check if ws message corresponds to the designated controller in props.
      if (event.Kind != "pod" && object.metadata.uid !== controllerUid) {
        return;
      }

      if (event.Kind != "pod") {
        const [available, total] = getAvailability(
          object.metadata.kind,
          object
        );
        setAvailable(available);
        setTotal(total);
        return;
      }
      updatePods();
    };

    options.onclose = () => {
      console.log("closing websocket");
    };

    options.onerror = (err: ErrorEvent) => {
      console.log(err);
      closeWebsocket(kind);
    };

    newWebsocket(kind, apiEndpoint, options);
    openWebsocket(kind);
  };

  const mapPods = (podList: ControllerTabPodType[]) => {
    return podList.map((pod, i, arr) => {
      const status = getPodStatus(pod.status);
      return (
        <PodRow
          key={i}
          pod={pod}
          isSelected={currentSelectedPod?.name === pod?.name}
          podStatus={status}
          isLastItem={i === arr.length - 1}
          onTabClick={() => {
            setPodError("");
            status === "failed" &&
              pod.status?.message &&
              setPodError(pod.status?.message);
            handleSelectPod(pod, [], true);
            setUserSelectedPod(true);
          }}
          onDeleteClick={(e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setPodPendingDelete(pod);
          }}
        />
      );
    });
  };

  useEffect(() => {
    onUpdate({ pods, available, total, replicaSetArray });
  }, [pods, replicaSetArray, available, total]);

  return (
    <ResourceTab
      label={controller.kind}
      // handle CronJob case
      name={controller.metadata?.name || controller.name}
      status={{ label: currentControllerStatus, available, total }}
      isLast={isLast}
      expanded={isFirst}
    >
      {!!replicaSetArray.length &&
        replicaSetArray.map((subArray, index) => {
          const firstItem = subArray[0];
          return (
            <div key={firstItem.replicaSetName + index}>
              <ReplicaSetContainer>
                <ReplicaSetName>
                  {firstItem?.revisionNumber &&
                    firstItem?.revisionNumber.toString() != "N/A" && (
                      <Bold>Revision {firstItem.revisionNumber}:</Bold>
                    )}{" "}
                  {firstItem.replicaSetName}
                </ReplicaSetName>
              </ReplicaSetContainer>
              {mapPods(subArray)}
            </div>
          );
        })}
      {!replicaSetArray.length && mapPods(pods)}
      <ConfirmOverlay
        message="Are you sure you want to delete this pod?"
        show={podPendingDelete}
        onYes={() => {
          handleDeletePod(podPendingDelete);
        }}
        onNo={() => {
          setPodPendingDelete(null);
        }}
      />
    </ResourceTab>
  );
};

export default ControllerTabFC;

const Bold = styled.span`
  font-weight: 500;
  display: inline;
  color: #ffffff;
`;

const ReplicaSetContainer = styled.div`
  padding: 10px 5px;
  display: flex;
  overflow-wrap: anywhere;
  justify-content: space-between;
`;

const ReplicaSetName = styled.span`
  padding-left: 10px;
  overflow-wrap: anywhere;
  max-width: calc(100% - 45px);
  line-height: 1.5em;
  color: #ffffff33;
`;
