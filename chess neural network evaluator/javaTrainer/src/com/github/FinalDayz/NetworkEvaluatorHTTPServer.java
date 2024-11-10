package com.github.FinalDayz;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.Arrays;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

import com.sun.net.httpserver.*;

import com.github.FinalDayz.NeuralNetwork.NeuralNetwork;

public class NetworkEvaluatorHTTPServer implements HttpHandler {
  
  private NeuralNetwork network;

  public NetworkEvaluatorHTTPServer(NeuralNetwork network) throws IOException {
    this.network = network;
    HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 8080), 0);
    ThreadPoolExecutor threadPoolExecutor = (ThreadPoolExecutor)Executors.newFixedThreadPool(1);

    server.createContext("/evaluate", this);
    
    server.setExecutor(threadPoolExecutor);
    server.start();

  }

  @Override
  public void handle(HttpExchange exchange) throws IOException {
    try {
    String NNInput = new String(exchange.getRequestBody().readAllBytes());

    float[] input = new float[65];
    int index = 0;
    for(String inputValue : NNInput.split(",")) {
      input[index] = Float.parseFloat(inputValue);
      index++;
    }

    float evaluation = network.feedForward(input)[0];
    String rawResponse = String.valueOf(evaluation);

    OutputStream outputStream = exchange.getResponseBody();
    
    exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
    exchange.sendResponseHeaders(200, rawResponse.length());
    outputStream.write(rawResponse.getBytes());
    outputStream.flush();
    outputStream.close();
  }catch(Exception e) {
    e.printStackTrace();
  }
  }
}
