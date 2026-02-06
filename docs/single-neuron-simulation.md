---
tags:
  - single-cell-simulation
---

# Single Neuron Simulation

Single neuron simulations allow you to simulate the electrical behavior of individual neurons using ME-models (multi-compartment electrical models). You can test how neurons respond to different stimulation protocols and record their electrical activity at various locations.

## Getting Started

To create a single neuron simulation:

1. Navigate to **Workflows** in your project
2. Select **Simulate** from the workflow categories
3. Choose **Single Neuron** as the simulation type
4. Select an ME-model from your project or public data

The simulation interface is divided into two main panels: a configuration panel on the left and a results panel that you can switch to after running simulations.

## Configuration Steps

The configuration is organized into steps accessible through the left menu:

### Info

Set basic information about your simulation:

- **Name**: A unique name for your simulation (required). The platform checks if the name already exists in your simulations and warns you if it does.
- **Description**: Optional description of your simulation
- **Registered by**: Automatically set to your username
- **Registered at**: Automatically set to the current date

### Experimental Setup

Configure the temporal and environmental parameters:

- **Maximum time**: Total duration of the simulation in milliseconds (default: 2000 ms)
- **Time step**: Temporal resolution of the simulation in milliseconds (default: 0.05 ms). Smaller values provide more detail but require more computation.
- **Temperature (Celsius)**: Simulation temperature (default: 34°C)
- **Initial voltage (vinit)**: Starting membrane potential in millivolts (default: -80 mV)
- **Hyperpolarization amplitude (hypamp)**: Hyperpolarization current amplitude (default: 0)
- **Seed**: Random seed for stochastic processes (default: 100)

### Stimulation Protocol

Define how you will inject current into the neuron:

- **Injection location**: Select the neuron section where current will be injected (e.g., `soma[0]`, `dend[0]`, `apic[0]`). You can select this in the 3D visualization.
- **Stimulus type**: Choose `current_clamp` for current injection
- **Stimulus protocol**: Select from available protocols:
  - **Step (Suprathreshold)** (`idrest`): Sequence of depolarizing square pulses to get maximum action potentials and determine firing properties. Default: delay 250ms, duration 1350ms, stop time 1850ms.
  - **AP_WAVEFORM** (`ap_waveform`): Used to check precise AP waveform with 1-2 APs. Default: delay 250ms, duration 50ms, stop time 550ms.
  - **Step (Subthreshold)** (`iv`): Sequence of current steps from hyperpolarization to small depolarization to check passive properties and input resistance. Default: delay 250ms, duration 3000ms, stop time 3500ms.
  - **Step (Fire Pattern)** (`fire_pattern`): Long-duration, small and high suprathreshold currents to check electrical firing type. Default: delay 250ms, duration 3600ms, stop time 4100ms.
- **Amplitudes**: Set one or multiple current amplitudes in nanoamperes. You can configure a range of amplitudes, and the platform will show a preview of the stimulation protocol.

### Synaptic Inputs (Synaptome Simulations Only)

For single neuron synaptome simulations, configure synaptic inputs:

- **Synaptic locations**: Define where synapses are located on the neuron morphology
- **Frequency inputs**: Set the frequency of synaptic activation for each synaptic input
- **Synaptic properties**: Configure individual synapse parameters

This step only appears when simulating a single neuron synaptome model.

### Recording

Specify where to record the neuron's electrical activity:

- **Recording locations**: Add one or more locations on the neuron where you want to record
  - Select the section (e.g., `soma[0]`, `dend[0]`)
  - Set the offset along that section (0.0 to 1.0)
  - Choose whether to record currents (6 additional traces) or just voltage
- **Add recordings**: Click on the 3D neuron visualization to add recording locations, or use the form to specify them manually
- **Recording colors**: Each recording location is assigned a unique color for visualization

You can add multiple recording locations to capture activity at different parts of the neuron simultaneously.

## 3D Neuron Visualization

The interface includes an interactive 3D visualization of the neuron morphology:

- **View neuron structure**: See the full morphology with sections labeled (soma, dendrites, axon, etc.)
- **Select injection location**: Click on the neuron to select where current will be injected
- **Add recording locations**: Click on the neuron to add recording points
- **Navigate**: Rotate, zoom, and pan to explore the neuron structure
- **Toggle visualization**: Collapse or expand the 3D viewer to focus on configuration or visualization

The visualization helps you understand spatial relationships and ensures injections and recordings are placed correctly.

## Running Simulations

Once configured:

1. Review each step to ensure all parameters are correct
2. The platform validates your configuration and shows warnings for invalid settings
3. Click **Run Simulation** in the menu
4. The simulation status is displayed (launching, running, completed)
5. Once complete, switch to the **Results** panel to view outputs

The simulation may take time depending on:

- Simulation duration and time step
- Number of recording locations
- Number of current amplitudes
- Whether you're recording currents (adds 6x more data per location)

The platform warns you if your configuration will produce very large result files (>150 MB).

## Viewing Results

After completion, the Results panel shows:

- **Voltage traces**: Membrane potential over time at each recording location
- **Current traces**: If you enabled current recording, see the individual ionic currents
- **Multiple amplitudes**: If you configured multiple current amplitudes, see responses to each
- **Interactive plots**: Zoom, pan, and explore the simulation data
- **Download**: Export results for further analysis

Results are color-coded to match your recording location colors for easy identification.

## Simulation Types

You can run two types of single neuron simulations:

1. **Single Neuron**: Basic simulation with current injection and voltage/current recording
2. **Single Neuron Synaptome**: Includes synaptic inputs in addition to current injection, allowing you to study how the neuron responds to both direct stimulation and synaptic activity

## Tips

- **Start with defaults**: Use the default protocol settings to understand the workflow before customizing
- **Check resource usage**: The platform warns if your configuration requires significant computational resources
- **Preview stimulation**: Use the stimulation protocol preview to verify your current injection pattern
- **Multiple recordings**: Add several recording locations to capture activity across different neuron regions
- **Time parameters**: Balance simulation duration and time step based on your needs and available resources
- **Unique names**: Choose descriptive, unique names to avoid confusion with other simulations
