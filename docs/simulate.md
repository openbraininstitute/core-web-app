# Single Neuron Simulation

Single neuron simulations allow you to simulate the electrical behavior of individual neurons using multi-compartment neuron models (ME-models). This feature enables you to test how neurons respond to different stimulation protocols and experimental conditions.

## Overview

Single neuron simulations use ME-models (multi-compartment electrical models) that represent neurons with detailed morphological and electrical properties. You can configure various aspects of the simulation including stimulation protocols, recording locations, and experimental parameters.

## Getting Started

To create a single neuron simulation:

1. Navigate to **Workflows** in your project
2. Select **Simulate** from the workflow categories
3. Choose **Single Neuron** as the simulation type
4. Select an ME-model from your project or public data

Once you've selected a model, you'll be taken to the simulation configuration interface.

## Configuration Steps

The simulation configuration is organized into several steps that you can navigate through using the menu on the left side:

### Overview

The overview step displays basic information about the simulation setup. Here you can review the model you've selected and see a summary of your configuration.

### Experimental Setup

Configure the temporal parameters of your simulation:

- **Maximum time**: The total duration of the simulation
- **Time step**: The resolution of the simulation (smaller values provide more detail but require more computation)

These parameters determine how long the simulation runs and at what temporal resolution the neuron's behavior is calculated.

### Stimulation Protocol

Define how you will stimulate the neuron:

- **Stimulation protocol**: Choose from available protocols that define the pattern of current injection
- **Amplitudes**: Set the amplitude(s) of the current injection
- **Injection location**: Select where on the neuron morphology the current will be injected

You can visualize the stimulation protocol before running the simulation to ensure it matches your experimental design.

### Synaptic Inputs

For synaptome simulations, configure synaptic inputs:

- **Synaptic locations**: Define where synapses are located on the neuron
- **Frequency inputs**: Set the frequency of synaptic activation
- **Synaptic properties**: Configure the properties of individual synapses

This step allows you to simulate how the neuron responds to synaptic input from other neurons.

### Recording

Specify where you want to record the neuron's electrical activity:

- **Recording locations**: Select one or more locations on the neuron where you want to record voltage or current
- **Recording type**: Choose what to record (e.g., membrane potential, currents)

You can add multiple recording locations to capture activity at different parts of the neuron simultaneously.

## 3D Neuron Visualization

The interface includes an interactive 3D visualization of the neuron morphology. You can:

- **View the neuron structure**: See the full morphology of the neuron model
- **Select locations**: Click on the neuron to select injection and recording locations
- **Navigate the morphology**: Rotate, zoom, and pan to explore the neuron structure

The visualization helps you understand the spatial relationships in the neuron and ensures you're placing injections and recordings in the desired locations.

## Running Simulations

Once you've configured all the parameters:

1. Review your configuration in each step to ensure everything is correct
2. Click the **Run Simulation** button
3. The simulation will be submitted and processed
4. You can monitor the simulation status
5. Once complete, results will be displayed in the Results panel

The simulation may take some time depending on the complexity of your configuration, the duration of the simulation, and the number of recording locations.

## Viewing Results

After the simulation completes, you can:

- **View plots**: See graphical representations of the recorded electrical activity
- **Analyze responses**: Examine how the neuron responded to your stimulation protocol
- **Compare configurations**: Review different parameter combinations if you ran multiple simulations
- **Download data**: Export simulation results for further analysis

The results show the electrical activity at your specified recording locations over the duration of the simulation.

## Tips

- **Start simple**: Begin with basic stimulation protocols and single recording locations to understand the workflow
- **Check resource usage**: The platform will warn you if your simulation configuration requires significant computational resources
- **Visualize first**: Use the stimulation protocol preview to verify your configuration before running
- **Multiple recordings**: Add several recording locations to capture activity across different parts of the neuron
- **Time parameters**: Balance simulation duration and time step based on your computational resources and the level of detail needed

## Integration with Other Features

Single neuron simulations integrate with other platform features:

- **Models**: Use ME-models from your project or browse public models
- **Data exploration**: Compare simulation results with experimental data
- **Notebooks**: Export results to notebooks for custom analysis
- **Reports**: Include simulations in your project reports

Single neuron simulations are a powerful tool for understanding neuronal behavior and testing hypotheses about how individual neurons respond to different inputs and conditions.
