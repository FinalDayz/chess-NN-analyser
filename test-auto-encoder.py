import numpy as np
from tensorflow.keras.models import Model
from keras.optimizers import Adam
from tensorflow.keras.layers import Input, Dense

# Step 1: Prepare the data (binary combinations of two bits)
input_data = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
output_data = input_data.copy()

# Step 2: Define the Encoder-Decoder model with a latent space of 2 bits
input_layer = Input(shape=(2,))
hidden_encoder = Dense(20, activation='tanh')(input_layer)  # Hidden layer in encoder

latent_layer = Dense(1, activation='tanh')(hidden_encoder)  # Latent space with 2 bits

# Decoder: Latent space -> Hidden layer -> Output (2 bits)
hidden_decoder = Dense(20, activation='tanh')(latent_layer)  # Hidden layer in decoder
output_layer = Dense(2, activation='sigmoid')(hidden_decoder)  # Output layer with 2 bits

# Full model: Encoder + Decoder
autoencoder = Model(inputs=input_layer, outputs=output_layer)

# Step 3: Compile the model
optimizer = Adam(
    learning_rate=0.01
)
autoencoder.compile(optimizer=optimizer, loss='mse')  # Use mean squared error instead of binary crossentropy

# Step 4: Train the model
history = autoencoder.fit(input_data, output_data, epochs=350, verbose=0)
print('Loss::', history.history['loss'][-1])

history = autoencoder.fit(input_data, output_data, epochs=350, verbose=0)
print('Loss::', history.history['loss'][-1])

history = autoencoder.fit(input_data, output_data, epochs=350, verbose=0)
print('Loss::', history.history['loss'][-1])

history = autoencoder.fit(input_data, output_data, epochs=350, verbose=0)
print('Loss::', history.history['loss'][-1])

# Step 5: Test the model
predictions = autoencoder.predict(input_data)

# Display the predictions
for i, input_example in enumerate(input_data):
    print(f"Input: {input_example}, Predicted output: {np.round(predictions[i])}")
