package com.github.FinalDayz.NeuralNetwork;

public class InputLayer extends Layer {

    public InputLayer(int size) {
        super(size, null);
    }

    @Override
    void feedForward(float[] input) {
        this.inputs = input;
        this.outputs = input;
        this.nextLayer.feedForward(input);
    }

      void feedForward() {
        this.outputs = this.inputs;
        this.nextLayer.feedForward(this.inputs);
    }

    public String toString() {
        return "[InputLayer, size: " + this.size + "]";
    }

    @Override
    public void calculateDerivative(float[] outputDerivatives) {}

    @Override
    public void ajustParameters(float learningRate) { }

    @Override
    public InputLayer init() {
        return this;
    }

    @Override
    public void printBlackBox() {
        System.out.println("[input layer]");
        System.out.print("\t[inputs]");
        for(int index = 0; index < size; index++) {
            System.out.print("\t" +NNUtils.dblToStr(inputs[index]));
        }
        System.out.println();
    }
}
