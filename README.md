# Justice HealthCare Analytics

## Project Intent

This project is an AI-assisted healthcare analytics application designed to support early screening and insight generation for three focused health conditions:

- Depression
- High Blood Pressure
- Type 2 Diabetes

The main intent of the project is to combine machine learning, structured data analysis, and a user-friendly dashboard so that patient-written review text and symptom descriptions can be explored in a practical, clinical-style interface.

Rather than acting as a full medical diagnosis system, the application is intended to:

- analyse review-based health data from the drug review dataset
- predict which of the three supported conditions a symptom description most closely matches
- recommend drugs associated with the predicted condition using historical review patterns
- visualise trends such as review volume, ratings, useful votes, and condition distribution
- allow new user-submitted reviews to be stored for future analytics and future model retraining

## Problem the Project Addresses

Large health review datasets contain useful signals about symptoms, treatment experiences, and medication outcomes, but those signals are difficult to interpret manually at scale. This project aims to make that information easier to understand by turning raw review data into:

- a readable dashboard
- searchable review records
- prediction support
- recommendation support

The system helps demonstrate how AI can assist healthcare decision support workflows by transforming unstructured text into meaningful insights.

## Current Scope

The application is intentionally limited to three supported conditions so that the frontend, backend, and trained model remain aligned:

- Depression
- High Blood Pressure
- Type 2 Diabetes

This means the predictor is a focused screening tool, not a general-purpose diagnosis engine.

## System Overview

The project is divided into two major parts:

### Frontend

The frontend provides the interactive user experience. It includes:

- a dashboard for dataset summaries and visual trends
- a reviews page for browsing patient reviews
- a predictor page for entering symptoms and receiving a condition prediction
- a review submission section where new reviews can be added

### Backend

The backend provides the data and AI services. It is responsible for:

- loading and combining cleaned CSV datasets
- serving dashboard statistics
- serving paginated and filtered reviews
- running the trained prediction model
- generating drug recommendations from historical review data
- storing user-submitted reviews in a separate CSV file for future use

## Machine Learning Intent

The machine learning component of the project is designed to classify symptom or review-style input into one of the supported conditions using text learned from the cleaned dataset.

The intent is not only to make predictions, but also to create a feedback-driven system where:

- historical dataset reviews inform the initial model
- user-submitted reviews are stored separately
- those new reviews can later be included in retraining
- the model can improve over time as more labelled examples are collected

## Intended Outcome

The intended outcome of the project is a working end-to-end healthcare analytics platform that can:

- present useful health review insights visually
- classify symptom descriptions into the supported condition set
- suggest relevant medication options from prior review patterns
- collect new user data for future improvement

## Group Members

Makhala Matsoso 901017223
Molefe Mofolo 901017233
Maisa Nkhabu  901017312
Thapelo Masienyane 901017309
Bahlakoana Mejaro 901017146
Thabo Mafokane 901017247