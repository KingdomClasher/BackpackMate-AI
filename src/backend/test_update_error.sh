#!/bin/bash

# Test error handling for trip update
# Trip ID: ac405c56-0919-4ce8-9925-e52ece79d779

TRIP_ID="ac405c56-0919-4ce8-9925-e52ece79d779"

echo "=== Testing Update Error Handling ==="
echo ""

# Test 1: Invalid date format
echo "1. Testing invalid date format..."
curl -X PUT "http://localhost:4000/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "invalid-date",
    "end_date": "2024-13-45"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 2: Invalid budget (negative number)
echo "2. Testing invalid budget..."
curl -X PUT "http://localhost:4000/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": -1000
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 3: Invalid trip ID (non-existent)
echo "3. Testing non-existent trip ID..."
curl -X PUT "http://localhost:4000/trips/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 3000
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "----------------------------------------"

# Test 4: Invalid JSON
echo "4. Testing invalid JSON..."
curl -X PUT "http://localhost:4000/trips/$TRIP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 3000,
    "invalid":
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n\n"

echo "=== Error Tests Completed ==="
