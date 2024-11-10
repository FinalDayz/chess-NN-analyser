package com.github.FinalDayz.NeuralNetwork;

import com.github.FinalDayz.NeuralNetwork.activation.Activation;

import java.util.Arrays;

public class OutputLayer extends WeightsLayer {

    public OutputLayer(int size, Activation activation) {
        super(size, activation);
    }

    public String toString() {
        return "[OutputLayer, size: " + this.size + "]";
    }

    public float beginBackpropogate(float[] wantedOutput, float learningRate) {
        float[] derivativesError = new float[wantedOutput.length];

        for(int index = 0; index < wantedOutput.length; index++) {
            float error = wantedOutput[index] - outputs[index];
            derivativesError[index] = error;
        }
        super.calculateDerivative(derivativesError);
        super.ajustParameters(learningRate);

        float MSE = 0;
        for(int index = 0; index < wantedOutput.length; index++) {
            float error = wantedOutput[index] - outputs[index];
            MSE += error * error;
//            MSE += derivativesError[index];
        }
       MSE /= size;

        return MSE;
    }

}
