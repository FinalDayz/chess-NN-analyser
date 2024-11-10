package com.github.FinalDayz.NeuralNetwork;

import com.github.FinalDayz.NeuralNetwork.activation.Activation;

public class HiddenLayer extends WeightsLayer {

    public HiddenLayer(int size, Activation activation) {
        super(size, activation);
    }

    public String toString() {
        return "[HiddenLayer, size: " + this.size + "]";
    }
}
