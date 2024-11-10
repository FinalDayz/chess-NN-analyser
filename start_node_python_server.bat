@echo off
call .\chess\Scripts\activate.bat

cd "chess neural network evaluator"
START /B npx http-server . &

cd ..

python server_host_nn.py