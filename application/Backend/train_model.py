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
print('Pipeline saved successfully.')