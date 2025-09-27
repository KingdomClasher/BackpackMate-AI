# Clean Architecture Implementation

## Overview

This backend now implements a clean separation between HTTP API access (for frontend) and direct service access (for Mastra agents/workflows).

## Architecture

```
┌─────────────┐    HTTP     ┌─────────────────┐
│   Frontend  │────────────▶│  apiRegistry.ts │
└─────────────┘             └─────────────────┘
                                     │
                                     ▼
┌─────────────┐    Direct   ┌─────────────────┐
│   Agents    │────────────▶│  tripService.ts │
└─────────────┘             └─────────────────┘
                                     │
┌─────────────┐    Direct            ▼
│  Workflows  │────────────▶┌─────────────────┐
└─────────────┘             │   Supabase DB   │
                            └─────────────────┘
```

## Components

### 1. HTTP API Layer (`apiRegistry.ts`)
- **Purpose**: Provides REST endpoints for frontend access
- **Routes**:
  - `POST /trips` - Create new trip
  - `POST /trips/from-answers` - Create trip from onboarding answers
  - `GET /trips/:id` - Get trip by ID
  - `PUT /trips/:id` - Update trip
  - `DELETE /trips/:id` - Delete trip
  - Plus existing chat and onboarding routes

### 2. Service Layer (`tripService.ts`)
- **Purpose**: Database operations and business logic
- **Methods**:
  - `createTrip(tripData)` - Create new trip
  - `getTripById(id)` - Retrieve trip
  - `updateTrip(id, updates)` - Update trip
  - `deleteTrip(id)` - Delete trip

### 3. Mastra Tools (`trip-tools.ts`)
- **Purpose**: Expose service functionality to agents
- **Tools**:
  - `createTripTool` - Create trip
  - `getTripTool` - Retrieve trip
  - `updateTripTool` - Update trip
  - `saveItineraryTool` - Save itinerary
  - `saveTasksTool` - Save tasks
  - `deleteTripTool` - Delete trip

### 4. Enhanced Agents & Workflows
- **Travel Agent**: Now has access to all trip management tools
- **Itinerary Workflow**: Can automatically save trips to database

## Usage Examples

### Frontend (HTTP API)
```typescript
// Create trip
const response = await fetch('/trips', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tripData)
});

// Update trip with itinerary
await fetch(`/trips/${tripId}`, {
  method: 'PUT',
  body: JSON.stringify({ itinerary: myItinerary })
});
```

### Mastra Agent (Direct Service)
```typescript
// Agent can use tools
const result = await createTripTool.execute({ context: tripData });

// Or workflows can use service directly
import { tripService } from '../../services/tripService';
const trip = await tripService.createTrip(tripData);
```

### Workflow Integration
```typescript
// Workflow can now save trips automatically
const result = await itineraryWorkflow.execute({
  prompt: "7 days in Japan",
  answers: userAnswers // Will create trip and save itinerary
});
```

## Benefits

1. **Single Source of Truth**: All API routes in one place
2. **Efficient Agent Access**: No HTTP overhead for internal operations
3. **Flexible Frontend**: Can use standard REST API
4. **Maintainable**: Clear separation of concerns
5. **Scalable**: Easy to add new endpoints or tools

## Environment Setup

Make sure to set these environment variables:

```env
SUPABASE_API_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
```
