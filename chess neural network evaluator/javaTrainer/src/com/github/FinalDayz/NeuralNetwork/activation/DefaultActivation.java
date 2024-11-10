package com.github.FinalDayz.NeuralNetwork.activation;

import com.github.FinalDayz.NeuralNetwork.Layer;

public abstract class DefaultActivation implements Activation {
    @Override
    public float[] activateValues(float[] valuesToActivate) {
        float[] activatedValues = new float[valuesToActivate.length];

        for(int index = 0; index < valuesToActivate.length; index++) {
            activatedValues[index] = activateValue(valuesToActivate[index]);
        }

        return activatedValues;
    }

    @Override
    public float[] derivativeValues(float[] values) {
        float[] newDerivatives = new float[values.length];
        for(int index = 0; index < newDerivatives.length; index++) {
            newDerivatives[index] = derivativeValue(values[index]);
        }
        return newDerivatives;
    }

    protected abstract float activateValue(float input);

    protected abstract float derivativeValue(float input);
}
