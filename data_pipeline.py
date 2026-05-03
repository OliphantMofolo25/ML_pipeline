
# =========================
# 📦 1. IMPORT LIBRARIES
# =========================

import pandas as pd
import numpy as np

import matplotlib.pyplot as plt
import seaborn as sns

import re
import html

import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.preprocessing import MinMaxScaler, LabelEncoder

from scipy.sparse import hstack

# =========================
# 📥 2. NLTK SETUP (FIXED)
# =========================

nltk.download('punkt')
nltk.download('punkt_tab')   # ✅ FIX FOR YOUR ERROR
nltk.download('stopwords')

stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()

# =========================
# 📊 3. LOAD DATASET
# =========================

df = pd.read_csv("drugsComTrain_raw.csv")

print("\nInitial Data Info:")
print(df.head())
print(df.info())

# =========================
# 🔹 TASK 1A — MISSING VALUES
# =========================

print("\nMissing Values Before:")
print(df.isnull().sum())

df = df.dropna(subset=['condition', 'review'])

df['rating'] = df['rating'].fillna(df['rating'].median())
df['usefulCount'] = df['usefulCount'].fillna(df['usefulCount'].median())

print("\nMissing Values After:")
print(df.isnull().sum())

# =========================
# 🔹 TASK 1B — OUTLIERS
# =========================

plt.figure()
sns.boxplot(x=df['usefulCount'])
plt.title("Outliers in usefulCount (Before)")
plt.show()

df = df[(df['rating'] >= 1) & (df['rating'] <= 10)]

Q1 = df['usefulCount'].quantile(0.25)
Q3 = df['usefulCount'].quantile(0.75)
IQR = Q3 - Q1

upper_bound = Q3 + 1.5 * IQR
df = df[df['usefulCount'] <= upper_bound]

plt.figure()
sns.boxplot(x=df['usefulCount'])
plt.title("Outliers in usefulCount (After)")
plt.show()

# =========================
# 🔹 TASK 1C — STATISTICS
# =========================

print("\nDescriptive Statistics:")
print(df.describe())

print("\nCondition Distribution:")
print(df['condition'].value_counts())

# =========================
# 🔹 TASK 2A — TEXT CLEANING + NLP (FIXED SAFETY)
# =========================

def clean_text(text):
    if pd.isna(text):
        return ""

    text = str(text).lower()
    text = html.unescape(text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-z\s]', '', text)

    tokens = word_tokenize(text)

    filtered = []
    for word in tokens:
        if word not in stop_words:
            filtered.append(stemmer.stem(word))

    return " ".join(filtered)

df['clean_review'] = df['review'].apply(clean_text)

# =========================
# TF-IDF VECTORISATION
# =========================

tfidf = TfidfVectorizer(max_features=10000)
X_text = tfidf.fit_transform(df['clean_review'])

# =========================
# COMBINE NUMERIC FEATURES
# =========================

numeric_features = df[['rating', 'usefulCount']].values

scaler = MinMaxScaler()
numeric_features = scaler.fit_transform(numeric_features)

X = hstack([X_text, numeric_features])

# =========================
# 🔹 TASK 2B — FEATURE TUNING
# =========================

encoder = LabelEncoder()
y = encoder.fit_transform(df['condition'])

# ✅ SHOW HUMAN-READABLE LABELS
class_names = encoder.classes_

print("\n📌 Condition Mapping (Readable Labels):")
for i, name in enumerate(class_names):
    print(f"{i} → {name}")

selector = SelectKBest(score_func=chi2, k=500)
X_selected = selector.fit_transform(X, y)

# =========================
# FINAL OUTPUT CHECK
# =========================

print("\nFinal Feature Matrix Shape:")
print(X_selected.shape)

print("\nPIPELINE COMPLETE ✔")