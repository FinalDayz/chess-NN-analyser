package com.github.FinalDayz.NeuralNetwork.activation;


public class LeakyReLuActivation extends DefaultActivation {

    protected float activateValue(float input) {
        return (float) Math.max(input * 0.01, input);
    }

    @Override
    protected float derivativeValue(float input) {
        return input > 0 ? 1 : 0.01f;
    }
}
