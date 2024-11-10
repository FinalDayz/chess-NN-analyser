package com.github.FinalDayz.NeuralNetwork.activation;

import com.github.FinalDayz.NeuralNetwork.Layer;

import java.util.Arrays;

public class SoftmaxActivation implements Activation {
    @Override
    public float[] activateValues(float[] valuesToActivate) {
        float sumEValues = 0;
        float[] activatedValues = new float[valuesToActivate.length];
        // Execute pow (E, x) for each element
        for (int index = 0; index < valuesToActivate.length; index++) {
            float value = valuesToActivate[index];
            activatedValues[index] = (float) Math.pow(Math.E, value);
            sumEValues += activatedValues[index];
        }
        // Next, divide every value by the sum of all E^values
        for (int index = 0; index < valuesToActivate.length; index++) {
            activatedValues[index] /= sumEValues;
        }

        return activatedValues;
    }

    @Override
    public float[] derivativeValues(float[] values) {
        float[] returnArray = new float[values.length];
        Arrays.fill(returnArray, 1);
        return returnArray;
//        throw new IllegalStateException("Method not implemented yet");
    }
}
