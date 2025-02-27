import React, { useContext, useEffect, useState } from "react";
import refresh from "legacy/assets/refresh.png";
import Banner from "legacy/components/porter/Banner";
import Container from "legacy/components/porter/Container";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import styled from "styled-components";

import { Context } from "shared/Context";

import GithubActionModal from "../new-app-flow/GithubActionModal";

type Props = {
  pullRequestUrl: string;
  branchName: string;
  repoName: string;
  stackName: string;
  gitRepoId: number;
  porterYamlPath?: string;
};

const GHABanner: React.FC<Props> = ({
  pullRequestUrl,
  branchName,
  repoName,
  stackName,
  gitRepoId,
  porterYamlPath = "porter.yaml",
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [showGHAModal, setShowGHAModal] = useState(false);
  return (
    <>
      <StyledGHABanner>
        <>
          {pullRequestUrl ? (
            <Banner
              type="warning"
              suffix={
                <RefreshButton
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  <img src={refresh} /> Refresh
                </RefreshButton>
              }
            >
              Your application will not be available until you merge the Porter
              PR.
              <Spacer inline width="5px" />
              <Link to={pullRequestUrl} target="_blank" hasunderline>
                Merge PR
              </Link>
            </Banner>
          ) : (
            <Banner
              type="warning"
              suffix={
                <RefreshButton
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  <img src={refresh} /> Refresh
                </RefreshButton>
              }
            >
              Your application will not be available until you add the Porter
              workflow to your branch.
              <Spacer inline width="5px" />
              <Link
                onClick={() => {
                  setShowGHAModal(true);
                }}
                target="_blank"
                hasunderline
              >
                See details
              </Link>
            </Banner>
          )}
        </>
      </StyledGHABanner>
      {showGHAModal && (
        <GithubActionModal
          closeModal={() => {
            setShowGHAModal(false);
          }}
          githubAppInstallationID={gitRepoId}
          githubRepoOwner={repoName.split("/")[0]}
          githubRepoName={repoName.split("/")[1]}
          branch={branchName}
          stackName={stackName}
          projectId={currentProject.id}
          clusterId={currentCluster.id}
          porterYamlPath={porterYamlPath}
        />
      )}
    </>
  );
};

export default GHABanner;

const StyledGHABanner = styled.div``;

const RefreshButton = styled.div`
  color: #ffffff;
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    > img {
      opacity: 1;
    }
  }

  > img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 11px;
    margin-right: 10px;
  }
`;
