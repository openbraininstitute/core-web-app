export const messages = {
  ResolveNWBFileFailed:
    'The nwb file $$ could not be validated. Please ensure it is a valid .nwb file.',
  ResolveNeuronFileFailed:
    'The neuron file $$ could not be validated. Please ensure it is a valid .swc, .asc, or .h5 file loadable by neurom.',
  ResolveMeshFileFailed:
    'The mesh file $$ could not be validated. Please ensure it is a valid .obj or .glb file.',
  MeshFileNotObj:
    'The file $$ does not look like an OBJ mesh: its first 64 KB hold no vertex ("v") line.',
  MeshConversionStarted:
    'Mesh uploaded. Converting it to GLB can take up to about 15 minutes. The mesh shows as Draft until it is ready, then Active; if the conversion fails, it shows as Disqualified.',
  MeshAboveViewerLimit:
    'This mesh has $$ triangles. The viewer shows meshes of up to about $$$ triangles, so it will be stored but not displayed.',
  FileSizeExceeded: 'File "$$" exceeds the maximum size of $$$.',
  FileNotAccepted: 'File "$$" is not an accepted file type.',
  MaxFilesExceeded: 'You can only upload a maximum of $$ files.',
  SomeFilesExceedMaxSize: 'Some files exceed the maximum size of $$.',
};
