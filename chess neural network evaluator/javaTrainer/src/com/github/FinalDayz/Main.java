package com.github.FinalDayz;

import com.github.FinalDayz.NeuralNetwork.*;
import com.github.FinalDayz.NeuralNetwork.activation.*;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Arrays;
import java.util.stream.Collectors;

public class Main extends SysUtils {

  public static void main(String[] args) throws IOException {
      NeuralNetwork network = new NeuralNetwork(
        new InputLayer(65),
        new OutputLayer(1, new TanhActivation())
      );

      network.addLayer(
        new HiddenLayer(30, new TanhActivation()),
        new HiddenLayer(5, new TanhActivation())
      );

      network.connectLayers();
      network.initializeLayers();
      // network.enableAndSetBatchSize(100);

      OptimizedFloatDataset dataset = new OptimizedFloatDataset(
        new File("/Users/stefandamen/Documents/projects/chess neural network evaluator/converter/NNInput.csv"),
        65, 1, 31_290_061//41_833_420/2
      );

      System.out.println("Make network, proccessing file...");

      NetworkEvaluatorHTTPServer server = new NetworkEvaluatorHTTPServer(network);

      dataset.processFile();

      NeuralNetworkTrainer trainer = new NeuralNetworkTrainer(
        network,
        dataset
      );
      
      System.out.println("done processing, training...");

      trainer.trainNetwork(20, 0.06f, 0.95f, 3_000_000);


      System.out.println("DONE!");
      printWeights(network);
      // for (int index = 0; index < dataset.getSize(); index++) {
      //     double[] input = dataset.getInputDouble(index);

      //     double[] output = network.feedForward(input);

      //     print(index + ") input: ");
      //     print(input);

      //     print(" "+network.<String>outputToOneHot(categories));
      //     print(", ");
      //     print(output);
      //     println();
      // }

  }

  public static void printWeights(NeuralNetwork network) {
        System.out.println(
        "\n\n====================WEIGHTS====================\n"+
        network.getFlatWeightArray()
          .stream()
          .map(String::valueOf)
          .collect(Collectors.toList())
      );
      System.out.println(
        "\n\n====================BIASES====================\n"+
        network.getFlatBiasArray()
          .stream()
          .map(String::valueOf)
          .collect(Collectors.toList())
      );
  }


//     public static void mainExample(String[] args) {

//         NeuralNetwork network = new NeuralNetwork(
//                 new InputLayer(4),
//                 new OutputLayer(3, new SoftmaxActivation())
//         );

//         network.addLayer(
//                 new HiddenLayer(20, new TanhActivation()),
//                 new HiddenLayer(100, new LeakyReLuActivation())
//         );

//         network.connectLayers();
//         network.initializeLayers();

//         Dataset dataset = new Dataset(
//                 new File("C:/Users/stee2/Desktop/iris.csv")
//         );

//         String[] categories = new String[] {
//                 "setosa", "versicolor", "virginica"
//         };

//         dataset.replace(categories[0], "1.0,0.0,0.0");
//         dataset.replace(categories[1], "0.0,1.0,0.0");
//         dataset.replace(categories[2], "0.0,0.0,1.0");

//         try {
//             dataset.processFile(1, ',', false);
//         } catch (FileNotFoundException e) {
//             e.printStackTrace();
//         }

//         dataset.setInputData(0, 3);
//         dataset.setOutputData(4, 6);

// //        dataset.setInputData(0, 1);
// //        dataset.setOutputData(2, 2);

//         NeuralNetworkTrainer trainer = new NeuralNetworkTrainer(
//                 network,
//                 dataset
//         );

//         SysUtils.DEBUG = false;

//         trainer.trainNetwork(2000, 0.1f, 0.96f, -1);

//         for (int index = 0; index < dataset.getSize(); index++) {
//             double[] input = dataset.getInputDouble(index);

//             double[] output = network.feedForward(input);

//             print(index + ") input: ");
//             print(input);

//             print(" "+network.<String>outputToOneHot(categories));
//             print(", ");
//             print(output);
//             println();
//         }

// //        for(int i = 0; i < 10; i++) {
// //            println("["+i+"]");
// //            print("lastOutput: ");
// //            println(
// //                    network.feedForward(new double[]{1})
// //            );
// //
// //            println("mse: " + network.backporpogate(new double[]{1}));
// //        }

//     }
}
