# README

Date: ${ date }
Downloaded by: ${ username }
Copyright (c) ${ year } Open Brain Institute

## Description

The Extracellular recording array was downloaded from the Open Brain Platform: https://www.openbraininstitute.org/.

The archive contains:

- electrode_array.png — visualization of the electrode array placement
- electrode_locations.json — electrode coordinates
- weights.h5 — electrode array weight matrix
- metadata describing the recording array and its source circuit

## Requirements

The weight matrix is stored as HDF5 (.h5). Use an HDF5-compatible library (for example h5py in Python) to inspect it.
