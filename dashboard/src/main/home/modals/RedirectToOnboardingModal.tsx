import React, { useContext } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import Helper from "components/form-components/Helper";

import { Context } from "shared/Context";


const RedirectToOnboardingModal = () => {
  const { setCurrentModal } = useContext(Context);

  return (
    <>
      <Helper>
        You need to complete the onboarding process in order to use Porter.
      </Helper>
      <ContinueButton
        as={Link}
        to="/onboarding"
        onClick={() => {
          setCurrentModal(null, null);
        }}
      >
        <i className="material-icons">east</i>
        Continue Setup
      </ContinueButton>
    </>
  );
};

export default RedirectToOnboardingModal;

const ContinueButton = styled.a`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 15px 7px 15px;
  text-align: left;
  border: 0;
  margin-top: 25px;
  width: 160px;
  border-radius: 5px;
  background: #616feecc;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: brightness(120%);
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 7px;
    margin-left: -5px;
    justify-content: center;
  }
`;
