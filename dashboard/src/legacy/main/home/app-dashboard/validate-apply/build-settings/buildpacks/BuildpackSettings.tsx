import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "legacy/components/porter/Button";
import Error from "legacy/components/porter/Error";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  type PorterAppFormData,
  type SourceOptions,
} from "legacy/lib/porter-apps";
import { type BuildOptions } from "legacy/lib/porter-apps/build";
import api from "legacy/shared/api";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled, { keyframes } from "styled-components";
import { z } from "zod";

import {
  DEFAULT_BUILDER_NAME,
  DEFAULT_HEROKU_STACK,
  detectedBuildpackSchema,
  type Buildpack,
  type DetectedBuildpack,
} from "main/home/app-dashboard/types/buildpack";

import BuildpackConfigurationModal from "./BuildpackConfigurationModal";
import BuildpackList from "./BuildpackList";

type Props = {
  projectId: number;
  build: BuildOptions & {
    method: "pack";
  };
  source: SourceOptions & { type: "github" | "local" };
  populateBuildValuesOnceAfterDetection?: boolean;
};

export const DEFAULT_BUILDERS = [
  "heroku/buildpacks:20",
  "paketobuildpacks/builder-jammy-full:latest",
  "paketobuildpacks/builder:full",
  "heroku/builder:22",
  "heroku/builder-classic:22",
  "heroku/buildpacks:18",
];

const BuildpackSettings: React.FC<Props> = ({
  projectId,
  build,
  source,
  populateBuildValuesOnceAfterDetection,
}) => {
  const [populateBuild, setPopulateBuild] = useState<boolean>(
    populateBuildValuesOnceAfterDetection ?? false
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>(
    []
  );
  const { control, setValue } = useFormContext<PorterAppFormData>();
  const { replace } = useFieldArray({
    control,
    name: "app.build.buildpacks",
  });

  const { data, status } = useQuery(
    [
      "detectBuildpacks",
      projectId,
      source.git_repo_name,
      source.git_branch,
      build.context,
      isModalOpen,
    ],
    async () => {
      if (source.type !== "github") {
        return [];
      }

      const detectBuildPackRes = await api.detectBuildpack<DetectedBuildpack[]>(
        "<token>",
        {
          dir: build.context || ".",
        },
        {
          project_id: projectId,
          git_repo_id: source.git_repo_id,
          kind: "github",
          owner: source.git_repo_name.split("/")[0],
          name: source.git_repo_name.split("/")[1],
          branch: source.git_branch,
        }
      );

      const detectedBuildpacks = await z
        .array(detectedBuildpackSchema)
        .parseAsync(detectBuildPackRes.data);

      return detectedBuildpacks;
    },
    {
      enabled: source.type === "github" && (populateBuild || isModalOpen),
      retry: 0,
      refetchOnWindowFocus: false,
    }
  );

  const errorMessage = useMemo(
    () =>
      status === "error"
        ? `Unable to detect buildpacks at path: ${build.context}. Please make sure your repo, branch, and application root path are all set correctly and attempt to detect again.`
        : "",
    [build.context, status]
  );

  const builderOptions = useMemo(() => {
    const allBuilderOptions = [build.builder, ...DEFAULT_BUILDERS].sort();

    return Array.from(new Set(allBuilderOptions)).map((builder) => ({
      label: builder,
      value: builder,
    }));
  }, [build.builder]);

  const iseDetectingBuildpacks = useMemo(() => {
    return status === "loading" && source.type === "github";
  }, [status, source]);

  useEffect(() => {
    if (!data || data.length === 0) {
      return;
    }

    const defaultBuilder =
      data.find(
        (builder) => builder.name.toLowerCase() === DEFAULT_BUILDER_NAME
      ) ?? data[0];

    const allBuildpacks = defaultBuilder.others.concat(defaultBuilder.detected);

    setAvailableBuildpacks(
      allBuildpacks.filter(
        (bp) => !build.buildpacks.some((b) => b.buildpack === bp.buildpack)
      )
    );

    if (populateBuild) {
      let detectedBuilder: string;
      if (
        defaultBuilder.builders.length &&
        defaultBuilder.builders.includes(DEFAULT_HEROKU_STACK)
      ) {
        detectedBuilder = DEFAULT_HEROKU_STACK;
      } else {
        detectedBuilder = defaultBuilder.builders[0];
      }

      setValue("app.build.builder", detectedBuilder);
      // set buildpacks as well
      replace(
        defaultBuilder.detected.map((bp) => ({
          name: bp.name,
          buildpack: bp.buildpack,
        }))
      );
      // we only want to change the form values once
      setPopulateBuild(false);
    }
  }, [data]);

  return (
    <BuildpackConfigurationContainer>
      {!!build.builder && (
        <Controller
          control={control}
          name="app.build.builder"
          render={({ field: { onChange } }) => (
            <Select
              value={build.builder}
              width="300px"
              options={builderOptions}
              setValue={(val) => {
                onChange(val);
              }}
              label={"Builder"}
              labelColor="#DFDFE1"
            />
          )}
        />
      )}
      <Spacer y={0.5} />
      <Text>Buildpacks</Text>
      {build.buildpacks.length > 0 && (
        <>
          <Spacer y={0.5} />
          {populateBuildValuesOnceAfterDetection && (
            <>
              <Text color="helper">
                The following buildpacks were detected at your
                application&apos;s root path. You can also manually add, remove,
                or re-order buildpacks here.
              </Text>
              <Spacer y={0.5} />
            </>
          )}
          <BuildpackList
            build={build}
            availableBuildpacks={availableBuildpacks}
            setAvailableBuildpacks={setAvailableBuildpacks}
            showAvailableBuildpacks={false}
            isDetectingBuildpacks={iseDetectingBuildpacks}
            detectBuildpacksError={errorMessage}
            droppableId={"non-modal"}
          />
        </>
      )}
      {build.buildpacks.length === 0 && !errorMessage && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">
            No buildpacks have been specified. Click the button below to add
            buildpacks detected at your application&apos;s root path.
          </Text>
        </>
      )}
      {errorMessage && (
        <>
          <Spacer y={1} />
          <Error message={errorMessage} />
        </>
      )}
      <Spacer y={1} />
      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <I className="material-icons">add</I> Add buildpacks
      </Button>
      {isModalOpen && (
        <BuildpackConfigurationModal
          build={build}
          closeModal={() => {
            setIsModalOpen(false);
          }}
          availableBuildpacks={availableBuildpacks}
          setAvailableBuildpacks={setAvailableBuildpacks}
          isDetectingBuildpacks={iseDetectingBuildpacks}
          detectBuildpacksError={errorMessage}
        />
      )}
    </BuildpackConfigurationContainer>
  );
};

export default BuildpackSettings;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
`;
