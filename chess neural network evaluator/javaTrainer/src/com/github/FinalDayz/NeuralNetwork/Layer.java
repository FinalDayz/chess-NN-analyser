package com.github.FinalDayz.NeuralNetwork;

import com.github.FinalDayz.NeuralNetwork.activation.Activation;

public abstract class Layer {

    protected float[] inputs;
    public final int size;
    protected Layer prefLayer;
    protected Layer nextLayer;
    protected float[] outputs;
    protected Activation activation;

    public Layer(int size, Activation activation) {
        this.size = size;
        this.activation = activation;
    }

    public abstract Layer init();

    abstract void feedForward(float[] input);

    public int getSize() {
        return this.size;
    }

    public void connectPrefLayer(Layer inputLayer) {
        this.prefLayer = inputLayer;
        inputLayer.connectNextLayer(this);
    }

    public void connectNextLayer(Layer nextLayer) {
        this.nextLayer = nextLayer;
    }

    public String toString() {
        return "[Layer, size: " + this.size + "]";
    }

    public float[] getOutputs() {
        return this.outputs;
    }

    protected void prefLayerIsDefined() {
        if(this.prefLayer == null) {
            throw new IllegalStateException("Next layer is not defined yet");
        }
    }

    protected float[] activateValues(float[] inputValues) {
        return activation.activateValues(inputValues);
    }

    public abstract void calculateDerivative(float[] outputDerivatives);

    public abstract void ajustParameters(float learningRate);

    public abstract void printBlackBox();

    public void setBatchSize(int batchSize) {}
}
