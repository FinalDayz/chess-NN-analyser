package com.github.FinalDayz.NeuralNetwork;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class NeuralNetwork {

    private Layer[] layers;
    InputLayer inputLayer;
    private OutputLayer outputLayer;

    public NeuralNetwork(InputLayer inputLayer, OutputLayer outputLayer) {
        this.layers = new Layer[0];
        this.inputLayer = inputLayer;
        this.outputLayer = outputLayer;
    }

    public void addLayer(Layer... addedLayers) {
        Layer[] newLayers = new Layer[this.layers.length + addedLayers.length];

        for(int index = 0; index < this.layers.length; index++) {
            newLayers[index] = layers[index];
        }

        int index = this.layers.length;
        for(Layer newLayer : addedLayers) {
            newLayers[index] = newLayer;
            index++;
        }

        this.layers = newLayers;
    }

    public void enableAndSetBatchSize(int batchSize) {
      for(Layer layer : layers) {
        layer.setBatchSize(batchSize);
      }
      outputLayer.setBatchSize(batchSize);
    }

    public ArrayList<Float> getFlatWeightArray() {
      ArrayList<Float> weights = new ArrayList<Float>();
      for(Layer layer : layers) {
        if(layer instanceof WeightsLayer) {
          WeightsLayer weightsLayer = (WeightsLayer) layer;
          weights.addAll(weightsLayer.getFlatWeightArray());
        }
      }

      weights.addAll(outputLayer.getFlatWeightArray());

      return weights;
    } 

    public ArrayList<Float> getFlatBiasArray() {
      ArrayList<Float> weights = new ArrayList<Float>();
      for(Layer layer : layers) {
        if(layer instanceof WeightsLayer) {
          WeightsLayer weightsLayer = (WeightsLayer) layer;
          weights.addAll(weightsLayer.getFlatBiasArray());
        }
      }

      weights.addAll(outputLayer.getFlatBiasArray());

      return weights;
    }

    public void connectLayers() {
        Layer prefLayer = this.inputLayer;
        for(Layer layer : this.layers) {
            layer.connectPrefLayer(prefLayer);
            prefLayer = layer;
        }
        this.outputLayer.connectPrefLayer(prefLayer);
    }

    public String toString() {
        String output =  "[Neural network, \n\t" + this.layers.length + " hidden layers, " +
                "\n\tInput size: " + this.inputLayer.getSize() + ", " +
                "\n\tOutput size: " + this.outputLayer.getSize() + "]\n";

        output += "[Layers]:\n";

        output += "\t"+this.inputLayer.toString() + "\n";
        for(Layer layer : this.layers) {
            output += "\t"+layer.toString() + "\n";
        }
        output += "\t"+this.outputLayer.toString() + "\n";

        return output;
    }

    public float[] feedForward(float[] inputs) {
        if(inputs.length != this.inputLayer.size) {
            throw new IllegalArgumentException("Input size does not equal predefined input layer size");
        }
        this.inputLayer.feedForward(inputs);

        return this.outputLayer.getOutputs();
    }

      public float[] feedForward() {
        this.inputLayer.feedForward();

        return this.outputLayer.getOutputs();
    }

    public float[] lastOutput() {
        return this.outputLayer.getOutputs();
    }

    public void initializeLayers() {
        this.inputLayer.init();

        for(Layer layer : this.layers) {
            layer.init();
        }

        this.outputLayer.init();
    }

    public void printLayerOutput() {
        System.out.println(Arrays.toString(this.inputLayer.getOutputs()));

        for(Layer layer : this.layers) {
            System.out.println(Arrays.toString(layer.getOutputs()));
        }

        System.out.println(Arrays.toString(this.outputLayer.getOutputs()));
    }

    public float backporpogate(float[] wantedOutput, float learningRate) {
        if(wantedOutput.length != this.outputLayer.size) {
            throw new IllegalArgumentException("Wanted output size is not equal to output layer size");
        }
        return this.outputLayer.beginBackpropogate(wantedOutput, learningRate);
    }

    public void printBlackBox() {
        inputLayer.printBlackBox();
        for(Layer layer : this.layers) {
            layer.printBlackBox();
        }
        outputLayer.printBlackBox();
    }

    public <Type> Type outputToOneHot(Type[] category) {
        float[] nnOutput = this.lastOutput();
        int highestIndex = 0;
        float highestValue = nnOutput[0];
        for(int i = 0; i < nnOutput.length; i++) {
            if(nnOutput[i] >= highestValue) {
                highestValue = nnOutput[i];
                highestIndex = i;
            }
        }

        return category[highestIndex];
    }
}
