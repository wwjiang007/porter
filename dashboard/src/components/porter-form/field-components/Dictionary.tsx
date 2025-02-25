import React from "react";

import DictionaryEditor from "components/porter/DictionaryEditor";

import useFormField from "../hooks/useFormField";
import {
  type DictionaryField,
  type DictionaryFieldState,
  type GetFinalVariablesFunction,
} from "../types";
import { hasSetValue } from "../utils";

const Dictionary: React.FC<DictionaryField> = (props) => {
  const { state, variables, setVars, setValidation } =
    useFormField<DictionaryFieldState>(props.id, {
      initValidation: {
        validated: hasSetValue(props),
      },
      initVars: {
        [props.variable]: hasSetValue(props) ? props.value[0] : undefined,
      },
    });

  if (state == undefined) return <></>;

  return (
    <DictionaryEditor
      value={props?.value?.[0]}
      onChange={(x: any) => {
        setVars((vars) => {
          return {
            ...vars,
            [props.variable]: x,
          };
        });
        setValidation((prev) => {
          return {
            ...prev,
            validated: true,
          };
        });
      }}
    />
  );
};

export const getFinalVariablesForStringInput: GetFinalVariablesFunction = (
  vars,
  props: DictionaryField
) => {
  const val =
    vars[props.variable] != undefined && vars[props.variable] != null
      ? vars[props.variable]
      : hasSetValue(props)
      ? props.value[0]
      : undefined;

  return {
    [props.variable]:
      props.settings?.unit && !props.settings.omitUnitFromValue
        ? val + props.settings.unit
        : val,
  };
};

export default Dictionary;
