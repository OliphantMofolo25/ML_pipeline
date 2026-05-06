import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from textblob import TextBlob
from scipy.sparse import hstack
from tqdm import tqdm

# =====================================================
# 🚀 1. LOAD DATA
# =====================================================
print("\n🚀 Loading dataset...")
df = pd.read_csv('cleaned_drugsComTest.csv')
print("✅ Dataset loaded successfully")

# =====================================================
# 🧠 2. FEATURE ENGINEERING
# =====================================================
print("\n🧠 Computing sentiment scores...")

tqdm.pandas()

df['sentiment_score'] = df['review'].progress_apply(
    lambda x: TextBlob(str(x)).sentiment.polarity
)

print("✅ Sentiment analysis complete")

X_text = df['review']
X_numeric = df[['sentiment_score', 'rating', 'usefulCount']]
y = df['condition']

# =====================================================
# ✂️ 3. TRAIN-TEST SPLIT
# =====================================================
print("\n✂️ Splitting dataset...")

X_train_text, X_test_text, X_train_num, X_test_num, y_train, y_test = train_test_split(
    X_text, X_numeric, y,
    test_size=0.2,
    random_state=42
)

print("✅ Data split complete")

# =====================================================
# 📊 4. TF-IDF
# =====================================================
print("\n📊 Applying TF-IDF...")

tfidf = TfidfVectorizer(max_features=500, stop_words='english')

X_train_tfidf = tfidf.fit_transform(X_train_text)
X_test_tfidf = tfidf.transform(X_test_text)

print("✅ TF-IDF complete")

# =====================================================
# 🔗 5. COMBINE FEATURES
# =====================================================
print("\n🔗 Combining features...")

X_train = hstack([X_train_tfidf, X_train_num.values])
X_test = hstack([X_test_tfidf, X_test_num.values])

print("✅ Feature matrix ready")

# =====================================================
# ⚙️ 6. LOGISTIC REGRESSION MODEL
# =====================================================
print("\n⚙️ Training Logistic Regression model...")

model = LogisticRegression(
    max_iter=200,
    solver='saga',
    n_jobs=-1,
    verbose=1
)

model.fit(X_train, y_train)

print("✅ Logistic Regression training complete")

# =====================================================
# 📌 7. BASE MODEL PREDICTION
# =====================================================
print("\n📌 Evaluating base model...")

y_pred = model.predict(X_test)

print("\n===== TASK 4: BASE MODEL RESULTS =====")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

cm = confusion_matrix(y_test, y_pred)

# =====================================================
# ⚙️ 8. GRID SEARCH
# =====================================================
print("\n⚙️ Starting GridSearchCV...")

param_grid = {
    'C': [0.1, 1, 10],
    'penalty': ['l2'],
    'solver': ['saga']
}

grid_search = GridSearchCV(
    LogisticRegression(max_iter=200),
    param_grid,
    cv=3,
    n_jobs=-1,
    verbose=3
)

grid_search.fit(X_train, y_train)

print("✅ GridSearch complete")

# =====================================================
# 🏆 9. BEST MODEL
# =====================================================
best_model = grid_search.best_estimator_

print("\n===== TASK 5: BEST PARAMETERS =====")
print(grid_search.best_params_)

# =====================================================
# 📌 10. FINAL MODEL PREDICTION
# =====================================================
print("\n📌 Evaluating tuned model...")

y_pred_tuned = best_model.predict(X_test)

print("\n===== TASK 5: TUNED MODEL RESULTS =====")
print("Tuned Accuracy:", accuracy_score(y_test, y_pred_tuned))
print("\nTuned Classification Report:\n", classification_report(y_test, y_pred_tuned))

cm2 = confusion_matrix(y_test, y_pred_tuned)

# =====================================================
# 💾 11. SAVE MODEL (FIXED)
# =====================================================
print("\n💾 Saving model and vectorizer...")

# Create folder
os.makedirs('models', exist_ok=True)

# Save files
model_path = 'models/drug_condition_model.joblib'
vectorizer_path = 'models/tfidf_vectorizer.joblib'

joblib.dump(best_model, model_path)
joblib.dump(tfidf, vectorizer_path)

# Confirm files exist
print("📂 Current directory:", os.getcwd())
print("Model saved:", os.path.exists(model_path))
print("Vectorizer saved:", os.path.exists(vectorizer_path))

# =====================================================
# 📊 12. PLOTS (AFTER SAVING)
# =====================================================
plt.figure()
sns.heatmap(cm, annot=True, fmt='d')
plt.title("Confusion Matrix - Logistic Regression")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()

plt.figure()
sns.heatmap(cm2, annot=True, fmt='d')
plt.title("Confusion Matrix - Tuned Logistic Regression")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()

print("\n🎉 ALL TASKS COMPLETED SUCCESSFULLY")