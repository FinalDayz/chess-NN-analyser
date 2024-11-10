import numpy as np
from flask import Flask, json, request
from keras.models import load_model
from flask_cors import CORS, cross_origin
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense
import math

autoencoder = load_model('chess_autoencoder.h5')

# Assemble encoder
latent_layer_indx = math.floor(len(autoencoder.layers)/2)
latent_layer = autoencoder.layers[latent_layer_indx]

encoder = Model(inputs=autoencoder.input,
                    outputs=latent_layer.output)

# Assemble decoder
decoder_input = Input(shape=(10,))
last_layer = decoder_input

for i in range(latent_layer_indx + 1, len(autoencoder.layers)):
    this_layer = autoencoder.layers[i]
    print(i, 'this layer', this_layer, this_layer.output)
    last_layer = this_layer(last_layer)

decoder = Model(inputs=decoder_input, outputs=last_layer)


piecetypes = {
    0: 'P', 1: 'N', 2: 'B', 3: 'R', 4: 'Q', 5: 'K', # White pieces
    6: 'p', 7: 'n', 8: 'b', 9: 'r', 10: 'q', 11: 'k', # Black pieces
}
piece_map = {
    'P': 0, 'N': 1, 'B': 2, 'R': 3, 'Q': 4, 'K': 5,   # White pieces
    'p': 6, 'n': 7, 'b': 8, 'r': 9, 'q': 10, 'k': 11  # Black pieces
}

api = Flask(__name__)
cors = CORS(api)
api.config['CORS_HEADERS'] = 'Content-Type'



@api.route('/autoencoder', methods=['POST'])
@cross_origin()
def autoencoder_endpoint():
    json_body = request.json

    if not 'fen' in json_body:
        return json.dumps({"error": True, "message": "Error, required 'fen' attribute"}), 400
    
    fen = json_body['fen']


    piecesBitboardArray = fen_to_bitboards(fen)
    bitArray = np.unpackbits(piecesBitboardArray.view(np.uint8), bitorder='little').view(bool)[:12 * 64 + 5]
    

    nn_output = autoencoder.predict(np.array([bitArray]))[0]
    latent_space = encoder.predict(np.array([bitArray]))[0]


    nn_output = one_b_one_w_king(nn_output)
    clean_bit_array = floatArrayToBitArray(nn_output)
    cleaned_fen = bitArrayToFen(clean_bit_array)

    return json.dumps({
        "predictedOutput": nn_output.tolist(),
        "predictedFen": cleaned_fen,
        "latentSpace": latent_space.tolist(),
    })

@api.route('/latentspace', methods=['POST'])
def latentspace_endpoint():
    json_body = request.json

    if not 'latentSpace' in json_body:
        return json.dumps({"error": True, "message": "Error, required 'latentSpace' attribute"}), 400
    
    latent_values = json_body['latentSpace']


    nn_output = decoder.predict(np.array([latent_values]))[0]


    nn_output = one_b_one_w_king(nn_output)
    clean_bit_array = floatArrayToBitArray(nn_output)
    cleaned_fen = bitArrayToFen(clean_bit_array)

    return json.dumps({
        "predictedOutput": nn_output.tolist(),
        "predictedFen": cleaned_fen
    })


def addNumberToFen(fen):
    if len(fen) == 0 or not fen[-1].isdigit():
        return fen + '1'
    return fen[:-1] + str(int(fen[-1]) + 1)
    
def addFenChar(piecesBitboardArray, fen, index):
    for bitboardIndex in range(12):
        indexInArray = index + bitboardIndex * 64
        if not piecesBitboardArray[indexInArray] == 0:
            return fen + piecetypes[bitboardIndex]
        
    # only reached if no piece was found
    return addNumberToFen(fen)


''' 
    Input: 1D array of 12 bitboards plus 5 bits (first color, b/w, four for castling). But the values are floats between 0 and 1.
    For every position, check every bitboard, which has the highest value and onyl set that one to 1 and the rest to 0.
'''
def floatArrayToBitArray(piecesBitboardArray):
    bitArray = np.zeros(12 * 64 + 5)

    for i in range(0, 64):
        maxIndex = 0
        maxValue = 0
        for j in range(12):
            if piecesBitboardArray[i + j * 64] > maxValue:
                maxIndex = j
                maxValue = piecesBitboardArray[i + j * 64]
        if maxValue >= 0.5:
            bitArray[i + maxIndex * 64] = 1

    for i in range(12 * 64, 12 * 64 + 5):
        bitArray[i] = 1 if piecesBitboardArray[i] > 0.5 else 0

    return bitArray

'''
    return index of item with the highest value
'''
def get_highest_value(arr, start_indx, end_indx):
    indx = np.argmax(arr[start_indx:end_indx])
    return indx + start_indx
    

def one_b_one_w_king(piecesBitboardArray):
    b_king_arr_indx = piece_map['k'] * 64

    highest_b_king_indx = get_highest_value(piecesBitboardArray, b_king_arr_indx, b_king_arr_indx+64)
    piecesBitboardArray[b_king_arr_indx:b_king_arr_indx+64] = np.zeros(64)
    piecesBitboardArray[highest_b_king_indx] = 1

    w_king_arr_indx = piece_map['K'] * 64
    highest_w_king_indx = get_highest_value(piecesBitboardArray, w_king_arr_indx, w_king_arr_indx+64)
    piecesBitboardArray[w_king_arr_indx:w_king_arr_indx+64] = np.zeros(64)
    piecesBitboardArray[highest_w_king_indx] = 1

    return piecesBitboardArray

''' 
    Input: 1D array of 12 bitboards plus 5 bits (first color, b/w, four for castling)
'''
def bitArrayToFen(piecesBitboardArray):

    fen = ''
    for i in reversed(range(0, 64, 8)): # 0 to 56 with increment of 8

        for j in range(i, i + 8):
            fen = addFenChar(piecesBitboardArray, fen, j)
        if i != 0:
            fen += '/'

    fen = fen

    last_index = 12 * 64 - 1
    # Add color
    fen += ' ' + ('w' if piecesBitboardArray[last_index + 1] == 1 else 'b')
    # Add castling rights
    fen += ' '
    fen += ('K' if piecesBitboardArray[last_index + 2] == 1 else '')
    fen += ('Q' if piecesBitboardArray[last_index + 3] == 1 else '')
    fen += ('k' if piecesBitboardArray[last_index + 4] == 1 else '')
    fen += ('q' if piecesBitboardArray[last_index + 5] == 1 else '')

    if not np.any(piecesBitboardArray[last_index+2:last_index + 6]):
        fen += ' -'

    fen += ' - 0 0'


    return fen # reverse

def fen_to_bitboards(fen):
    str_int_map = {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8}
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

# rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

cleanBitArray = floatArrayToBitArray(np.array([
    # White pawns
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0.1, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 0, 0, 0, 

    # White knights
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0.49, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 1, 0, 0, 0, 0, 1, 0,

    # White bishops
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 1, 0, 0,

    # White rooks
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 0, 0, 0, 0, 1,

    # White queen
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 1, 0, 0, 0, 0,

    # White king
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 0, 0, 0,


    # Black pawns
    0, 0, 0, 0, 0, 0, 0, 0, 
    1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 

    # Black knights
    0, 1, 0, 0, 0, 0, 1, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black bishops
    0, 0, 1, 0, 0, 1, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black rooks
    1, 0, 0, 0, 0, 0, 0, 1,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black queen
    0, 0, 0, 1, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black king
    0, 0, 0, 0, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # First color, b/w,
    1, 
    1, 1, 1, 1, # four bits for castling
]))

cleanedFen = bitArrayToFen(cleanBitArray)
print('cleanedFen', cleanedFen)

fen = bitArrayToFen(np.array([
    # White pawns
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 

    # White knights
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 1, 0, 0, 0, 0, 1, 0,

    # White bishops
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 1, 0, 0,

    # White rooks
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 0, 0, 0, 0, 1,

    # White queen
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 1, 0, 0, 0, 0,

    # White king
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 0, 0, 0,


    # Black pawns
    0, 0, 0, 0, 0, 0, 0, 0, 
    1, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 

    # Black knights
    0, 1, 0, 0, 0, 0, 1, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black bishops
    0, 0, 1, 0, 0, 1, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black rooks
    1, 0, 0, 0, 0, 0, 0, 1,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black queen
    0, 0, 0, 1, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # Black king
    0, 0, 0, 0, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,

    # First color, b/w,
    1, 
    1, 1, 1, 1, # four bits for castling
]))

print(fen)



if __name__ == '__main__':
    api.run()