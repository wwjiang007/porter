import React, { useContext, useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";
import Tooltip from "components/porter/Tooltip";

import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";
import trash from "assets/trash.png";

import { useDatastoreContext } from "./DatabaseContextProvider";
import { DeleteDatastoreModal } from "./tabs/SettingsTab";
import EngineTag from "./tags/EngineTag";

const DatabaseHeader: React.FC = () => {
  const { datastore } = useDatastoreContext();

  const [showDeleteDatastoreModal, setShowDeleteDatastoreModal] =
    useState(false);
  const { user } = useContext(Context);

  return (
    <>
      <Container row style={{ width: "100%" }}>
        <Container row spaced style={{ width: "100%" }}>
          <Container row>
            <Icon src={datastore.template.icon} height={"25px"} />
            <Spacer inline x={1} />
            <Text size={21}>{datastore.name}</Text>
            <Spacer inline x={1} />
            <Container row>
              <EngineTag engine={datastore.template.engine} heightPixels={15} />
            </Container>
            {user?.isPorterUser && (
              <>
                <Spacer inline x={1} />
                <Tooltip
                  content={
                    <Text>
                      Delete this datastore and all of its resources (only
                      visible to Porter operators).
                    </Text>
                  }
                  position={"right"}
                >
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setShowDeleteDatastoreModal(true);
                    }}
                  >
                    <Icon src={trash} height={"15px"} />
                  </div>
                </Tooltip>
              </>
            )}
          </Container>
          {match(datastore.status)
            .with("AVAILABLE", () => (
              <Container row>
                <StatusDot status={"available"} heightPixels={11} />
              </Container>
            ))
            .otherwise(() => (
              <Container row>
                <StatusDot status={"pending"} heightPixels={11} />
              </Container>
            ))}
        </Container>
      </Container>
      <Spacer y={0.5} />
      <CreatedAtContainer>
        <div style={{ flexShrink: 0 }}>
          <Text color="#aaaabb66">
            Created {readableDate(datastore.created_at)}
          </Text>
        </div>
        <Spacer y={0.5} />
      </CreatedAtContainer>
      {showDeleteDatastoreModal && (
        <DeleteDatastoreModal
          onClose={() => {
            setShowDeleteDatastoreModal(false);
          }}
        />
      )}
    </>
  );
};

export default DatabaseHeader;

const CreatedAtContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;
