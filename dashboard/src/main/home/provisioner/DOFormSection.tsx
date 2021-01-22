import React, { Component } from 'react';
import styled from 'styled-components';

import close from '../../../assets/close.png';
import { isAlphanumeric } from '../../../shared/common';
import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { ProjectType, InfraType } from '../../../shared/types';

import InputRow from '../../../components/values-form/InputRow';
import Helper from '../../../components/values-form/Helper';
import Heading from '../../../components/values-form/Heading';
import SaveButton from '../../../components/SaveButton';
import CheckboxList from '../../../components/values-form/CheckboxList';

type PropsType = {
  setSelectedProvisioner: (x: string | null) => void,
  handleError: () => void,
  projectName: string,
  infras: InfraType[],
};

type StateType = {
  selectedInfras: { value: string, label: string }[],
};

const provisionOptions = [
  { value: 'docr', label: 'Digital Ocean Container Registry' },
  { value: 'doks', label: 'Digital Ocean Kubernetes Service' },
];

// TODO: Consolidate across forms w/ HOC
export default class DOFormSection extends Component<PropsType, StateType> {
  state = {
    selectedInfras: [...provisionOptions],
  }

  componentDidMount = () => {
    let { infras } = this.props;
    let { selectedInfras } = this.state;

    if (infras) {
      
      // From the dashboard, only uncheck and disable if "creating" or "created"
      let filtered = selectedInfras;
      infras.forEach(
        (infra: InfraType, i: number) => {
          let { kind, status } = infra;
          if (status === 'creating' || status === 'created') {
            filtered = filtered.filter((item: any) => {
              return item.value !== kind;
            });
          }
        }
      );
      this.setState({ selectedInfras: filtered });
    }
  }

  checkFormDisabled = () => {
    let { 
      selectedInfras,
    } = this.state;
    let { projectName } = this.props;
    if (projectName || projectName === '') {
      return !isAlphanumeric(projectName) || selectedInfras.length === 0;
    } else {
      return selectedInfras.length === 0;
    }
  }

  // Step 1: Create a project
  createProject = (callback?: any) => {
    console.log('Creating project');
    let { projectName, handleError } = this.props;
    let { 
      user, 
      setProjects, 
      setCurrentProject, 
    } = this.context;

    api.createProject('<token>', { name: projectName }, {
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        handleError();
        return;
      } else {
        let proj = res.data;

        // Need to set project list for dropdown
        // TODO: consolidate into ProjectSection (case on exists in list on set)
        api.getProjects('<token>', {}, { 
          id: user.userId 
        }, (err: any, res: any) => {
          if (err) {
            console.log(err);
            handleError();
            return;
          }
          setProjects(res.data);
          setCurrentProject(proj);
          callback && callback();
        });
      }
    });
  }

  // TODO: handle generically (with > 2 steps)
  onCreateDO = () => {
    let { projectName } = this.props;
    let { selectedInfras } = this.state;
    let { currentProject } = this.context;

    if (!projectName) {
      window.location.href = `/api/oauth/projects/${currentProject.id}/digitalocean`;
    } else {
      this.createProject(() => {
        window.location.href = `/api/oauth/projects/${currentProject.id}/digitalocean`;
      });
    }
  }

  render() {
    let { setSelectedProvisioner } = this.props;
    let {
      selectedInfras,
    } = this.state;

    return (
      <StyledAWSFormSection>
        <FormSection>
          <CloseButton onClick={() => setSelectedProvisioner(null)}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Heading isAtTop={true}>DigitalOcean Resources</Heading>
          <Helper>Porter will provision the following DigitalOcean resources</Helper>
          <CheckboxList
            options={provisionOptions}
            selected={selectedInfras}
            setSelected={(x: { value: string, label: string }[]) => {
              this.setState({ selectedInfras: x });
            }}
          />
        </FormSection>
        {this.props.children ? this.props.children : <Padding />}
        <SaveButton
          text='Submit'
          disabled={this.checkFormDisabled()}
          onClick={this.onCreateDO}
          makeFlush={true}
          helper='Note: Provisioning can take up to 15 minutes'
        />
      </StyledAWSFormSection>
    );
  }
}

DOFormSection.contextType = Context;

const Padding = styled.div`
  height: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledAWSFormSection = styled.div`
  position: relative;
  padding-bottom: 35px;
`;

const FormSection = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  background: #26282f;
  border-radius: 5px;
  margin-bottom: 25px;
  padding: 25px;
  padding-bottom: 16px;
  font-size: 13px;
  animation: fadeIn 0.3s 0s;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const GuideButton = styled.a`
  display: flex;
  align-items: center;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: -1px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 6px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    color: #ffffff;
    border: 1px solid #ffffff;

    > i {
      color: #ffffff;
    }
  }

  > i {
    color: #aaaabb;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;