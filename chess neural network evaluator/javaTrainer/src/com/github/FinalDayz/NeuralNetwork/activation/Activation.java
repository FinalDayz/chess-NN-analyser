package com.github.FinalDayz.NeuralNetwork.activation;


public interface Activation {

    public float[] activateValues(float[] valuesToActivate);

    public float[] derivativeValues(float[] values);
}
