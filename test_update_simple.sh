#!/bin/bash

# Simple update test for trip
# Trip ID: ac405c56-0919-4ce8-9925-e52ece79d779

TRIP_ID="ac405c56-0919-4ce8-9925-e52ece79d779"

echo "Testing simple trip update..."
curl -X PUT "http://localhost:4000/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 6000,
    "currency": "USD",
    "flexible_dates": true
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
