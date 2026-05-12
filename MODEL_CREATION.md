# Model Creation Details

## Purpose of the Model

The prediction model in this project was created to classify free-text symptom or review-style input into one of three supported health conditions:

- Depression
- High Blood Pressure
- Diabetes, Type 2

In the frontend, `Diabetes, Type 2` is displayed as `Type 2 Diabetes` for readability, but the training label comes from the dataset.

## Data Sources

The model was built using the cleaned dataset files:

- [cleaned_drugsComTrain.csv]
- [cleaned_drugsComTest.csv]

These files contain cleaned drug review records derived from the original raw dataset. Only the following columns are used by the current backend training pipeline:

- `condition`
- `review`

User-submitted reviews stored in:

- [user_submitted_reviews.csv]

can also be included during future retraining.

## Condition Filtering

The full drug review dataset contains many medical conditions, but the current application is intentionally limited to three classes so that the user interface, backend logic, and model remain aligned.

During training, the dataset is filtered to:

- `Depression`
- `High Blood Pressure`
- `Diabetes, Type 2`

This makes the model a focused screening classifier rather than a general diagnosis model.

## Training Script

The active backend training script is:

- [application/backend/train_model.py]
This script:

1. Loads the cleaned train and test CSV files
2. Optionally includes saved user reviews
3. Filters the data to the three supported conditions
4. Removes empty review text
5. Splits the data into training and testing sets
6. Builds a text classification pipeline
7. Trains the model
8. Evaluates accuracy and classification performance
9. Saves the trained pipeline for backend prediction use

## Model Architecture

The current backend model is a text classification pipeline built with:

- `TfidfVectorizer`
- `LogisticRegression`

### TF-IDF Vectorizer

The vectorizer transforms review text into numerical features. It is configured to use:

- up to `5000` features
- `1`-gram and `2`-gram terms
- English stop word removal
- a minimum document frequency of `2`

This allows the model to learn from symptom words and common short phrases rather than raw text alone.

### Logistic Regression Classifier

The classifier is:

- `LogisticRegression`
- `max_iter=1200`
- `class_weight="balanced"`
- `random_state=42`

Logistic Regression was chosen because it performs well for sparse text features, is efficient, and provides class probabilities that can be used for confidence-based prediction handling.

## Train/Test Split

The script uses:

- `test_size=0.2`
- `random_state=42`
- `stratify=dataframe["condition"]`

This means:

- 80% of the data is used for training
- 20% is used for testing
- class proportions are preserved across training and testing

## Model Evaluation

After training, the script reports:

- accuracy
- classification report

The backend pipeline was last trained with performance approximately around:

- Accuracy: `0.9630`

Per-class performance from the recent run:

- Depression: strong precision and recall
- Diabetes, Type 2: strong precision and recall
- High Blood Pressure: slightly lower than Depression, but still strong overall

These values may change slightly if retraining includes new user-submitted reviews.

## Saved Model Artifact

The trained model is exported to:

- [application/backend/pipeline.joblib]
This artifact stores:

- the fitted text pipeline
- metadata about training
- supported target conditions
- training and test row counts
- accuracy
- class distribution information
- the classification report

The backend loads this file at startup to perform live predictions.

## How Prediction Works in the App

When a user enters symptoms on the predictor page:

1. The frontend sends the input to `POST /api/predict`
2. The backend validates the text
3. The saved `pipeline.joblib` model transforms the text through TF-IDF
4. Logistic Regression predicts the most likely condition
5. Prediction probabilities are used to calculate confidence
6. The backend returns:
   - predicted condition
   - confidence
   - clinical basis
   - summary

## Current Limitation

The model is trained on drug review text, not a dedicated medical symptom dataset. Because of that:

- it learns from the language patterns in reviews
- it may not always behave like a textbook symptom classifier
- some medically correct symptom associations may still be misclassified if the training text distribution suggests otherwise

This is why the predictor should be understood as a review-trained AI screening model rather than a clinically validated diagnosis system.

## Future Improvement Path

The model can be improved in several ways:

- retrain regularly with new user-submitted labelled reviews
- improve dataset balancing
- include curated symptom-focused examples
- compare Logistic Regression with other models
- add calibration for better confidence reliability
- expand validation rules before prediction

## Summary

The current model was created as a focused machine learning classifier that supports the app’s three-condition screening workflow. It is built from cleaned review text, trained with TF-IDF and Logistic Regression, saved as a reusable backend artifact, and designed to improve over time through retraining with newly collected labelled reviews.
