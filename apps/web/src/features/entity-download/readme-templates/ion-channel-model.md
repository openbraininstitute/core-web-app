# README

Date: ${ date }
Downloaded by: ${ username }
Copyright (c) ${ year } Open Brain Institute

## Description

The Ion Channel Model was downloaded from the Open Brain Platform: https://www.openbraininstitute.org/. The folder contains NEURON simulator mod file which has the implementation of the ion channel. You can find more details to understand the file [here](https://nrn.readthedocs.io/en/latest/nmodl/language/nmodl_neuron_extension.html)

## Requirements

The software requirements to work with this artifact are given below:

- Python Version: ">=3.10"
- Python Packages and their Versions: neuron>=8.0

## Steps to Use the modl

1. Get the SUFFIX name of the ion channel model from the mod file. It is the name after the SUFFIX keyword.

```
NEURON{
   SUFFIX name
```

2. Use the suffix name to create a channel object in NEURON.
3. The example below shows how to use the ion channel model to simulate a voltage clamp experiment.

```python
from neuron import h

# create a single-compartment cell to use the ion channel model
soma = h.Section("soma")
# insert ion channel
soma.insert(h.name) # replace name by SUFFIX name
# create an SEClamp object (to do a voltaga clamp experiment) and insert it to the centre of the soma
stim = h.SEClamp(soma(0.5))

# Create vectors for recording the voltage and time.
t = h.Vector()
v = h.Vector()
t.record(h._ref_t)
v.record(soma(0.5)._ref_v)

# set the parameters of the SEClamp object.
# These values should be changed based on the channel used and experiment conditions

# Duration of different voltage clamp levels
stim.dur1 = 50
stim.dur2 = 100
stim.dur3 = 50

# Amplitude of different voltage clamp levels
stim.amp1 = -80
stim.amp2 = 0
stim.amp3 = -80

h.tstop = stim.dur1 + stim.dur2 + stim.dur3

h.run()

#plot the results
import matplotlib.pyplot as plt
plt.plot(t, v)
plt.xlabel("Time (ms)")
plt.ylabel("Voltage (mV)")
plt.show()

```
