from flask import Flask, request, jsonify
from flask_cors import CORS
from fall_detection import detect_fall_from_images  # your model logic
import os

# ✅ Create Flask app before using @app.route
app = Flask(__name__)
CORS(app)

@app.route('/api/analyze', methods=['POST'])
def analyze_sequence():
    data = request.get_json()
    sequence_name = data.get('sequenceName')

    # Debug print statements
    print("Requested sequenceName:", sequence_name)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'ai-models', 'sample_sequences', 'Labelled_Dataset', sequence_name)
    print("Looking for path:", dataset_path)

    if not sequence_name:
        return jsonify({'error': 'Missing sequenceName'}), 400

    # Absolute path handling - the dataset is in the ai-models subdirectory
    # base_dir = os.path.dirname(os.path.abspath(__file__))
    # dataset_path = os.path.join(base_dir, 'ai-models', 'sample_sequences', 'Labelled_Dataset', sequence_name)

    if not os.path.isdir(dataset_path):
        return jsonify({'error': f'Path not found: {dataset_path}'}), 404

    result = detect_fall_from_images(dataset_path)
    return jsonify(result)

if __name__ == '__main__':
    print("Starting Flask app...")
    app.run(debug=True, port=8000)
