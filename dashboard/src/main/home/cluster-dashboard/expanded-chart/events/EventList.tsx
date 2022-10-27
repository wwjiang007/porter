import React, { useState, useEffect, useContext } from "react";
import { CellProps } from "react-table";

import styled from "styled-components";
import EventTable from "./EventTable";
import Loading from "components/Loading";
import danger from "assets/danger.svg";
import rocket from "assets/rocket.png";
import document from "assets/document.svg";
import info from "assets/info-outlined.svg";
import status from "assets/info-circle.svg";
import { readableDate, relativeDate } from "shared/string_utils";
import TitleSection from "components/TitleSection";
import api from "shared/api";
import Modal from "main/home/modals/Modal";
import time from "assets/time.svg";
import { Context } from "shared/Context";
import { InitLogData } from "../logs-section/LogsSection";
import { setServers } from "dns";

type Props = {
  filters: any;
  setLogData?: (logData: InitLogData) => void;
};

const EventList: React.FC<Props> = ({ filters, setLogData }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [events, setEvents] = useState([]);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [expandedIncidentEvents, setExpandedIncidentEvents] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refresh, setRefresh] = useState(true);

  useEffect(() => {
    if (!refresh) {
      return;
    }

    if (filters.job_name) {
      api
        .listPorterJobEvents("<token>", filters, {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        })
        .then((res) => {
          setEvents(res.data.events);
          setIsLoading(false);
          setRefresh(false);
        });
    } else {
      api
        .listPorterEvents("<token>", filters, {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        })
        .then((res) => {
          setEvents(res.data.events);
          setIsLoading(false);
          setRefresh(false);
        });
    }
  }, [refresh]);

  useEffect(() => {
    if (!expandedEvent) {
      return;
    }

    api
      .getIncidentEvents(
        "<token>",
        {
          incident_id: expandedEvent.id,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        setExpandedIncidentEvents(res.data.events);
      });
  }, [expandedEvent]);

  const redirectToLogs = (incident: any) => {
    api
      .getIncidentEvents(
        "<token>",
        {
          incident_id: incident.id,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        const podName = res.data?.events[0]?.pod_name;
        const timestamp = res.data?.events[0]?.last_seen;
        const revision = res.data?.events[0]?.revision;

        setLogData({
          podName,
          timestamp,
          revision,
        });
      });
  };

  const renderExpandedEventMessage = () => {
    if (!expandedIncidentEvents) {
      return <Loading />;
    }

    return (
      <Message>
        <img src={document} />
        {expandedIncidentEvents[0].detail}
      </Message>
    );
  };

  const renderIncidentSummaryCell = (incident: any) => {
    return (
      <NameWrapper>
        <AlertIcon src={danger} />
        {incident.short_summary}
        {incident.severity === "normal" ? (
          <></>
        ) : (
          <Status color="#cc3d42">Critical</Status>
        )}
      </NameWrapper>
    );
  };

  const renderDeploymentFinishedCell = (release: any) => {
    return (
      <NameWrapper>
        <AlertIcon src={rocket} />
        Revision {release.revision} was successfully deployed
      </NameWrapper>
    );
  };

  const renderJobStartedCell = (timestamp: any) => {
    return (
      <NameWrapper>
        <AlertIcon src={time} />
        The job started at {readableDate(timestamp)}
      </NameWrapper>
    );
  };

  const renderJobFinishedCell = (timestamp: any) => {
    return (
      <NameWrapper>
        <AlertIcon src={time} />
        The job finished at {readableDate(timestamp)}
      </NameWrapper>
    );
  };

  const columns = React.useMemo(
    () => [
      {
        Header: "Monitors",
        columns: [
          {
            Header: "Description",
            accessor: "type",
            width: 500,
            Cell: ({ row }: CellProps<any>) => {
              if (row.original.type == "incident") {
                return renderIncidentSummaryCell(row.original.data);
              } else if (row.original.type == "deployment_finished") {
                return renderDeploymentFinishedCell(row.original.data);
              } else if (row.original.type == "job_started") {
                return renderJobStartedCell(row.original.timestamp);
              } else if (row.original.type == "job_finished") {
                return renderJobFinishedCell(row.original.timestamp);
              }

              return null;
            },
          },
          {
            Header: "Last Seen",
            accessor: "timestamp",
            width: 140,
            Cell: ({ row }: CellProps<any>) => {
              return <Flex>{relativeDate(row.original.timestamp)}</Flex>;
            },
          },
          {
            id: "details",
            accessor: "",
            width: 20,
            Cell: ({ row }: CellProps<any>) => {
              if (row.original.type == "incident") {
                return (
                  <TableButton
                    onClick={() => {
                      setExpandedEvent(row.original.data);
                    }}
                  >
                    <Icon src={info} />
                    Details
                  </TableButton>
                );
              }

              return null;
            },
          },
          {
            id: "logs",
            accessor: "",
            width: 30,
            Cell: ({ row }: CellProps<any>) => {
              if (row.original.type != "incident") {
                return null;
              }

              if (!row.original.data.should_view_logs) {
                return null;
              }

              return (
                <TableButton
                  width="102px"
                  onClick={() => {
                    redirectToLogs(row.original.data);
                  }}
                >
                  <Icon src={document} />
                  View logs
                </TableButton>
              );
            },
          },
        ],
      },
    ],
    []
  );

  return (
    <>
      {expandedEvent && (
        <Modal onRequestClose={() => setExpandedEvent(null)} height="auto">
          <TitleSection icon={danger}>
            <Text>{expandedEvent.release_name}</Text>
          </TitleSection>
          <InfoRow>
            <InfoTab>
              <img src={time} /> <Bold>Last updated:</Bold>
              {readableDate(expandedEvent.updated_at)}
            </InfoTab>
            <InfoTab>
              <img src={info} /> <Bold>Status:</Bold>
              <Capitalize>{expandedEvent.status}</Capitalize>
            </InfoTab>
            <InfoTab>
              <img src={status} /> <Bold>Priority:</Bold>{" "}
              <Capitalize>{expandedEvent.severity}</Capitalize>
            </InfoTab>
          </InfoRow>
          {expandedEvent?.porter_doc_link && (
            <DocsLink target="_blank" href={expandedEvent?.porter_doc_link}>
              View troubleshooting steps{" "}
              <i className="material-icons">open_in_new</i>{" "}
            </DocsLink>
          )}
          {renderExpandedEventMessage()}
        </Modal>
      )}
      {isLoading ? (
        <LoadWrapper>
          <Loading />
        </LoadWrapper>
      ) : (
        <TableWrapper>
          <EventTable columns={columns} data={events} />
          <FlexRow>
            <Flex>
              <Button
                onClick={() => {
                  setIsLoading(true);
                  setRefresh(true);
                }}
              >
                <i className="material-icons">autorenew</i>
                Refresh
              </Button>
            </Flex>
          </FlexRow>
        </TableWrapper>
      )}
    </>
  );
};

export default EventList;

const Message = styled.div`
  padding: 20px;
  background: #26292e;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-size: 13px;
  display: flex;
  align-items: center;
  > img {
    width: 13px;
    margin-right: 20px;
  }
`;

const Capitalize = styled.div`
  text-transform: capitalize;
`;

const Bold = styled.div`
  font-weight: 500;
  margin-right: 5px;
`;

const InfoTab = styled.div`
  display: flex;
  align-items: center;
  opacity: 50%;
  font-size: 13px;
  margin-right: 15px;
  justify-content: center;

  > img {
    width: 13px;
    margin-right: 7px;
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 12px;
`;

const Text = styled.div`
  font-weight: 500;
  font-size: 18px;
  z-index: 999;
`;

const Icon = styled.img`
  width: 16px;
  margin-right: 6px;
`;

const TableButton = styled.div<{ width?: string }>`
  border-radius: 5px;
  height: 30px;
  color: white;
  width: ${(props) => props.width || "85px"};
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff11;
  border: 1px solid #aaaabb33;
  cursor: pointer;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const ClusterName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: blue;
  width: 100px;
`;

const Title = styled.div`
  font-size: 18px;
  margin-bottom: 10px;
  color: #ffffff;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 300px;
  color: #aaaabb55;
  display: flex;
  font-size: 14px;
  padding-right: 50px;
  align-items: center;
  justify-content: center;
`;

const ClusterIcon = styled.img`
  width: 14px;
  margin-right: 9px;
  opacity: 70%;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const AlertIcon = styled.img`
  width: 20px;
  margin-right: 15px;
  margin-left: 0px;
`;

const NameWrapper = styled.div`
  display: flex;
  align-items: center;
  color: white;
`;

const LoadWrapper = styled.div`
  width: 100%;
  height: 300px;
`;

const Status = styled.div<{ color: string }>`
  padding: 5px 7px;
  background: ${(props) => props.color};
  font-size: 12px;
  border-radius: 3px;
  word-break: keep-all;
  display: flex;
  color: white;
  margin-right: 50px;
  align-items: center;
  margin-left: 15px;
  justify-content: center;
  height: 20px;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
`;

const StyledMonitorList = styled.div`
  height: 200px;
  width: 100%;
  font-size: 13px;
  background: #ffffff11;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const NoResultsFoundWrapper = styled(Flex)`
  flex-direction: column;
  justify-contents: center;
`;

const Button = styled.div`
  background: #26292e;
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 10px;
  padding-left: 8px;
  > i {
    font-size: 16px;
    margin-right: 5px;
  }
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 20px;
`;

const DocsLink = styled.a`
  display: inline-block;
  color: #8590ff;
  border-bottom: 1px solid #8590ff;
  cursor: pointer;
  user-select: none;
  padding: 3px 0;
  margin-bottom: 18px;

  > i {
    font-size: 12px;
  }
`;