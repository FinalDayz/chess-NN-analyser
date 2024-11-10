package com.github.FinalDayz.NeuralNetwork.activation;

import com.github.FinalDayz.NeuralNetwork.Layer;

public class SigmoidActivation extends DefaultActivation {

    protected float activateValue(float input) {
        return (float) (1 / (1 + Math.exp(-input)));
    }

    @Override
    protected float derivativeValue(float input) {
        return input * ( 1 - input);
    }
}
