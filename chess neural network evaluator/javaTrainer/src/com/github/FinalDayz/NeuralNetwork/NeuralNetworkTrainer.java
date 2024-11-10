package com.github.FinalDayz.NeuralNetwork;

import com.github.FinalDayz.SysUtils;

import java.util.Arrays;

public class NeuralNetworkTrainer {
    private final NeuralNetwork network;
    private final OptimizedFloatDataset dataset;
    private OptimizedFloatDataset testData;

    public NeuralNetworkTrainer(
            NeuralNetwork network,
            OptimizedFloatDataset dataset
    ) {
        this.network = network;
        this.dataset = dataset;
    }

    public NeuralNetworkTrainer(
            NeuralNetwork network,
            OptimizedFloatDataset dataset,
            OptimizedFloatDataset testData
    ) {
        this(network, dataset);
        this.testData = testData;
    }

    public void trainNetwork(int epochs, float learningRate, float decayRate, int printBetweenEpoch) {
        for (int epoch = 0; epoch < epochs; epoch++) {
            double totalMSE = 0, totalError = 0;
            double totalIttrError = 0, totalIttrMSE = 0;
            
            float[] wantedOutput = new float[]{0};
            this.network.inputLayer.inputs = new float[this.dataset.inputSize];
            double startTime = System.currentTimeMillis();

            for (int index = 0; index < this.dataset.getSize(); index++) {
              int trainingDataIndex = (int) Math.floor(NNUtils.random(0, dataset.getSize()-1));
              this.dataset.getInput(trainingDataIndex, this.network.inputLayer.inputs);
              this.dataset.getOutput(trainingDataIndex, wantedOutput);

              this.network.feedForward();

              float MSE = network.backporpogate(wantedOutput, learningRate);
              if (SysUtils.DEBUG) {
                  network.printBlackBox();
              }
              
              totalError += Math.sqrt(MSE);
              totalMSE += MSE;
              totalIttrError += Math.sqrt(MSE);
              totalIttrMSE += MSE;
              
              if(index % printBetweenEpoch == 1 && printBetweenEpoch > 0) {
                System.out.println("\t" + Math.round(index*100.0/dataset.getSize()) + "%] "+
                  "data for "+printBetweenEpoch+" itterations" + 
                    " Avg MSE " + round3(totalIttrMSE / printBetweenEpoch)+
                    " Avg err: " + round3(totalIttrError / printBetweenEpoch)
                  );
                  totalIttrMSE = 0;
                  totalIttrError = 0;
              }
            }
            
            System.out.println(epoch + "]" +
              "average MSE " + round3(totalMSE / dataset.getSize())+
              " Average error: " + round3(totalError/dataset.getSize())+
              " LR: " + round3(learningRate)+" (took "+(System.currentTimeMillis()-startTime)+")"
            );
            learningRate*=decayRate;

        }
    }

    private double round3(double input) {
      return Math.round(input*1000)/1000.0;
    }
}
