'use client';

/**
 * A course's figure, for whichever course a slide's widget names. The same
 * course's figure stays mounted from slide to slide, told only its new step —
 * and whether the slide was come back to.
 */

import ElecFigure, { type ElecStep } from './elec/Figure';
import CompartmentalFigure, { type CompartmentalStep } from './compartmental/Figure';
import JaxleyFigure, { type JaxleyStep } from './jaxley/Figure';
import MtypesFigure, { type MtypeStep } from './mtypes/Figure';
import PhysicsFigure, { type PhysicsStep } from './physics/Figure';
import Physics2Figure, { type Physics2Step } from './physics2/Figure';
import PlatformFigure, { type PlatformStep } from './platform/Figure';
import PythonFigure, { type PythonStep } from './python/Figure';
import SdkFigure, { type SdkStep } from './sdk/Figure';
import TmFigure, { type TmStep } from './tm/Figure';
import TransmittersFigure, { type TransmitterStep } from './transmitters/Figure';
import ValidationFigure, { type ValidationStep } from './validation/Figure';

import type { CourseWidget } from './registry';

export default function CourseFigure({
  widget,
  back = false,
}: {
  widget: CourseWidget;
  back?: boolean;
}) {
  const [course, step] = widget.split(':');
  switch (course) {
    case 'python':
      return <PythonFigure step={step as PythonStep} back={back} />;
    case 'physics2':
      return <Physics2Figure step={step as Physics2Step} back={back} />;
    case 'sdk':
      return <SdkFigure step={step as SdkStep} back={back} />;
    case 'physics':
      return <PhysicsFigure step={step as PhysicsStep} back={back} />;
    case 'jaxley':
      return <JaxleyFigure step={step as JaxleyStep} back={back} />;
    case 'platform':
      return <PlatformFigure step={step as PlatformStep} back={back} />;
    case 'elec':
      return <ElecFigure step={step as ElecStep} back={back} />;
    case 'transmitters':
      return <TransmittersFigure step={step as TransmitterStep} back={back} />;
    case 'validation':
      return <ValidationFigure step={step as ValidationStep} back={back} />;
    case 'mtypes':
      return <MtypesFigure step={step as MtypeStep} back={back} />;
    case 'compartmental':
      return <CompartmentalFigure step={step as CompartmentalStep} back={back} />;
    case 'tm':
      return <TmFigure step={step as TmStep} back={back} />;
    default:
      return null;
  }
}
