import { ReactNode } from "react";
import { SingleCircuitListView } from "../content/CIRCUITS_PLACEHOLDER";

export type CircuitCellValue = {
  name: string;
  description: "string";
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
}

export type CircuitColumn = {
    title: string;
    key?: string;
    render?: (value: SingleCircuitListView) => ReactNode;
  };