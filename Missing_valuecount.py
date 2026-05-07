import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from textblob import TextBlob

# ── Load both raw files ──────────────────────────────────────
df_train = pd.read_csv('drugsComTrain_raw.csv')
df_test  = pd.read_csv('drugsComTest_raw.csv')

# ── Compute shared outlier bound BEFORE the loop ─────────────
# Must be done on combined data so both files use identical threshold
combined_useful = pd.concat([df_train['usefulCount'],
                             df_test['usefulCount']])
Q1 = combined_useful.quantile(0.25)
Q3 = combined_useful.quantile(0.75)
IQR = Q3 - Q1
upper_bound = Q3 + 3 * IQR  # 3x for skewed data

print(f"Shared usefulCount upper bound: {upper_bound:.2f}")

# ── Clean each file individually ─────────────────────────────
cleaned_frames = []

for df, out_name in [(df_train, 'cleaned_drugsComTrain.csv'),
                     (df_test,  'cleaned_drugsComTest.csv')]:

    print(f"\n{'='*50}")
    print(f"Processing: {out_name}")
    print(f"{'='*50}")

    # ---------------------------------------------------
    # 1. MISSING VALUES — report raw state of THIS file
    # ---------------------------------------------------
    missing = df.isnull().sum()
    missing = missing[missing > 0]

    print("\nMissing values per column:")
    print(missing)
    print("Total missing values:", missing.sum())

    if not missing.empty:
        missing.plot(kind='bar')
        plt.title(f'Missing Values — {out_name}')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()

    # ---------------------------------------------------
    # 2. HANDLE MISSING VALUES
    # ---------------------------------------------------
    df = df.dropna(subset=['condition', 'review'])
    df['rating']      = pd.to_numeric(df['rating'],      errors='coerce')
    df['usefulCount'] = pd.to_numeric(df['usefulCount'], errors='coerce')
    df['date']        = pd.to_datetime(df['date'],        errors='coerce')
    df = df.dropna(subset=['rating', 'usefulCount', 'date'])
    df = df[df['rating'].between(1, 10)]

    print(f"\nRows after missing value removal: {len(df)}")

    # ---------------------------------------------------
    # 3. FEATURE EXTRACTION — SENTIMENT
    # ---------------------------------------------------
    df['sentiment_score'] = df['review'].apply(
        lambda x: TextBlob(str(x)).sentiment.polarity
    )
    print("Sentiment scores computed")

    # ---------------------------------------------------
    # 4. DATE FEATURE EXTRACTION
    # ---------------------------------------------------
    df['review_year']      = df['date'].dt.year
    df['review_month']     = df['date'].dt.month
    df['review_dayofweek'] = df['date'].dt.dayofweek

    # ---------------------------------------------------
    # 5. REVIEW LENGTH FEATURES
    # ---------------------------------------------------
    df['review_length'] = df['review'].apply(lambda x: len(str(x)))
    df['word_count']    = df['review'].apply(lambda x: len(str(x).split()))

    # ---------------------------------------------------
    # 6. OUTLIER DETECTION — report using shared bound
    # ---------------------------------------------------
    outliers = df[df['usefulCount'] > upper_bound]
    print(f"\nOutliers detected in usefulCount: {len(outliers)}")
    print(f"Using shared upper bound: {upper_bound:.2f}")

    # ---------------------------------------------------
    # 7. HANDLE OUTLIERS — clip, not drop
    # ---------------------------------------------------
    df['usefulCount'] = df['usefulCount'].clip(upper=upper_bound)
    print(f"Rows after outlier clipping: {len(df)}")

    # ---------------------------------------------------
    # SAVE
    # ---------------------------------------------------
    df.to_csv(out_name, index=False)
    print(f"\nSaved → {out_name}")
    cleaned_frames.append(df)


# ── Combined analysis on both cleaned files ──────────────────
df_analysis = pd.concat(cleaned_frames, ignore_index=True)

# 10. DESCRIPTIVE STATISTICS
print("\nDescriptive Statistics (Rating):")
print(df_analysis['rating'].describe())

print("\nDescriptive Statistics (UsefulCount):")
print(df_analysis['usefulCount'].describe())

# 11. DISTRIBUTION SHAPES
plt.figure(figsize=(8, 5))
sns.histplot(df_analysis['rating'], kde=True, color='purple')
plt.title('Distribution of Drug Ratings (Full Dataset)')
plt.show()

plt.figure(figsize=(8, 5))
sns.histplot(df_analysis['usefulCount'], kde=True, color='teal')
plt.title('Distribution of Useful Count (After Outlier Removal)')
plt.show()

# 12. SKEWNESS ANALYSIS
rating_skew = df_analysis['rating'].skew()
useful_skew = df_analysis['usefulCount'].skew()

print("\nSkewness Results:")
print("Rating Skewness:", rating_skew)
print("UsefulCount Skewness:", useful_skew)

if useful_skew > 1:
    print("UsefulCount is highly positively skewed.")
elif useful_skew < -1:
    print("UsefulCount is highly negatively skewed.")
else:
    print("UsefulCount is approximately symmetric.")

# 13. CORRELATION HEATMAP
plt.figure(figsize=(6, 4))
corr = df_analysis[['rating', 'usefulCount', 'sentiment_score']].corr()
sns.heatmap(corr, annot=True, cmap='coolwarm')
plt.title('Correlation — Rating, Useful Count, Sentiment (Full Dataset)')
plt.show()