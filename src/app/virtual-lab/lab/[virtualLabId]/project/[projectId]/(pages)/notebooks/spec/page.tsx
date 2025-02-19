export default function NotebookSpec() {
  return (
    <div className="px-6">
      <h1 className="mb-4 text-2xl font-bold">OBI Notebook Repository Structure</h1>

      <p className="mb-4">
        This document describes the structure of Jupyter notebooks to be used in an OBI virtual lab
        and of code repositories containing them. In case of questions, it may be helpful to visit
        the{' '}
        <a
          href="https://github.com/openbraininstitute/obi_platform_analysis_notebooks/tree/main"
          className="underline"
        >
          repository of official OBI notebooks
        </a>{' '}
        that adheres to these specifications.
      </p>

      <h2 className="mb-2 mt-6 text-xl font-semibold">Repository Structure</h2>
      <p className="mb-4">A notebook repository contains any number of the following folders:</p>

      <ul className="mb-4 list-disc pl-6">
        <li>Metabolism</li>
        <li>Cellular</li>
        <li>Circuit</li>
        <li>System</li>
      </ul>

      <p className="mb-4">
        The folders denote the scientific scale the notebooks are to be used for, e.g., subcellular
        and cellular metabolism, single (or paired) cell activity, microcircuit activity, or the
        systems level. If no notebooks of a given level exist in a repository, the corresponding
        folder does not have to exist.
      </p>

      <p className="mb-4">
        Within these folders, any number of notebooks can be added, but each in its individual
        subfolder. That subfolder can have any name, but by convention, it should provide an idea of
        the purpose of the notebook and be all lowercase with underscores separating words.
      </p>

      <p className="mb-4">Within the subfolder, three files are required:</p>

      <ul className="mb-4 list-disc pl-6">
        <li>
          <strong>README.md:</strong> A file that provides information about the purpose of the
          notebook and how it is used.
        </li>
        <li>
          <strong>analysis_notebook.ipynb:</strong> The notebook itself. Note that it must have that
          specific name.
        </li>
        <li>
          <strong>analysis_info.json:</strong> A JSON file that provides technical information about
          the notebook and how it is to be displayed in your virtual lab.
        </li>
      </ul>

      <h2 className="mb-2 mt-6 text-xl font-semibold">Notebook Info</h2>
      <p className="mb-4">
        The <code>analysis_info.json</code> must contain the following keys:
      </p>

      <ul className="mb-4 list-disc pl-6">
        <li>
          <strong>name:</strong> Descriptive name, ideally 3-6 words with the first letter
          capitalized and the rest lowercase, except in special cases.
        </li>
        <li>
          <strong>scale:</strong> The scale of the analysis. This is the same as the root folder the
          notebook is in (Metabolism, Cellular, etc.), but all lowercase.
        </li>
        <li>
          <strong>authors:</strong> List of authors, e.g.,{' '}
          <code>[&quot;OBI&quot;, &quot;Another Name&quot;]</code>.
        </li>
        <li>
          <strong>description:</strong> A brief description of the notebook. Will be used to
          describe the notebook in your virtual lab.
        </li>
        <li>
          <strong>type:</strong> Value is always <code>&quot;notebook&quot;</code>. In the future,
          other types may be supported.
        </li>
        <li>
          <strong>kernel (optional):</strong> The language of the kernel to run the notebook. If not
          provided, <code>&quot;python&quot;</code> is assumed.
        </li>
        <li>
          <strong>requirements:</strong> A list of strings. Each string specifies a package and
          version requirement, like a <code>requirements.txt</code> file.
        </li>
        <li>
          <strong>input:</strong> The expected inputs into the analysis performed in the notebook.
        </li>
      </ul>

      <p className="mb-4">Each input is specified with the following keys:</p>

      <ul className="mb-4 list-disc pl-6">
        <li>
          <strong>class:</strong> Value is one of <code>&quot;list&quot;</code> or{' '}
          <code>&quot;single&quot;</code>.
        </li>
        <li>
          <strong>data_type:</strong> Specifies what type of artefact that can be analyzed,
          structured as a dictionary with two keys:
          <ul className="list-disc pl-6">
            <li>
              <strong>artefact:</strong> The type of artefact.
            </li>
            <li>
              <strong>required_properties:</strong> A list of additional key-value pairs, e.g.,{' '}
              <code>{'{ "synapse_class": "excitatory" }'}</code>.
            </li>
          </ul>
        </li>
      </ul>

      <h2 className="mb-2 mt-6 text-xl font-semibold">Notebook Contents</h2>
      <p className="mb-4">
        A notebook can contain virtually any analysis. It is expected to begin by loading in the
        artefact(s) it is analyzing.
      </p>

      <h2 className="mb-2 mt-6 text-xl font-semibold">List of Artefact Types</h2>
      <ul className="mb-4 list-disc pl-6">
        <li>
          <strong>morphology:</strong> A reconstructed morphology. Formats: <code>.h5</code>,{' '}
          <code>.swc</code>, <code>.asc</code>.
        </li>
        <li>
          <strong>Single cell ephys:</strong> Experimental single cell recording in{' '}
          <code>.nsb</code> format.
        </li>
        <li>
          <strong>Single cell simulation:</strong> The result of a platform simulation of a single
          or paired neuron.
        </li>
        <li>
          <strong>Ion channel model:</strong> A computational model of ion channel kinetics.
        </li>
        <li>
          <strong>me-model:</strong> A computational model of a single cell with morphology and
          electrophysiology.
        </li>
        <li>
          <strong>Neuron density atlas:</strong> A voxel atlas of neuron densities for a given type
          of neuron. Format: <code>.nrrd</code>.
        </li>
        <li>
          <strong>Circuit:</strong> A SONATA formatted circuit model.
        </li>
        <li>
          <strong>Annotation atlas:</strong> A voxel atlas that assigns region IDs to each voxel.
        </li>
        <li>
          <strong>ConnectivityMatrix:</strong> The adjacency matrix of a circuit at cellular
          resolution. Format: <code>.h5</code>.
        </li>
        <li>
          <strong>emodel:</strong> A model describing the distribution of ion channels over the
          membrane of a neuron.
        </li>
        <li>
          <strong>Circuit simulation:</strong> The result of a platform simulation of a circuit
          model.
        </li>
        <li>
          <strong>Circuit simulation campaign:</strong> As above, but for a full simulation
          campaign.
        </li>
      </ul>
    </div>
  );
}
