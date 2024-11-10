import numpy as np
import time

DATA_INPUT_FILE = 'positions.fen'
# DATA_INPUT_FILE = 'position_small.fen'

def millis():
    return round(time.time() * 1000)

def toBitBoardNNInput():
    DATA_OUTPUT_FILE = 'bitBoard.npy'

    # Piece map for the bitboard index
    piece_map = {
        'P': 0, 'N': 1, 'B': 2, 'R': 3, 'Q': 4, 'K': 5,   # White pieces
        'p': 6, 'n': 7, 'b': 8, 'r': 9, 'q': 10, 'k': 11  # Black pieces
    }


    str_int_map = {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8}


    # Convert a FEN row to bitboards and additional metadata
    def fen_to_bitboards(fen):
        # Split the FEN string into its components
        parts = fen.strip().split()
        
        # 12 bitboards (6 pieces, 2 colors), each 64 bits
        # bitboards_and_extra = np.zeros(12 + 1, dtype=np.uint64)
        bitboards_and_extra = [0] * (12 + 1)
        
        # The first part of FEN describes the board layout
        rows = parts[0].split('/')
        
        # Parse each row of the board
        # for rank in range_0_8:
        for rank in range(8):
            # file = np64_0
            file = 0
            for char in rows[rank]:
                
                if char in str_int_map:
                    # file += str_int_map[char]  # Skip the empty squares
                    file += str_int_map[char]  # Skip the empty squares
                else:
                    
                    piece_index = piece_map[char]
                    # square_index = (np64_7 - rank) * np64_8 + file  # Convert to square index
                    square_index = (7 - rank) * 8 + file  # Convert to square index
                    bitboards_and_extra[piece_index] |= 1 << square_index

                    # bitboards_and_extra[piece_index] = np.bitwise_or(
                    #     bitboards_and_extra[piece_index],
                    #     np.left_shift(np64_1, square_index)
                    # )

                    # file += np64_1
                    file += 1

        # Next part is whose turn it is
        bitboards_and_extra[12] = 1 if parts[1] == 'w' else 0

        # Castling rights: KQkq (4 bits)
        if 'K' in parts[2]: bitboards_and_extra[12] |= 2  # White King-side
        if 'Q' in parts[2]: bitboards_and_extra[12] |= 4  # White Queen-side
        if 'k' in parts[2]: bitboards_and_extra[12] |= 8  # Black King-side
        if 'q' in parts[2]: bitboards_and_extra[12] |= 16  # Black Queen-side

        # Concatenate the bitboards, turn bit, and castling rights
        # return bitboards_and_extra
        return np.array(bitboards_and_extra, dtype=np.uint64)

    # Process the large FEN file and convert to a NumPy array
    def process_fen_file(input_file, output_file):
        # Open the input file
        print('opening file...')
        with open(input_file, 'r') as f:
            # Calculate the number of lines (FEN positions) in the file
            num_lines = sum(1 for _ in f)
            f.seek(0)  # Reset file pointer
            print('Fill memory...')
            # Prepare an array to hold all converted data (12*64 + 1 + 4 bits per FEN)
            data = np.zeros((num_lines, 12 + 1), dtype=np.uint64)
            print('start processing...')

            last_log = millis()

            # Process each line (each FEN position)
            for i, line in enumerate(f):
                if i % 500_000 == 0:
                    print('at',np.round(i/num_lines*100, 1),'% - ', i,'/',num_lines, 'took', millis() - last_log)
                    # if np.round(i/num_lines*100, 1) > 1: break
                    last_log = millis()
                # Convert the FEN line to a bitboard representation
                bitboards = fen_to_bitboards(line)
                # print(type(bitboards))
                # print(bitboards)
                data[i] = bitboards
            
            # Save the NumPy array to a file
            print('Saving...')
            np.save(output_file, data)

    process_fen_file(DATA_INPUT_FILE, DATA_OUTPUT_FILE)
    # res = fen_to_bitboards('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    # print(len(res))
    # print(np.binary_repr(res[0]))
    # print(np.binary_repr(res[1]))
    # print(np.binary_repr(res[2]))
    # print(np.binary_repr(res[3]))
    # print(np.binary_repr(res[4]))
    # print(np.binary_repr(res[5]))
    # print(np.binary_repr(res[6]))
    # print(np.binary_repr(res[7]))
    # print(np.binary_repr(res[8]))
    # print(np.binary_repr(res[9]))
    # print(np.binary_repr(res[10]))
    # print(np.binary_repr(res[11]))
    # print(12, np.binary_repr(res[12]))


def tospaceEfficientNNInput():
    DATA_OUTPUT_FILE = 'nnInput.npy'

    piece_values = {
        'P': 0.167,
        'N': 0.333,
        'B': 0.5,
        'R': 0.667,
        'Q': 0.833,
        'K': 1,
    }

    # Convert white piece values to black piece values by negating them
    piece_values_black = {k.lower(): -v for k, v in piece_values.items()}

    # Merge white and black piece values into one dictionary
    piece_values_black_white = {**piece_values, **piece_values_black}

    def fen_to_nn_input(fen):
        piece_value_table = []

        is_white_turn = None  # Variable to store whether it's white's turn or not

        for i, fen_char in enumerate(fen):
            if fen_char == '/':  # Ignore slashes
                continue
            if fen_char == ' ':  # Stop when the space is encountered (end of position part)
                # The character right after the space indicates whose turn it is
                is_white_turn = (fen[i + 1] == 'w')  # 'w' means white's turn, 'b' means black's turn
                break

            piece_value = piece_values_black_white.get(fen_char)

            # If the FEN character is a number, it's the number of empty squares
            if piece_value is None:
                piece_value_table.extend([0] * int(fen_char))
            else:
                piece_value_table.append(piece_value)

        # Add 1 for white's turn, -1 for black's turn
        piece_value_table.insert(0, 1 if is_white_turn else -1)

        return  np.array(piece_value_table)


    def process_fen_file(input_file, output_file):
        # Initialize an empty list to hold the resulting arrays
        nn_inputs = []

        # Open the input file and process each line
        with open(input_file, 'r') as file:
            for line in file:
                # Clean up the line (remove any extraneous spaces or newlines)
                fen_str = line.strip()
                
                # Convert FEN string to NN input using the provided function
                nn_input = fen_to_nn_input(fen_str)
                
                # Append the numpy array to the list
                nn_inputs.append(nn_input)

        # Convert the list of numpy arrays into a single numpy array
        # This assumes that every NN input has the same length (e.g., 1152 features)
        nn_inputs = np.array(nn_inputs)

        # Save the numpy array to a .npy file
        np.save(output_file, nn_inputs)


    process_fen_file(DATA_INPUT_FILE, DATA_OUTPUT_FILE)


toBitBoardNNInput()