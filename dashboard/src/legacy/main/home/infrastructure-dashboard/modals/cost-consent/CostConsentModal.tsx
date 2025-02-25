import React, { useState } from "react";
import Button from "legacy/components/porter/Button";
import Input from "legacy/components/porter/Input";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import { type ClientCloudProvider } from "legacy/lib/clusters/types";
import { match } from "ts-pattern";

import AWSCostConsentModalContents from "./AWSCostConsentModalContents";
import AzureCostConsentModalContents from "./AzureCostConsentModalContents";
import GCPCostConsentModalContents from "./GCPCostConsentModalContents";

type Props = {
  onClose: () => void;
  onComplete: () => void;
  cloudProvider: ClientCloudProvider;
};

const AWSCostConsentModal: React.FC<Props> = ({
  onClose,
  onComplete,
  cloudProvider,
}) => {
  const [confirmCost, setConfirmCost] = useState<string>("");

  return (
    <>
      <Modal closeModal={onClose}>
        {match(cloudProvider)
          .with({ name: "AWS" }, () => (
            <AWSCostConsentModalContents baseCost={cloudProvider.baseCost} />
          ))
          .with({ name: "GCP" }, () => (
            <GCPCostConsentModalContents baseCost={cloudProvider.baseCost} />
          ))
          .with({ name: "Azure" }, () => (
            <AzureCostConsentModalContents baseCost={cloudProvider.baseCost} />
          ))
          .otherwise(() => null)}
        <Spacer y={1} />
        <Input
          placeholder={cloudProvider.baseCost.toString()}
          value={confirmCost}
          setValue={setConfirmCost}
          width="100%"
          height="40px"
        />
        <Spacer y={1} />
        <Button
          disabled={confirmCost !== cloudProvider.baseCost.toString()}
          onClick={onComplete}
        >
          Continue
        </Button>
      </Modal>
    </>
  );
};

export default AWSCostConsentModal;
