package com.github.FinalDayz.NeuralNetwork;

public class NNUtils {
    public static float random(float minValue, float maxValue) {
        return (float) ((Math.random() * (maxValue - minValue)) + minValue);
    }

    public static String dblToStr(float x) {
        if(Float.isNaN(x)) {
            return "NaN";
        }
        x = (float) (Math.round(x*10000) / 10000.0);
        return String.valueOf(x);
    }
}
