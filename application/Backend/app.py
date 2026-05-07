# Random Forest Backend API Setup (React + Python)

## Project Structure

```text
project/
│
├── backend/
│   ├── app.py
│   ├── train_model.py
│   ├── pipeline.joblib
│   ├── requirements.txt
│   └── dataset.csv
│
└── frontend/
    └── (React application)
```

---

# 1. Install Backend Dependencies

Open terminal inside the `backend` folder:

```bash
pip install flask flask-cors pandas numpy scikit-learn nltk scipy joblib
```

---

# 2. Create requirements.txt

Create a file named:

```text
requirements.txt
```

Add:

```text
flask
flask-cors
pandas
numpy
scikit-learn
nltk
scipy
joblib
```

---

# 3. Train and Save the Model

Create:

```text
train_model.py
```

Paste this code:

```python
import pandas as pd
import numpy as np
import re
import html
import nltk
import joblib

from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

from scipy.sparse import hstack

# Download NLTK resources
nltk.download('stopwords')

# Load dataset
# Replace with your dataset filename
df = pd.read_csv('dataset.csv')

# =========================
# Missing Value Handling
# =========================

df = df.dropna(subset=['condition', 'review'])

df['rating'] = df['rating'].fillna(df['rating'].median())
df['usefulCount'] = df['usefulCount'].fillna(df['usefulCount'].median())

# =========================
# Outlier Handling
# =========================

df = df[(df['rating'] >= 1) & (df['rating'] <= 10)]

Q1 = df['usefulCount'].quantile(0.25)
Q3 = df['usefulCount'].quantile(0.75)
IQR = Q3 - Q1

upper_bound = Q3 + 1.5 * IQR

df = df[df['usefulCount'] <= upper_bound]

# =========================
# Text Preprocessing
# =========================

stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()


def clean_text(text):
    text = text.lower()
    text = html.unescape(text)

    text = re.sub(r'[^a-zA-Z\s]', '', text)

    words = text.split()

    words = [word for word in words if word not in stop_words]

    words = [stemmer.stem(word) for word in words]

    return ' '.join(words)


df['clean_review'] = df['review'].apply(clean_text)

# =========================
# TF-IDF Feature Extraction
# =========================

tfidf = TfidfVectorizer(max_features=3000)
X_text = tfidf.fit_transform(df['clean_review'])

# =========================
# Numeric Features
# =========================

numeric_features = df[['rating', 'usefulCount']]

scaler = MinMaxScaler()
numeric_scaled = scaler.fit_transform(numeric_features)

# Combine text + numeric
X = hstack([X_text, numeric_scaled])

# =========================
# Label Encoding
# =========================

encoder = LabelEncoder()
y = encoder.fit_transform(df['condition'])

# =========================
# Feature Selection
# =========================

selector = SelectKBest(score_func=chi2, k=1000)
X_selected = selector.fit_transform(X, y)

# =========================
# Convert Sparse Matrix
# =========================

X_dense = X_selected.toarray()

# =========================
# Train/Test Split
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X_dense,
    y,
    test_size=0.2,
    random_state=42
)

# =========================
# Random Forest Model
# =========================

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=20,
    class_weight='balanced',
    random_state=42
)

# Train model
model.fit(X_train, y_train)

# Predictions
predictions = model.predict(X_test)

# Evaluation
print('Accuracy:', accuracy_score(y_test, predictions))
print(classification_report(y_test, predictions))

# =========================
# Save Pipeline
# =========================

joblib.dump({
    'model': model,
    'vectorizer': tfidf,
    'scaler': scaler,
    'selector': selector,
    'label_encoder': encoder
}, 'pipeline.joblib')

print('Pipeline saved successfully.')
```

---

# 4. Train the Model

Run:

```bash
python train_model.py
```

Expected result:

```text
Accuracy: 0.xx
Pipeline saved successfully.
```

You should now see:

```text
pipeline.joblib
```

inside your backend folder.

---

# 5. Create Backend API

Create:

```text
app.py
```

Paste:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

import joblib
import re
import html

from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# =========================
# Flask Setup
# =========================

app = Flask(__name__)
CORS(app)

# =========================
# Load Pipeline Once
# =========================

pipeline = joblib.load('pipeline.joblib')

model = pipeline['model']
vectorizer = pipeline['vectorizer']
selector = pipeline['selector']
encoder = pipeline['label_encoder']

# =========================
# NLP Setup
# =========================

stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()


# =========================
# Clean Text Function
# =========================

def clean_text(text):
    text = text.lower()
    text = html.unescape(text)

    text = re.sub(r'[^a-zA-Z\s]', '', text)

    words = text.split()

    words = [word for word in words if word not in stop_words]

    words = [stemmer.stem(word) for word in words]

    return ' '.join(words)


# =========================
# Prediction Route
# =========================

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        review = data.get('review', '')
        rating = float(data.get('rating', 5))
        useful_count = float(data.get('usefulCount', 0))

        # Clean review
        cleaned = clean_text(review)

        # TF-IDF transform
        X_text = vectorizer.transform([cleaned])

        # Numeric values
        import numpy as np
        from scipy.sparse import hstack

        numeric = np.array([[rating, useful_count]])

        # Combine
        X = hstack([X_text, numeric])

        # Feature selection
        X_selected = selector.transform(X)

        # Dense conversion
        X_dense = X_selected.toarray()

        # Predict
        prediction = model.predict(X_dense)

        # Decode label
        condition = encoder.inverse_transform(prediction)[0]

        return jsonify({
            'prediction': condition
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


# =========================
# Start Server
# =========================

if __name__ == '__main__':
    app.run(debug=True)
```

---

# 6. Start Backend Server

Run:

```bash
python app.py
```

Expected output:

```text
Running on http://127.0.0.1:5000
```

---

# 7. Test API Using Postman

POST request:

```text
http://127.0.0.1:5000/predict
```

Body → JSON:

```json
{
  "review": "I feel anxious and depressed",
  "rating": 2,
  "usefulCount": 10
}
```

Expected response:

```json
{
  "prediction": "Depression"
}
```

---

# 8. React Frontend Example

```javascript
const predictCondition = async () => {
  const response = await fetch("http://127.0.0.1:5000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      review: review,
      rating: rating,
      usefulCount: usefulCount
    })
  });

  const data = await response.json();

  console.log(data.prediction);
};
```

---

# 9. Final Notes

## Backend Responsibilities

The backend:

* Loads the Random Forest model
* Processes text
* Applies TF-IDF vectorisation
* Generates predictions
* Returns JSON responses

## Frontend Responsibilities

The React frontend:

* Collects user input
* Sends API requests
* Displays predictions

---

# 10. Recommended Improvements

Future enhancements:

* Switch Flask → FastAPI for better performance
* Add authentication
* Deploy backend using Render/Railway
* Store prediction history in database
* Add probability/confidence scores
