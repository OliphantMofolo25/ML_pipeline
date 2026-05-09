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
# 1. LOAD DATA
# =====================================================
print("\n Loading datasets...")
df_train = pd.read_csv('cleaned_drugsComTrain.csv')
df_test  = pd.read_csv('cleaned_drugsComTest.csv')
print(f"Raw train size: {len(df_train)} | Raw test size: {len(df_test)}")

# =====================================================
# 2. FILTER TO 3 TARGET CONDITIONS ONLY
# =====================================================
TARGET_CONDITIONS = ['Depression', 'High Blood Pressure', 'Diabetes, Type 2']

df_train = df_train[df_train['condition'].isin(TARGET_CONDITIONS)].copy()
df_test  = df_test[df_test['condition'].isin(TARGET_CONDITIONS)].copy()

print("\nTrain distribution:\n", df_train['condition'].value_counts())
print("\nTest distribution:\n",  df_test['condition'].value_counts())

# =====================================================
# 3. SENTIMENT SCORES
#    Compute on combined to avoid repeating work,
#    but fit nothing here — pure transformation.
# =====================================================
print("\n Computing sentiment scores...")
df_train['_split'] = 'train'
df_test['_split']  = 'test'
df_combined = pd.concat([df_train, df_test], ignore_index=True)

tqdm.pandas()
df_combined['sentiment_score'] = df_combined['review'].progress_apply(
    lambda x: TextBlob(str(x)).sentiment.polarity
)
print("Sentiment analysis complete")

df_train = df_combined[df_combined['_split'] == 'train'].copy()
df_test  = df_combined[df_combined['_split'] == 'test'].copy()
print(f"\nFiltered train size: {len(df_train)} | Filtered test size: {len(df_test)}")

# =====================================================
# 4. PREPARE FEATURES
# =====================================================
X_train_text = df_train['review']
X_train_num  = df_train[['sentiment_score', 'rating', 'usefulCount']]
y_train_full = df_train['condition']

X_test_text  = df_test['review']
X_test_num   = df_test[['sentiment_score', 'rating', 'usefulCount']]
y_test_final = df_test['condition']

# =====================================================
# 5. TRAIN / VALIDATION SPLIT``
#    stratify= ensures all 3 classes are proportionally
#    represented in both train and validation sets.
# =====================================================
print("\n Splitting train → train_model / val_model...")
(X_tm_text, X_vm_text,
 X_tm_num,  X_vm_num,
 y_tm,      y_vm) = train_test_split(
    X_train_text, X_train_num, y_train_full,
    test_size=0.2, random_state=42, stratify=y_train_full
)
print(f"train_model size: {len(y_tm)} | val_model size: {len(y_vm)}")

# =====================================================
# 6. TF-IDF VECTORIZER
#    - fit ONLY on train_model, transform all splits
#    - ngram_range=(1,2) captures phrases like
#      "blood pressure", "type 2", "feeling depressed"
#    - max_features=3000 gives rich vocabulary for
#      3 focused conditions
# =====================================================
print("\n Fitting TF-IDF on train_model only...")
tfidf = TfidfVectorizer(
    max_features=3000,
    stop_words='english',
    ngram_range=(1, 2)
)

X_tm_tfidf   = tfidf.fit_transform(X_tm_text)   # fit + transform
X_vm_tfidf   = tfidf.transform(X_vm_text)        # transform only
X_test_tfidf = tfidf.transform(X_test_text)      # transform only
print("TF-IDF complete")

# =====================================================
# 7. COMBINE TEXT + NUMERICAL FEATURES
# =====================================================
print("\n Combining TF-IDF + numerical features...")
X_tm         = hstack([X_tm_tfidf,   X_tm_num.values])
X_vm         = hstack([X_vm_tfidf,   X_vm_num.values])
X_test_final = hstack([X_test_tfidf, X_test_num.values])
print(f"Feature matrix shape (train): {X_tm.shape}")

# =====================================================
# 8. BASE LOGISTIC REGRESSION MODEL
#    - class_weight='balanced' compensates for the
#      Depression class dominating (~9000 vs ~2500)
#    - max_iter=3000 ensures convergence
#    - n_jobs removed (deprecated in sklearn 1.8)
# =====================================================
print("\n Training base Logistic Regression...")
base_model = LogisticRegression(
    max_iter=3000,
    solver='saga',
    class_weight='balanced'
)
base_model.fit(X_tm, y_tm)

print("\n===== BASE MODEL — Validation Set =====")
y_vm_pred = base_model.predict(X_vm)
print("Accuracy:", round(accuracy_score(y_vm, y_vm_pred), 4))
print(classification_report(y_vm, y_vm_pred, target_names=TARGET_CONDITIONS))

# =====================================================
# 9. HYPERPARAMETER TUNING — GRID SEARCH
#    - Searches over C (regularisation strength)
#    - scoring='f1_weighted' is better than accuracy
#      for slightly imbalanced classes
#    - cv=5 gives reliable cross-validation estimates
#    - penalty param removed (deprecated in sklearn 1.8)
# =====================================================
print("\n Starting GridSearchCV...")
param_grid = {'C': [0.1, 1, 10, 100]}

grid_search = GridSearchCV(
    LogisticRegression(
        max_iter=3000,
        solver='saga',
        class_weight='balanced'
    ),
    param_grid,
    cv=5,
    scoring='f1_weighted',
    verbose=2
)
grid_search.fit(X_tm, y_tm)

print("\nBest params:", grid_search.best_params_)
print("Best CV f1_weighted:", round(grid_search.best_score_, 4))
best_model = grid_search.best_estimator_

print("\n===== TUNED MODEL — Validation Set =====")
y_vm_tuned = best_model.predict(X_vm)
print("Accuracy:", round(accuracy_score(y_vm, y_vm_tuned), 4))
print(classification_report(y_vm, y_vm_tuned, target_names=TARGET_CONDITIONS))

# =====================================================
# 10. FINAL EVALUATION ON HELD-OUT TEST SET
# =====================================================
print("\n===== FINAL MODEL — Held-out Test Set =====")
y_test_pred = best_model.predict(X_test_final)
print("Test Accuracy:", round(accuracy_score(y_test_final, y_test_pred), 4))
print(classification_report(y_test_final, y_test_pred, target_names=TARGET_CONDITIONS))

# =====================================================
# 11. CONFUSION MATRICES
# =====================================================
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

sns.heatmap(
    confusion_matrix(y_vm, y_vm_tuned, labels=TARGET_CONDITIONS),
    annot=True, fmt='d', cmap='Blues', ax=axes[0],
    xticklabels=TARGET_CONDITIONS,
    yticklabels=TARGET_CONDITIONS
)
axes[0].set_title("Confusion Matrix — Validation Set (Tuned)")
axes[0].set_ylabel("Actual")
axes[0].set_xlabel("Predicted")

sns.heatmap(
    confusion_matrix(y_test_final, y_test_pred, labels=TARGET_CONDITIONS),
    annot=True, fmt='d', cmap='Blues', ax=axes[1],
    xticklabels=TARGET_CONDITIONS,
    yticklabels=TARGET_CONDITIONS
)
axes[1].set_title("Confusion Matrix — Held-out Test Set")
axes[1].set_ylabel("Actual")
axes[1].set_xlabel("Predicted")

plt.tight_layout()
plt.savefig('models/confusion_matrices.png', dpi=150, bbox_inches='tight')
plt.show()
print("Confusion matrix plot saved")

# =====================================================
# 12. SAVE MODEL + VECTORIZER
# =====================================================
os.makedirs('models', exist_ok=True)
joblib.dump(best_model, 'models/drug_condition_model.joblib')
joblib.dump(tfidf,      'models/tfidf_vectorizer.joblib')
print("\n Model and vectorizer saved to /models/")

print("\n ALL TASKS COMPLETED SUCCESSFULLY")