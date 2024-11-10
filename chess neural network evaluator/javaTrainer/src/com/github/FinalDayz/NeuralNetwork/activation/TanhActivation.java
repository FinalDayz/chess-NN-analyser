package com.github.FinalDayz.NeuralNetwork.activation;

import com.github.FinalDayz.NeuralNetwork.Layer;

public class TanhActivation extends DefaultActivation{

    protected float activateValue(float input) {
        return (float) Math.tanh(input);
    }

    @Override
    protected float derivativeValue(float input) {
        return 1 - input * input;
    }
}
