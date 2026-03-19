# Don't run this file. It is used to seed the database.

import pandas as pd
import psycopg2
import json
import os
from dotenv import load_dotenv

# Load DATABASE_URL from .env.local
load_dotenv('.env.local')
DATABASE_URL = os.getenv('DATABASE_URL')

# ── Update these paths to your CSV files ────────────────────
DESTINATIONS_CSV = 'destination_dataset/destinations_final.csv'
HISTORICAL_CSV   = 'destination_dataset/historical_trips_final.csv'
# ────────────────────────────────────────────────────────────

conn = psycopg2.connect(DATABASE_URL, sslmode='require')
cur  = conn.cursor()

# ============================================================
# 1. SEED DESTINATIONS
# ============================================================
print('Seeding destinations...')

df = pd.read_csv(DESTINATIONS_CSV)

for _, row in df.iterrows():
    cur.execute("""
        INSERT INTO destinations (
            city, country, region, short_description,
            latitude, longitude,
            avg_temp_monthly, ideal_durations, budget_level,
            culture, adventure, nature, beaches,
            nightlife, cuisine, wellness, urban, seclusion,
            categories, best_time_to_visit
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s,
            %s::jsonb, %s::jsonb, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s
        )
        ON CONFLICT DO NOTHING
    """, (
        row['city'],
        row['country'],
        row['region']             if pd.notna(row['region'])             else None,
        row['short_description']  if pd.notna(row['short_description'])  else None,
        row['latitude']           if pd.notna(row['latitude'])           else None,
        row['longitude']          if pd.notna(row['longitude'])          else None,
        row['avg_temp_monthly']   if pd.notna(row['avg_temp_monthly'])   else None,
        row['ideal_durations']    if pd.notna(row['ideal_durations'])    else None,
        row['budget_level']       if pd.notna(row['budget_level'])       else None,
        int(row['culture'])       if pd.notna(row['culture'])            else None,
        int(row['adventure'])     if pd.notna(row['adventure'])          else None,
        int(row['nature'])        if pd.notna(row['nature'])             else None,
        int(row['beaches'])       if pd.notna(row['beaches'])            else None,
        int(row['nightlife'])     if pd.notna(row['nightlife'])          else None,
        int(row['cuisine'])       if pd.notna(row['cuisine'])            else None,
        int(row['wellness'])      if pd.notna(row['wellness'])           else None,
        int(row['urban'])         if pd.notna(row['urban'])              else None,
        int(row['seclusion'])     if pd.notna(row['seclusion'])          else None,
        row['categories']         if pd.notna(row['categories'])         else None,
        row['best_time_to_visit'] if pd.notna(row['best_time_to_visit']) else None,
    ))

conn.commit()
print(f'✅ Destinations seeded: {len(df)} rows')

# ============================================================
# 2. SEED HISTORICAL TRIPS
# ============================================================
print('Seeding historical trips...')

df2 = pd.read_csv(HISTORICAL_CSV)

for _, row in df2.iterrows():
    cur.execute("""
        INSERT INTO historical_trips (
            destination, duration_days, traveler_age,
            traveler_gender, traveler_nationality,
            accommodation_type, accommodation_cost,
            transportation_type, transportation_cost
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        row['destination']           if pd.notna(row['destination'])           else None,
        row['duration_days']         if pd.notna(row['duration_days'])         else None,
        row['traveler_age']          if pd.notna(row['traveler_age'])          else None,
        row['traveler_gender']       if pd.notna(row['traveler_gender'])       else None,
        row['traveler_nationality']  if pd.notna(row['traveler_nationality'])  else None,
        row['accommodation_type']    if pd.notna(row['accommodation_type'])    else None,
        row['accommodation_cost']    if pd.notna(row['accommodation_cost'])    else None,
        row['transportation_type']   if pd.notna(row['transportation_type'])   else None,
        row['transportation_cost']   if pd.notna(row['transportation_cost'])   else None,
    ))

conn.commit()
print(f'✅ Historical trips seeded: {len(df2)} rows')

# ── Cleanup ──────────────────────────────────────────────────
cur.close()
conn.close()
print('Done. Database connection closed.')