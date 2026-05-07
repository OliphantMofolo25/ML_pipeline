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
# 1. LOAD BOTH CSV FILES
# =====================================================
print("\n🚀 Loading datasets...")
df_train = pd.read_csv('cleaned_drugsComTrain.csv')
df_test  = pd.read_csv('cleaned_drugsComTest.csv')

# Tag each split so we can separate them after combined feature engineering
df_train['_split'] = 'train'
df_test['_split']  = 'test'

# =====================================================
# 2. COMBINE FOR FEATURE ENGINEERING
# =====================================================
print("\n🔗 Combining datasets for feature engineering...")
df_combined = pd.concat([df_train, df_test], ignore_index=True)

tqdm.pandas()
print("\n🧠 Computing sentiment scores...")
df_combined['sentiment_score'] = df_combined['review'].progress_apply(
    lambda x: TextBlob(str(x)).sentiment.polarity
)
print("✅ Sentiment analysis complete")

# =====================================================
# 3. SEPARATE BACK INTO TRAIN AND TEST
# =====================================================
df_train = df_combined[df_combined['_split'] == 'train'].copy()
df_test  = df_combined[df_combined['_split'] == 'test'].copy()

print(f"\n✅ Train size: {len(df_train)} | Test size: {len(df_test)}")

# =====================================================
# 4. PREPARE FEATURES
# =====================================================
X_train_text = df_train['review']
X_train_num  = df_train[['sentiment_score', 'rating', 'usefulCount']]
y_train_full = df_train['condition']

X_test_text  = df_test['review']
X_test_num   = df_test[['sentiment_score', 'rating', 'usefulCount']]
# Only use test labels for final evaluation — NOT for fitting anything
y_test_final = df_test['condition']

# =====================================================
# 5. SPLIT TRAIN → train_model + val_model
# =====================================================
print("\n✂️ Splitting train data into train_model / val_model...")
(X_tm_text, X_vm_text,
 X_tm_num,  X_vm_num,
 y_tm,      y_vm) = train_test_split(
    X_train_text, X_train_num, y_train_full,
    test_size=0.2, random_state=42
)
print("✅ Split complete")

# =====================================================
# 6. FIT TF-IDF ON train_model ONLY, TRANSFORM ALL
# =====================================================
print("\n📊 Fitting TF-IDF on train_model only...")
tfidf = TfidfVectorizer(max_features=500, stop_words='english')

X_tm_tfidf = tfidf.fit_transform(X_tm_text)          # fit + transform
X_vm_tfidf = tfidf.transform(X_vm_text)              # transform only
X_test_tfidf = tfidf.transform(X_test_text)          # transform only
print("✅ TF-IDF complete")

# =====================================================
# 7. COMBINE FEATURES
# =====================================================
print("\n🔗 Combining features...")
X_tm   = hstack([X_tm_tfidf,   X_tm_num.values])
X_vm   = hstack([X_vm_tfidf,   X_vm_num.values])
X_test_final = hstack([X_test_tfidf, X_test_num.values])

# =====================================================
# 8. TRAIN BASE LOGISTIC REGRESSION
# =====================================================
print("\n⚙️ Training base Logistic Regression...")
model = LogisticRegression(max_iter=200, solver='saga', n_jobs=-1, verbose=1)
model.fit(X_tm, y_tm)

print("\n===== BASE MODEL — Validation Set =====")
y_vm_pred = model.predict(X_vm)
print("Accuracy:", accuracy_score(y_vm, y_vm_pred))
print(classification_report(y_vm, y_vm_pred))

# =====================================================
# 9. GRID SEARCH (still on train_model / val_model)
# =====================================================
print("\n⚙️ Starting GridSearchCV...")
param_grid = {'C': [0.1, 1, 10], 'penalty': ['l2'], 'solver': ['saga']}
grid_search = GridSearchCV(
    LogisticRegression(max_iter=200), param_grid,
    cv=3, n_jobs=-1, verbose=3
)
grid_search.fit(X_tm, y_tm)
print("✅ GridSearch complete")
print("Best params:", grid_search.best_params_)

best_model = grid_search.best_estimator_

print("\n===== TUNED MODEL — Validation Set =====")
y_vm_tuned = best_model.predict(X_vm)
print("Accuracy:", accuracy_score(y_vm, y_vm_tuned))
print(classification_report(y_vm, y_vm_tuned))

# =====================================================
# 10. FINAL EVALUATION ON HELD-OUT TEST SET
#     (use this only once — at the very end)
# =====================================================
print("\n===== FINAL MODEL — Held-out Test Set =====")
y_test_pred = best_model.predict(X_test_final)
print("Test Accuracy:", accuracy_score(y_test_final, y_test_pred))
print(classification_report(y_test_final, y_test_pred))

cm_val  = confusion_matrix(y_vm, y_vm_tuned)
cm_test = confusion_matrix(y_test_final, y_test_pred)

# =====================================================
# 11. SAVE MODEL + VECTORIZER
# =====================================================
os.makedirs('models', exist_ok=True)
joblib.dump(best_model, 'models/drug_condition_model.joblib')
joblib.dump(tfidf,      'models/tfidf_vectorizer.joblib')
print("\nModel and vectorizer saved")

# =====================================================
# 12. PLOTS
# =====================================================
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
sns.heatmap(cm_val,  annot=True, fmt='d', ax=axes[0])
axes[0].set_title("Confusion Matrix — Validation Set (Tuned)")
sns.heatmap(cm_test, annot=True, fmt='d', ax=axes[1])
axes[1].set_title("Confusion Matrix — Held-out Test Set")
plt.tight_layout()
plt.show()

print("\n ALL TASKS COMPLETED SUCCESSFULLY")