package com.github.FinalDayz.NeuralNetwork;


import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Scanner;

public class Dataset {
    File dataFile;
    String[][] totalData;
    float[][] totalDataDouble;

    double[][] inputData;
    double[][] outputData;

    int[][] inputDataInt;
    int[][] outputDataInt;

    List<String[]> replaceInstances = new ArrayList<String[]>();
    private int inputFrom;
    private int inputTo;
    private int outputFrom;
    private int outputTo;


    public Dataset(File dataFile) {
        this.dataFile = dataFile;
    }

    public Dataset() {
    }

    public Dataset setFile(File dataFile) {
        this.dataFile = dataFile;
        return this;
    }

    public int getSizeDouble() {
      return totalDataDouble.length;
    }

    public int getSize() {
        if (totalData == null)
            return inputDataInt.length;
        if(totalData.length == 0 && totalDataDouble.length != 0) {
          return totalDataDouble.length;
        }
        return totalData.length;
    }

    public String[] getLine(int index) {
        return totalData[index];
    }

    public float[] getLineDouble(int index) {
        return totalDataDouble[index];
    }

    public void mapColumn(int index, double from, double to, double newFrom, double newTo) {
        for (int i = 0; i < totalDataDouble.length; i++) {
            double value = totalDataDouble[i][index];
            value = (value - from) / (to - from);
            value = value * (newTo - newFrom) + newFrom;
            totalDataDouble[i][index] = (float) value;
        }
    }

    public void setInputData(int from, int to) {
      inputFrom = from;
      inputTo = to;
        // inputData = new double[totalDataDouble.length][to - from + 1];
        // for (int i = 0; i < totalDataDouble.length; i++) {
        //     int index = 0;
        //     for (int j = from; j <= to; j++) {
        //         //System.out.print(i+" "+index+" ");
        //         //System.out.println(totalDataDouble[i][j]);
        //         inputData[i][index] = totalDataDouble[i][j];
        //         index++;
        //     }
        // }
    }

    public double[] getInputDouble(int index) {
      return floatToDoubleArr(
        Arrays.copyOfRange(totalDataDouble[index], inputFrom, inputTo)
      );
        // return inputData[index].clone();
    }

    public double[] getOutputDouble(int index) {
      return floatToDoubleArr(
        Arrays.copyOfRange(totalDataDouble[index], outputFrom, outputTo)
      );
        // return outputData[index].clone();
    }

    private double[] floatToDoubleArr(float[] input) {
      double[] output = new double[input.length];
      for(int i = 0; i < input.length; i++) {
        output[i] = input[i];
      }
      return output;
    }


    public int[] getInputInt(int index) {
        return inputDataInt[index].clone();
    }

    public int[] getOutputInt(int index) {
        return outputDataInt[index].clone();
    }


    public void setOutputData(int from, int to) {
      outputFrom = from;
      outputTo = to;
        // outputData = new double[totalDataDouble.length][to - from + 1];
        // for (int i = 0; i < totalDataDouble.length; i++) {
        //     int index = 0;
        //     for (int j = from; j <= to; j++) {
        //         outputData[i][index] = totalDataDouble[i][j];
        //         index++;
        //     }
        // }
    }


    public boolean processFile(int skipLines, char seperator) throws FileNotFoundException {
        return processFile(skipLines, seperator, false);
    }

    public boolean processFileNoSeperator(int skipLines, char inputOutputSeperator) throws FileNotFoundException {
        Scanner scanner = new Scanner(this.dataFile);
        ArrayList<int[]> inputDataInt = new ArrayList<int[]>();
        ArrayList<int[]> outputDataInt = new ArrayList<int[]>();

        int index = 0;
        while (scanner.hasNext()) {
            if (index < skipLines) {
                scanner.nextLine();
                index++;
                continue;
            }
            String[][] inputOutput = parseLineNoSeperator(scanner.nextLine(), inputOutputSeperator);
            int[] inputInt = new int[inputOutput[0].length];
            int[] outputInt = new int[inputOutput[1].length];


            for (int i = 0; i < inputInt.length; i++) {
                try {
                    inputInt[i] = Integer.parseInt(inputOutput[0][i]);
                } catch (Exception e) {
                    System.out.println("ERROR, input is no int?");
                    e.printStackTrace();
                    System.exit(0);
                }
            }
            inputDataInt.add(inputInt);

            for (int i = 0; i < outputInt.length; i++) {
                try {
                    outputInt[i] = Integer.parseInt(inputOutput[1][i]);
                } catch (Exception e) {
                    System.out.println("ERROR, output is no int?");
                    e.printStackTrace();
                    System.exit(0);
                }
            }

            outputDataInt.add(outputInt);
            //println(index+" input length:", inputInt.length, " output length: ", outputInt.length, "::", Arrays.toString(inputInt));
            index++;
            // if(index > 100)
            //	System.exit(0);
        }
        println("inputDataInt length: ", inputDataInt.size(), " index: ", index);
        this.inputDataInt = inputDataInt.toArray(new int[inputDataInt.size()][]);
        this.outputDataInt = outputDataInt.toArray(new int[outputDataInt.size()][]);
        scanner.close();

        return true;
    }

    public boolean processFile(int skipLines, char seperator, boolean withQuotes) throws FileNotFoundException {
        Scanner scanner = new Scanner(this.dataFile);
        ArrayList<String[]> totalData = new ArrayList<String[]>();
        List<double[]> totalDataDouble = new LinkedList<double[]>();
        float[][] doubleData = new float[22_765_202][];
        boolean canBeDouble = true;

        int index = 0;
        while (scanner.hasNext()) {
            if (index < skipLines) { 
                scanner.nextLine();
                index++;
                continue;
            }
            
            String[] line = withQuotes ? parseLine(scanner.nextLine(), seperator, withQuotes)
              : parseLine(scanner.nextLine(), seperator);

            if (canBeDouble) {
                float[] lineDouble = new float[line.length];
                for (int i = 0; i < line.length; i++) {
                    try {
                        lineDouble[i] = Float.parseFloat(line[i]);

                    } catch (Exception e) {
                        canBeDouble = false;
                        System.out.println("MAYBE YOU DONT HAVE TO WORRY ABOUT THIS ERROR!! (it doesnt have to be a double) '" + line[i] + "' ");
                        e.printStackTrace();
                    }
                }
                doubleData[index] = lineDouble;
                // totalDataDouble.add(lineDouble);
            }
            // totalData.add(line);
            index++;
            if(index % 250000 == 0) {
              System.out.println(index/1000+"k progress " + canBeDouble);
            }

        }
        this.totalDataDouble = doubleData;
        // this.totalData = totalData.toArray(new String[totalData.size()][]);

        // if (canBeDouble)
        //     this.totalDataDouble = totalDataDouble.toArray(new double[totalData.size()][]);
        scanner.close();

        return true;
    }

    public String[][] parseLineNoSeperator(String line, char inputOutputSeperator) {
        ArrayList<String> inputValues = new ArrayList<String>();
        ArrayList<String> outputValues = new ArrayList<String>();
        boolean inOutput = false;

        for(String[] replaceInstance : this.replaceInstances) {
            line = line.replace(replaceInstance[0], replaceInstance[1]);
        }

        char[] chars = line.toCharArray();

        for (char ch : chars) {

            if (ch == inputOutputSeperator) {
                inOutput = true;
                continue;
            }

            if (!inOutput) {
                inputValues.add(String.valueOf(ch));
            } else {
                outputValues.add(String.valueOf(ch));
            }

        }

        return new String[][]{
                inputValues.toArray(new String[inputValues.size()]),
                outputValues.toArray(new String[outputValues.size()])
        };

    }

    public String[] parseLine(String cvsLine, char seperator) {
        return cvsLine.split(String.valueOf(seperator));
    }

    public String[] parseLine(String cvsLine, char seperator, boolean withQuotes) {
        ArrayList<String> values = new ArrayList<String>();

        for(String[] replaceInstance : this.replaceInstances) {
            cvsLine = cvsLine.replace(replaceInstance[0], replaceInstance[1]);
        }

        char[] chars = cvsLine.toCharArray();
        //loop through every character
        boolean inQuote = false;
        int valueIndex = 0;
        if (chars.length > 0)
            values.add("");

        for (char ch : chars) {

            if (withQuotes) {

                if (ch == '"') {
                    inQuote = !inQuote;
                    continue;
                }

                if (!inQuote && ch == seperator) {
                    values.add("");
                    valueIndex++;
                    continue;
                }
                if (inQuote)
                    values.set(valueIndex, values.get(valueIndex) + ch);

            } else {

                if (ch == seperator) {
                    values.add("");
                    valueIndex++;
                    continue;
                }

                values.set(valueIndex, values.get(valueIndex) + ch);
            }
        }

        return values.toArray(new String[values.size()]);
    }

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

    public static String minLength(int length, Object... o) {
        String finalString = "";
        for (int i = 0; i < o.length; i++) {
            if (o[i] instanceof Double)
                if ((double) o[i] % 1 == 0) {
                    finalString += (((Double) o[i]).intValue());
                } else
                    finalString += (read((double) o[i]));
            else
                finalString += (o[i]);
        }

        if (finalString.length() < length) {
            for (int i = 0; i < length - finalString.length(); i++) {
                finalString += " ";
            }
        }

        return finalString;

    }

    public void replace(String replace, String with) {
        this.replaceInstances.add(new String[]{replace, with});
    }
}
