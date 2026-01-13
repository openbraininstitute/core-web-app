# Small Microcircuit Simulation

Small microcircuit simulations allow you to simulate neural circuits containing multiple neurons. This feature uses a JSON schema-based configuration system to define simulation parameters and creates simulation campaigns that can run multiple related simulations.

## Overview

Small microcircuit simulations work with circuit models at the small microcircuit scale. The interface uses a three-column layout: configuration categories on the left, detailed configuration in the middle, and a model preview on the right.

## Getting Started

To create a small microcircuit simulation:

1. Navigate to **Workflows** in your project
2. Select **Simulate** from the workflow categories
3. Choose **Small Microcircuit** as the simulation type
4. Select a circuit model from your project or public data

The interface has two main tabs: **Configuration** and **Simulations**.

## Configuration Tab

The configuration tab uses a schema-driven interface organized into categories:

### Configuration Categories

Configuration options are grouped into categories displayed in the left column:

- Each category contains multiple configuration sections
- Sections are organized by type and purpose
- You can expand/collapse sections to focus on specific parameters

### Adding Configuration Elements

1. Select a configuration category from the left column
2. Click on a section to view its configuration options
3. To add a new element:
   - Click the "Add" button or select from available element types
   - Choose the element type from the available options
   - The system generates a unique name automatically (you can edit it)
   - Configure the element's parameters in the middle panel

### Editing Configuration

- **Select an element**: Click on an existing element in the left column to edit it
- **Modify parameters**: Use the form in the middle panel to change values
- **Delete elements**: Remove configuration elements you no longer need
- **Validation**: The interface validates your configuration and shows errors for invalid settings

### Configuration Schema

The configuration follows a JSON schema that defines:

- **Valid parameter types**: What types of values each parameter accepts
- **Required fields**: Which parameters must be set
- **Default values**: Pre-filled values you can modify
- **Constraints**: Valid ranges and relationships between parameters

The schema is generated from the circuit model, so available options depend on the specific model you're using.

### Model Preview

The right column shows a preview of your circuit model:

- Visual representation of the circuit structure
- Model metadata and properties
- Helps you understand what you're simulating

## Creating a Simulation Campaign

Once your configuration is complete:

1. Review all configuration sections to ensure they're correct
2. Check for validation errors (shown in red)
3. Click the **Generate Campaign** button (or similar action button)
4. The system validates your configuration against the schema
5. If valid, a simulation campaign is created and you receive a campaign ID
6. You can copy the campaign ID for reference

The campaign ID links your configuration to the simulations that will be generated.

## Simulations Tab

After creating a campaign, switch to the **Simulations** tab to:

### View Generated Simulations

- See all simulations that were created from your campaign configuration
- Each simulation represents one parameter combination from your configuration
- Simulations are listed with their status and metadata

### Simulation Status

Simulations can have different statuses:

- **Created**: Simulation has been created but not yet run
- **Running**: Simulation is currently executing
- **Completed**: Simulation finished successfully
- **Error**: Simulation encountered an error

### Running Simulations

1. **Select simulations**: Check the boxes next to simulations you want to run
2. **Run selected**: Click the run button to execute selected simulations
3. **Monitor progress**: Watch simulation status updates in real-time
4. **View results**: Once complete, access simulation outputs and files

### Simulation Files

For each simulation, you can:

- **View available files**: See what output files the simulation generated
- **Preview files**: View file contents directly in the interface
- **Download files**: Export simulation results for analysis
- **File types**: Common outputs include voltage traces, spike times, connectivity data, and configuration files

### Execution Status

The interface tracks execution status for each simulation:

- Status badges show current state (created, running, completed, error)
- Color-coded indicators for quick status identification
- Detailed status information on hover or click

## Configuration Workflow

The typical workflow is:

1. **Configure**: Set up all simulation parameters in the Configuration tab
   - Add and configure all necessary elements
   - Validate your configuration
   - Review the model preview

2. **Generate Campaign**: Create the simulation campaign
   - System validates configuration
   - Campaign ID is generated
   - Simulations are created based on parameter combinations

3. **Run Simulations**: Execute simulations in the Simulations tab
   - Select which simulations to run
   - Monitor execution status
   - Wait for completion

4. **Analyze Results**: Review simulation outputs
   - View files and data
   - Download results
   - Compare different simulations

## Tips

- **Start simple**: Begin with basic configurations to understand the schema structure
- **Check validation**: Always review validation errors before generating campaigns
- **Use preview**: The model preview helps you understand what you're configuring
- **Campaign ID**: Save your campaign ID to reference the configuration later
- **Batch runs**: You can run multiple simulations from the same campaign simultaneously
- **Schema understanding**: Familiarize yourself with the configuration schema for your specific circuit model
- **Incremental testing**: Test with small parameter ranges before running large simulation batches

## Differences from Single Neuron Simulations

Small microcircuit simulations differ from single neuron simulations in several ways:

- **Multi-neuron**: Simulates circuits with multiple neurons, not just one
- **Schema-based**: Uses JSON schema configuration instead of step-by-step forms
- **Campaign-based**: Creates campaigns that generate multiple related simulations
- **Batch execution**: Can run multiple simulations from one configuration
- **Circuit scale**: Works with circuit models at the small microcircuit scale
