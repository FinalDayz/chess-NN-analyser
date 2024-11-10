import numpy as np

DATA_INPUT_FILE = 'nnInput.npy'
BATCH_SIZE = 10000  # Define the batch size

def load_data_in_batches(file_path, batch_size):
    """
    Generator function to load large numpy data in batches.
    
    Args:
        file_path (str): Path to the .npy file containing the neural network input data.
        batch_size (int): Size of the batches to load.
    
    Yields:
        Numpy arrays of size (batch_size, feature_length) until the full dataset is processed.
    """
    # Load the memory-mapped file
    mmapped_array = np.load(file_path, mmap_mode='r')  # Read in memory-mapped mode
    
    total_samples = mmapped_array.shape[0]  # Total number of entries (rows)
    feature_length = mmapped_array.shape[1]  # Number of features (columns)

    # Iterate over the file in batches
    for start_idx in range(0, total_samples, batch_size):
        end_idx = min(start_idx + batch_size, total_samples)
        
        # Yield the next batch
        yield mmapped_array[start_idx:end_idx]

# Example usage: Loop through the batches
for batch in load_data_in_batches(DATA_INPUT_FILE, BATCH_SIZE):
    # Example of feeding batch to a neural network (TensorFlow or PyTorch)
    # model.train_on_batch(batch)  # TensorFlow/Keras training example
    # OR
    # output = model(batch)        # PyTorch training example

    # You can also perform any data manipulation or processing here
    print(f"Processed batch of shape: {batch.shape}")
