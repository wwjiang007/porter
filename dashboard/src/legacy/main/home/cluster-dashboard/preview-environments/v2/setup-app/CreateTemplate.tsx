import React, { useEffect, useState } from "react";
import addOns from "legacy/assets/add-ons.svg";
import Back from "legacy/components/porter/Back";
import Button from "legacy/components/porter/Button";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import VerticalSteps from "legacy/components/porter/VerticalSteps";
import { usePorterYaml } from "legacy/lib/hooks/usePorterYaml";
import { valueExists } from "legacy/shared/util";
import _ from "lodash";
import { useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import { LatestRevisionProvider } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { type AppInstance } from "main/home/app-dashboard/apps/types";
import EnvSettings from "main/home/app-dashboard/validate-apply/app-settings/EnvSettings";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { AddonsList } from "main/home/managed-addons/AddonsList";

import {
  useEnvTemplate,
  type AppTemplateFormData,
} from "../EnvTemplateContextProvider";
import { AppSelector } from "./AppSelector";
import { ConsolidatedServices } from "./ConsolidatedServices";
import { PreviewGHAModal } from "./PreviewGHAModal";
import { RevisionLoader } from "./RevisionLoader";

export const CreateTemplate: React.FC = () => {
  const history = useHistory();

  const [step, setStep] = useState(0);
  const [selectedApp, setSelectedApp] = useState<AppInstance | null>(null);
  const [detectedServices, setDetectedServices] = useState<{
    detected: boolean;
    count: number;
  }>({ detected: false, count: 0 });

  const {
    showGHAModal,
    setShowGHAModal,
    createError,
    buttonStatus,
    savePreviewConfig,
  } = useEnvTemplate();

  const {
    formState: { isSubmitting },
    setValue,
    watch,
  } = useFormContext<AppTemplateFormData>();

  const source = watch("source");

  const { detectedServices: servicesFromYaml, detectedName } = usePorterYaml({
    source: source.type === "github" ? source : null,
    appName: "",
  });

  useEffect(() => {
    if (servicesFromYaml && !detectedServices.detected) {
      const { services, predeploy, build: detectedBuild } = servicesFromYaml;
      setValue("app.services", services);
      setValue("app.predeploy", [predeploy].filter(valueExists));

      if (detectedBuild) {
        setValue("app.build", detectedBuild);
      }
      setDetectedServices({
        detected: true,
        count: services.length,
      });
    }

    if (!servicesFromYaml && detectedServices.detected) {
      setValue("app.services", []);
      setValue("app.predeploy", []);
      setDetectedServices({
        detected: false,
        count: 0,
      });
    }
  }, [servicesFromYaml, detectedName, detectedServices.detected]);

  useEffect(() => {
    if (selectedApp?.deployment_target.id) {
      const queryParams = new URLSearchParams(location.search);
      queryParams.set("target", selectedApp.deployment_target.id.toString());
      history.push({
        search: queryParams.toString(),
      });
    }
  }, [selectedApp]);

  useEffect(() => {
    if (selectedApp) {
      setStep(3);
    }
  }, [selectedApp?.id]);

  return (
    <>
      <Back to="/preview-environments" />
      <DashboardHeader
        prefix={<Icon src={addOns} />}
        title="Create a new preview template"
        capitalize={false}
        disableLineBreak
      />
      <DarkMatter />
      <div>
        <VerticalSteps
          currentStep={step}
          steps={[
            <>
              <Text size={16}>Choose an existing app</Text>
              <Spacer y={0.5} />
              <AppSelector
                selectedApp={selectedApp}
                setSelectedApp={setSelectedApp}
              />
              <Spacer y={0.5} />
            </>,
            <>
              <Text size={16}>Datastore Addons</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Ephemeral datastores will be created for each preview
                environment
              </Text>
              <Spacer y={0.5} />
              <AddonsList />
              <Spacer y={0.5} />
            </>,
            !selectedApp?.name ? (
              <>
                <Text size={16}>Service overrides</Text>
                <Spacer y={0.5} />
                <ConsolidatedServices />
                <Text size={16}>Env variable overrides</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Change environment variables to test keys or values suitable
                  for previews
                </Text>
                <EnvSettings baseEnvGroups={[]} />
              </>
            ) : (
              <LatestRevisionProvider
                key={selectedApp?.id}
                appName={selectedApp?.name}
              >
                <>
                  <RevisionLoader>
                    <Text size={16}>Service overrides</Text>
                    <Spacer y={0.5} />
                    <ConsolidatedServices />
                    <Text size={16}>Env variable overrides</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Change environment variables to test keys or values
                      suitable for previews
                    </Text>
                    <EnvSettings baseEnvGroups={[]} />
                    {showGHAModal && (
                      <PreviewGHAModal
                        onClose={() => {
                          setShowGHAModal(false);
                        }}
                        savePreviewConfig={savePreviewConfig}
                        error={createError}
                      />
                    )}
                  </RevisionLoader>
                </>
              </LatestRevisionProvider>
            ),
            <>
              <Button
                type="submit"
                status={buttonStatus}
                loadingText={"Creating..."}
                width={"120px"}
                disabled={isSubmitting}
              >
                Create
              </Button>
            </>,
          ].filter((x) => x)}
        />
        <Spacer y={3} />
      </div>
    </>
  );
};

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
