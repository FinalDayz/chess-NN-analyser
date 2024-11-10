package com.github.FinalDayz.NeuralNetwork.activation;

public class LiniarActivation extends DefaultActivation {
    @Override
    protected float activateValue(float input) {
        return input;
    }

    @Override
    protected float derivativeValue(float input) {
        return 1;
    }
}
