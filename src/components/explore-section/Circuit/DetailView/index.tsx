'use client'

import { SingleCircuitListView } from "../content/CIRCUITS_PLACEHOLDER";
import HeaderCircuitDetailView from "./modules/Header";

export default function CircuitDetailViewMain({
  content
}:{
  content: SingleCircuitListView;
}) {

  return (
    <div className="relative w-full min-h-[100vh] bg-white p-10">
        <HeaderCircuitDetailView content={content} />
        {content.name}
    </div>
  )
}