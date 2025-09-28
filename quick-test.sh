#!/bin/bash

# Quick test script for BackpackMate AI
BACKEND_URL="http://localhost:4123/api"

echo "🧪 Testing BackpackMate AI on $BACKEND_URL"
echo "============================================"

# Test data matching your trip details
test_data='{
  "destinations": ["New York"],
  "starting_point": "Boston",
  "end_point": "Boston",
  "dates": "2025-09-28 to 2025-10-01",
  "flexible_dates": false,
  "preferences": "city exploration, culture, food",
  "transportation": ["flight"],
  "things_to_do": ["museums", "restaurants", "sightseeing"],
  "food_dietary": ["no restrictions"],
  "citizenship": "United States",
  "budget": "1500",
  "currency": "USD",
  "purpose_of_trip": ["leisure"]
}'

echo -e "\n📍 Testing trip creation with your data..."
echo "Data: $(echo "$test_data" | jq -c '.' 2>/dev/null || echo "$test_data")"
echo ""

# Make the request
response=$(curl -s -w "\n%{http_code}" -X POST \
    "$BACKEND_URL/trips/from-answers" \
    -H "Content-Type: application/json" \
    -d "$test_data" \
    --max-time 60 \
    2>/dev/null)

# Extract HTTP status code and response
http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

if [ "$http_code" = "000" ]; then
    echo "❌ Request timed out"
elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ Success! (HTTP $http_code)"
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
else
    echo "❌ Failed (HTTP $http_code)"
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
fi

echo -e "\n💡 The backend should now be using generateVNext for AI generation!"
