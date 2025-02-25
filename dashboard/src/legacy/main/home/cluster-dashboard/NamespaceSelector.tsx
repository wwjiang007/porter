import React, { useContext, useEffect, useMemo, useState } from "react";
import folder from "legacy/assets/folder-outline.svg";
import RadioFilter from "legacy/components/RadioFilter";
import api from "legacy/shared/api";
import styled from "styled-components";

import { Context } from "shared/Context";

type Props = {
  setNamespace: (x: string) => void;
  namespace: string;
};

type StateType = {
  namespaceOptions: Array<{ label: string; value: string }>;
};

// TODO: fix update to unmounted component
export const NamespaceSelector: React.FunctionComponent<Props> = ({
  setNamespace,
  namespace,
}) => {
  const context = useContext(Context);
  const _isMounted = true;
  const [namespaceOptions, setNamespaceOptions] = useState<
    Array<{
      label: string;
      value: string;
    }>
  >([]);
  const [defaultNamespace, setDefaultNamespace] = useState<string>(
    localStorage.getItem(
      `${context.currentProject.id}-${context.currentCluster.id}-namespace`
    )
  );

  const updateOptions = () => {
    const { currentCluster, currentProject } = context;

    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        if (_isMounted) {
          const namespaceOptions: Array<{ label: string; value: string }> = [
            // { label: "All", value: "ALL" },
          ];

          // Set namespace from URL if specified
          const queryString = window.location.search;
          const urlParams = new URLSearchParams(queryString);
          let urlNamespace = urlParams.get("namespace");
          if (urlNamespace === "ALL") {
            urlNamespace = "ALL";
          }

          const availableNamespaces = res.data.filter((namespace: any) => {
            return namespace.status !== "Terminating";
          });
          if (
            localStorage.getItem(
              `${context.currentProject.id}-${context.currentCluster.id}-namespace`
            )
          ) {
            setDefaultNamespace(
              localStorage.getItem(
                `${context.currentProject.id}-${context.currentCluster.id}-namespace`
              )
            );
          } else {
            setDefaultNamespace("default");
          }
          availableNamespaces.forEach((x: { name: string }, i: number) => {
            if (
              currentProject?.capi_provisioner_enabled &&
              x.name.startsWith("porter-stack-")
            ) {
              namespaceOptions.push({
                label: x.name.replace("porter-stack-", ""),
                value: x.name,
              });
            } else if (!x.name.startsWith("pr-")) {
              namespaceOptions.push({
                label: x.name,
                value: x.name,
              });
            }
            if (x.name === urlNamespace) {
              setDefaultNamespace(urlNamespace);
            }
          });
          setNamespaceOptions(namespaceOptions);
        }
      })
      .catch((err) => {
        if (_isMounted) {
          setNamespaceOptions([]);
        }
      });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlNamespace = urlParams.get("namespace");
    if (
      urlNamespace === "" ||
      defaultNamespace === "" ||
      urlNamespace === "ALL"
    ) {
      setNamespace("default");
    } else if (namespace !== defaultNamespace) {
      setNamespace(defaultNamespace);
    }
  }, [namespaceOptions]);

  useEffect(() => {
    updateOptions();
  }, [namespace, context.currentCluster]);

  useEffect(() => {
    setNamespace(
      localStorage.getItem(
        `${context.currentProject.id}-${context.currentCluster.id}-namespace`
      )
    );
  }, [context.currentCluster]);

  const handleSetActive = (namespace: any) => {
    localStorage.setItem(
      `${context.currentProject.id}-${context.currentCluster.id}-namespace`,
      namespace
    );
    setNamespace(namespace);
  };

  return (
    <RadioFilter
      icon={folder}
      selected={namespace}
      setSelected={handleSetActive}
      options={namespaceOptions}
      name="Namespace"
    />
  );
};

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;
  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledNamespaceSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;
