#!/bin/bash

# Test script for updating a trip
# Trip ID: ac405c56-0919-4ce8-9925-e52ece79d779

TRIP_ID="ac405c56-0919-4ce8-9925-e52ece79d779"
BASE_URL="http://localhost:4111"

echo "=== Testing Trip Update Functionality ==="
echo "Trip ID: $TRIP_ID"
echo ""

# Test 1: Update basic trip information
echo "1. Testing basic trip update (destinations, dates, budget)..."
curl -X PUT "$BASE_URL/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "destinations": ["Paris", "Rome", "Barcelona"],
    "start_date": "2024-04-10",
    "end_date": "2024-04-20",
    "budget": 4500,
    "currency": "EUR"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 2: Update preferences and activities
echo "2. Testing preferences and activities update..."
curl -X PUT "$BASE_URL/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "accommodation": "boutique hotels",
      "activities": ["museums", "fine dining", "art galleries"],
      "pace": "relaxed",
      "group_size": "couple"
    },
    "things_to_do": {
      "Paris": ["Louvre Museum", "Eiffel Tower", "Seine River cruise"],
      "Rome": ["Colosseum", "Vatican City", "Trevi Fountain"],
      "Barcelona": ["Sagrada Familia", "Park Güell", "Gothic Quarter"]
    }
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 3: Update transportation and dietary preferences
echo "3. Testing transportation and dietary preferences update..."
curl -X PUT "$BASE_URL/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "transportation": ["flight", "train", "metro"],
    "food_dietary": ["vegetarian", "no nuts"],
    "starting_point": "London",
    "end_point": "London"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 4: Update single field
echo "4. Testing single field update (budget only)..."
curl -X PUT "$BASE_URL/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 5500
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 5: Update with itinerary and tasks
echo "5. Testing itinerary and tasks update..."
curl -X PUT "$BASE_URL/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "itinerary": {
      "day_1": {
        "date": "2024-04-10",
        "city": "Paris",
        "activities": ["Arrive at hotel", "Evening stroll along Seine"]
      },
      "day_2": {
        "date": "2024-04-11",
        "city": "Paris",
        "activities": ["Louvre Museum", "Lunch at café", "Eiffel Tower"]
      }
    },
    "tasks": {
      "pre_trip": ["Book flights", "Reserve hotels", "Get travel insurance"],
      "packing": ["Pack clothes", "Prepare documents", "Currency exchange"]
    }
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "=== Update Tests Completed ==="
