package com.github.FinalDayz.NeuralNetwork;

import java.io.BufferedReader;
import java.io.DataInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;

public class OptimizedFloatDataset {


    final File dataFile;
    public float[] allData;


    public final int inputFrom, inputTo, outputFrom, outputTo, inputSize, outputSize, inputOutputSize;


    public OptimizedFloatDataset(File dataFile, int inputSize, int outputSize, int count) {
        this.dataFile = dataFile;
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.inputOutputSize = inputSize + outputSize;
        this.inputFrom = 0;
        this.inputTo = inputSize;
        this.outputFrom = inputSize;
        this.outputTo = outputFrom + outputSize;
        allData = new float[count * inputOutputSize];
    }

    public int getSize() {
        return allData.length / inputOutputSize;
    }


    public void getOutput(int index, float[] output) {
      System.arraycopy(allData, index * inputOutputSize + outputFrom, output, 0, outputSize);
    }

    public void getInput(int index, float[] input) {
      System.arraycopy(allData, index * inputOutputSize, input, 0, inputSize);
    }

    public void processFile() throws FileNotFoundException, IOException {
        FileInputStream fstream = new FileInputStream(this.dataFile);
        DataInputStream in = new DataInputStream(fstream);
        BufferedReader br = new BufferedReader(new InputStreamReader(in));

        float[] allData = this.allData;
        int allDataSize = allData.length;
        
        int index = 0;
        String curFloatValue = "";

        
        int charInt;
        while ((charInt = br.read()) != -1 && index < allDataSize) {
          char character = (char) charInt;
          if(character == '\n' || character == ',') {
            Float parsedFloatVal = Float.parseFloat(curFloatValue);
            allData[index] = parsedFloatVal;
            index++;
            curFloatValue = "";

            if(index % 20_000_000 == 0) 
              System.out.println(
                Math.round(index*100.0 / allDataSize)+
                "% progress ("+index+")");

            continue;
          }
          curFloatValue += character;
          // if(index >= 1000) {
          //   br.close();
          //   in.close();
          //   fstream.close();
          //   return;
          // }
        }
        br.close();
        in.close();
        fstream.close();
    }

    public String[] parseLine(String cvsLine) {
        return cvsLine.split(",");
    }

    // public String[] parseLine(String cvsLine, char seperator, boolean withQuotes) {
    //     ArrayList<String> values = new ArrayList<String>();

    //     for(String[] replaceInstance : this.replaceInstances) {
    //         cvsLine = cvsLine.replace(replaceInstance[0], replaceInstance[1]);
    //     }

    //     char[] chars = cvsLine.toCharArray();
    //     //loop through every character
    //     boolean inQuote = false;
    //     int valueIndex = 0;
    //     if (chars.length > 0)
    //         values.add("");

    //     for (char ch : chars) {

    //         if (withQuotes) {

    //             if (ch == '"') {
    //                 inQuote = !inQuote;
    //                 continue;
    //             }

    //             if (!inQuote && ch == seperator) {
    //                 values.add("");
    //                 valueIndex++;
    //                 continue;
    //             }
    //             if (inQuote)
    //                 values.set(valueIndex, values.get(valueIndex) + ch);

    //         } else {

    //             if (ch == seperator) {
    //                 values.add("");
    //                 valueIndex++;
    //                 continue;
    //             }

    //             values.set(valueIndex, values.get(valueIndex) + ch);
    //         }
    //     }

    //     return values.toArray(new String[values.size()]);
    // }

    static void println(Object... o) {
        for (int i = 0; i < o.length; i++) {
            if (o[i] instanceof Double)
                if ((double) o[i] % 1 == 0)
                    System.out.print(((Double) o[i]).intValue());
                else
                    System.out.print(read((double) o[i]));
            else
                System.out.print(o[i]);
        }
        System.out.println();
    }

    static void println(int... o) {
        for (int i = 0; i < o.length; i++) {
            System.out.print(o[i]);
        }
        System.out.println();
    }

    static void print(Object... o) {
        for (int i = 0; i < o.length; i++) {
            if (o[i] instanceof Double)
                if ((double) o[i] % 1 == 0) {
                    System.out.print(((Double) o[i]).intValue());
                } else
                    System.out.print(read((double) o[i]));
            else
                System.out.print(o[i]);
        }
    }

    static double read(double d) {
        return Math.round(d * 1000.0) / 1000.0;
    }
}
