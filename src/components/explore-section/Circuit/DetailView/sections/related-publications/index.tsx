import { useMemo } from 'react';
import { CircuitSchemaProps, PaperLiteratureProps } from '../../../type';
import PublicationCard from '../../literature/PublicationCard';
import SubtitleBar from '../SubtitleBar';

export const placeholderLiteratureContent = [
  {
    title:
      'Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia',
    authors: ['S. Z. Meng', 'S. Takashima', 'K. Deguchi', 'Y. Arai'],
    link: 'https://pubmed.ncbi.nlm.nih.gov/9408595/',
    doi: {
      name: '10.1016/s0387-7604(97)00068-5',
      url: 'https://doi.org/10.1016/s0387-7604(97)00068-5',
    },
    institution: 'National Institute of Neuroscience',
    publicationDate: '1997-11-01',
    abstract:
      'The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.',
  },
  {
    title:
      'Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia',
    authors: ['S. Z. Meng', 'S. Takashima', 'K. Deguchi', 'Y. Arai'],
    link: 'https://pubmed.ncbi.nlm.nih.gov/9408595/',
    doi: {
      name: '10.1016/s0387-7604(97)00068-5',
      url: 'https://doi.org/10.1016/s0387-7604(97)00068-5',
    },
    institution: 'National Institute of Neuroscience',
    publicationDate: '1997-11-01',
    abstract:
      'The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.',
  },
  {
    title:
      'Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia',
    authors: ['S. Z. Meng', 'S. Takashima', 'K. Deguchi', 'Y. Arai'],
    link: 'https://pubmed.ncbi.nlm.nih.gov/9408595/',
    doi: {
      name: '10.1016/s0387-7604(97)00068-5',
      url: 'https://doi.org/10.1016/s0387-7604(97)00068-5',
    },
    institution: 'National Institute of Neuroscience',
    publicationDate: '1997-11-01',
    abstract:
      'The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.',
  },
  {
    title:
      'Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia',
    authors: ['S. Z. Meng', 'S. Takashima', 'K. Deguchi', 'Y. Arai'],
    link: 'https://pubmed.ncbi.nlm.nih.gov/9408595/',
    doi: {
      name: '10.1016/s0387-7604(97)00068-5',
      url: 'https://doi.org/10.1016/s0387-7604(97)00068-5',
    },
    institution: 'National Institute of Neuroscience',
    publicationDate: '1997-11-01',
    abstract:
      'The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.',
  },
  {
    title:
      'Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia',
    authors: ['S. Z. Meng', 'S. Takashima', 'K. Deguchi', 'Y. Arai'],
    link: 'https://pubmed.ncbi.nlm.nih.gov/9408595/',
    doi: {
      name: '10.1016/s0387-7604(97)00068-5',
      url: 'https://doi.org/10.1016/s0387-7604(97)00068-5',
    },
    institution: 'National Institute of Neuroscience',
    publicationDate: '1997-11-01',
    abstract:
      'The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.',
  },
];

export default function RelatedPublicationssSection({ content }: { content: CircuitSchemaProps }) {
  const CIRCUIT_PROVENANCE_LITERATURE = useMemo(
    () =>
      content.literature.filter(
        (publication: PaperLiteratureProps) => publication.category === 'circuit_source'
      ),
    [content.literature]
  );

  const CIRCUIT_APPLICATION_LITERATURE = useMemo(
    () =>
      content.literature.filter(
        (publication: PaperLiteratureProps) => publication.category === 'application'
      ),
    [content.literature]
  );

  return (
    <div className="relative flex w-full flex-col">
      <SubtitleBar title="Source" />
      <div className="relative flex w-full flex-col gap-y-12">
        {CIRCUIT_PROVENANCE_LITERATURE.map((publication: PaperLiteratureProps, index: number) => (
          <PublicationCard
            key={`Publication_${publication.doi}`}
            content={publication}
            index={index}
          />
        ))}
      </div>
      <SubtitleBar title="Applications" />
      <div className="relative flex w-full flex-col gap-y-12">
        {CIRCUIT_APPLICATION_LITERATURE.map((publication: PaperLiteratureProps, index: number) => (
          <PublicationCard
            key={`Publication_${publication.doi}`}
            content={publication}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
