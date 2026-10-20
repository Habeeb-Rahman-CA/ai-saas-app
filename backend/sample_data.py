import os
import pandas as pd
import numpy as np

def generate_sample_datasets():
    os.makedirs("data/samples", exist_ok=True)
    np.random.seed(42)

    # 1. Customer Churn Dataset (Classification)
    n_samples = 400
    tenure = np.random.randint(1, 72, size=n_samples)
    monthly_charges = np.random.uniform(20.0, 115.0, size=n_samples)
    contract = np.random.choice(["Month-to-month", "One year", "Two year"], size=n_samples, p=[0.55, 0.25, 0.20])
    internet_service = np.random.choice(["Fiber optic", "DSL", "No"], size=n_samples, p=[0.45, 0.35, 0.20])
    tech_support = np.random.choice(["Yes", "No"], size=n_samples, p=[0.3, 0.7])
    paperless_billing = np.random.choice(["Yes", "No"], size=n_samples, p=[0.6, 0.4])
    
    # Calculate churn probability based on features
    churn_score = (
        (monthly_charges / 100.0) * 1.5
        - (tenure / 72.0) * 2.0
        + (contract == "Month-to-month") * 1.2
        + (tech_support == "No") * 0.8
        + np.random.normal(0, 0.5, size=n_samples)
    )
    churn = (churn_score > np.percentile(churn_score, 70)).astype(int)

    df_churn = pd.DataFrame({
        "customer_id": [f"CUST-{1000 + i}" for i in range(n_samples)],
        "tenure_months": tenure,
        "monthly_charges": np.round(monthly_charges, 2),
        "total_charges": np.round(monthly_charges * tenure + np.random.uniform(5, 50, size=n_samples), 2),
        "contract": contract,
        "internet_service": internet_service,
        "tech_support": tech_support,
        "paperless_billing": paperless_billing,
        "churn": churn
    })

    train_churn = df_churn.iloc[:320]
    test_churn = df_churn.iloc[320:].drop(columns=["churn"])

    train_churn.to_csv("data/samples/customer_churn_train.csv", index=False)
    test_churn.to_csv("data/samples/customer_churn_test.csv", index=False)

    # 2. Housing Prices Dataset (Regression)
    n_houses = 350
    sqft = np.random.randint(800, 4500, size=n_houses)
    bedrooms = np.random.randint(1, 6, size=n_houses)
    bathrooms = np.round(bedrooms * 0.75 + np.random.uniform(0, 1, size=n_houses), 1)
    location = np.random.choice(["Downtown", "Suburbs", "Rural", "Waterfront"], size=n_houses, p=[0.35, 0.45, 0.15, 0.05])
    age = np.random.randint(1, 50, size=n_houses)
    garage_spaces = np.random.randint(0, 3, size=n_houses)

    loc_multiplier = {"Downtown": 1.4, "Suburbs": 1.1, "Rural": 0.8, "Waterfront": 1.9}
    base_price = (
        sqft * 160 +
        bedrooms * 25000 +
        bathrooms * 30000 +
        garage_spaces * 15000 -
        age * 1200 +
        np.random.normal(0, 30000, size=n_houses)
    )
    price = np.round([base_price[i] * loc_multiplier[location[i]] for i in range(n_houses)], -2)

    df_housing = pd.DataFrame({
        "property_id": [f"PROP-{2000 + i}" for i in range(n_houses)],
        "sqft_living": sqft,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "location": location,
        "age_years": age,
        "garage_spaces": garage_spaces,
        "sale_price": price
    })

    train_housing = df_housing.iloc[:280]
    test_housing = df_housing.iloc[280:].drop(columns=["sale_price"])

    train_housing.to_csv("data/samples/housing_prices_train.csv", index=False)
    test_housing.to_csv("data/samples/housing_prices_test.csv", index=False)
    print("Sample datasets generated in data/samples/")

if __name__ == "__main__":
    generate_sample_datasets()

