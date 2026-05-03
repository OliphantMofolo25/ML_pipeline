import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# NLP imports
from textblob import TextBlob
from sklearn.feature_extraction.text import TfidfVectorizer

# Load dataset
df = pd.read_csv('drugsComTest_raw.csv')

# -------------------------------
# 1. Missing values
# -------------------------------
missing = df.isnull().sum()
missing = missing[missing > 0]

print("Missing values per column:")
print(missing)
print("\nTotal missing values:", missing.sum())

missing.plot(kind='bar')
plt.title('Missing Values per Column')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# -------------------------------
# 2. Handle missing values
# -------------------------------
df = df.dropna(subset=['condition', 'review'])

# =====================================================
# 🧠 3. FEATURE EXTRACTION - SENTIMENT
# =====================================================
df['sentiment_score'] = df['review'].apply(
    lambda x: TextBlob(str(x)).sentiment.polarity
)

# =====================================================
# 📅 4. DATE FEATURE EXTRACTION (ADDED)
# =====================================================
df['date'] = pd.to_datetime(df['date'])

df['review_year'] = df['date'].dt.year
df['review_month'] = df['date'].dt.month
df['review_dayofweek'] = df['date'].dt.dayofweek

# =====================================================
# ✍️ 5. REVIEW LENGTH FEATURES (NICE ADDITION)
# =====================================================
df['review_length'] = df['review'].apply(lambda x: len(str(x)))
df['word_count'] = df['review'].apply(lambda x: len(str(x).split()))

# -------------------------------
# 6. Outlier detection (IQR)
# -------------------------------
Q1 = df['usefulCount'].quantile(0.25)
Q3 = df['usefulCount'].quantile(0.75)
IQR = Q3 - Q1

lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

outliers = df[(df['usefulCount'] < lower_bound) |
              (df['usefulCount'] > upper_bound)]

print("\nNumber of outliers in 'usefulCount':", len(outliers))

# -------------------------------
# 7. Remove outliers
# -------------------------------
df_cleaned = df[(df['usefulCount'] >= lower_bound) &
                (df['usefulCount'] <= upper_bound)]

# =====================================================
# 🧠 8. TF-IDF FEATURE EXTRACTION + MERGE
# =====================================================
tfidf = TfidfVectorizer(max_features=100, stop_words='english')

tfidf_matrix = tfidf.fit_transform(df_cleaned['review'])

tfidf_df = pd.DataFrame(
    tfidf_matrix.toarray(),
    columns=tfidf.get_feature_names_out()
)

# MERGE TF-IDF WITH MAIN DATASET (IMPORTANT FIX)
df_cleaned = pd.concat(
    [df_cleaned.reset_index(drop=True), tfidf_df],
    axis=1
)

print("\nTF-IDF successfully merged into dataset.")

# -------------------------------
# 9. Save cleaned dataset
# -------------------------------
df_cleaned.to_csv('cleaned_drugsComTest.csv', index=False)

print("\nCleaning complete. File saved.")

# =====================================================
# 📊 10. DESCRIPTIVE STATISTICS
# =====================================================
print("\nDescriptive Statistics (Rating):")
print(df_cleaned['rating'].describe())

print("\nDescriptive Statistics (UsefulCount):")
print(df_cleaned['usefulCount'].describe())

# =====================================================
# 📈 11. DISTRIBUTION SHAPES
# =====================================================
plt.figure(figsize=(8,5))
sns.histplot(df_cleaned['rating'], kde=True, color='purple')
plt.title('Distribution of Drug Ratings')
plt.show()

plt.figure(figsize=(8,5))
sns.histplot(df_cleaned['usefulCount'], kde=True, color='teal')
plt.title('Distribution of Useful Count (After Outlier Removal)')
plt.show()

# =====================================================
# 📐 12. SKEWNESS ANALYSIS
# =====================================================
rating_skew = df_cleaned['rating'].skew()
useful_skew = df_cleaned['usefulCount'].skew()

print("\nSkewness Results:")
print("Rating Skewness:", rating_skew)
print("UsefulCount Skewness:", useful_skew)

if useful_skew > 1:
    print("UsefulCount is highly positively skewed.")
elif useful_skew < -1:
    print("UsefulCount is highly negatively skewed.")
else:
    print("UsefulCount is approximately symmetric.")

# =====================================================
# 🔗 13. CORRELATION HEATMAP
# =====================================================
plt.figure(figsize=(6,4))

corr = df_cleaned[['rating', 'usefulCount', 'sentiment_score']].corr()

sns.heatmap(corr, annot=True, cmap='coolwarm')

plt.title('Correlation Between Rating, Useful Count, and Sentiment')
plt.show()