# Database Schema Diagram

## Entity Relationship Overview

```
┌─────────────────────┐
│       USERS         │
│─────────────────────│
│ id (PK)            │
│ email              │
│ password           │
│ first_name         │
│ last_name          │
│ date_of_birth      │
│ gender             │
│ phone              │
│ location (JSON)    │
│ medical_history    │
│ is_active          │
│ last_login         │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐
│   CONVERSATIONS     │
│─────────────────────│
│ id (PK)            │
│ user_id (FK)       │◄────┐
│ title              │     │
│ summary            │     │
│ symptoms (JSON)    │     │
│ condition          │     │
│ status             │     │
│ last_message_at    │     │
└─────────────────────┘     │
         │                  │
         │ 1:N              │
         ▼                  │
┌─────────────────────┐     │
│      MESSAGES       │     │
│─────────────────────│     │
│ id (PK)            │     │
│ conversation_id(FK)│     │
│ role               │     │
│ content            │     │
│ metadata (JSON)    │     │
└─────────────────────┘     │
                            │
         ┌──────────────────┘
         │ 1:N
         ▼
┌─────────────────────┐
│    ASSESSMENTS      │
│─────────────────────│
│ id (PK)            │
│ user_id (FK)       │
│ conversation_id(FK)│
│ possible_condition │
│ description        │
│ symptoms (JSON)    │
│ common_triggers    │
│ self_care_recs     │
│ next_steps (JSON)  │
│ severity           │
│ disclaimer         │
│ confidence         │
└─────────────────────┘


┌─────────────────────┐
│     PROVIDERS       │
│─────────────────────│
│ id (PK)            │
│ name               │
│ specialty          │
│ description        │
│ address            │
│ city               │
│ state              │
│ zip_code           │
│ country            │
│ latitude           │
│ longitude          │
│ phone              │
│ email              │
│ website            │
│ rating             │
│ review_count       │
│ is_accepting_new   │
│ insurance_accepted │
│ languages (JSON)   │
└─────────────────────┘
```

## Relationships

### User → Conversations (1:N)
- One user can have many conversations
- Each conversation belongs to one user
- Cascade delete: Deleting a user deletes their conversations

### Conversation → Messages (1:N)
- One conversation can have many messages
- Each message belongs to one conversation
- Cascade delete: Deleting a conversation deletes its messages

### User → Assessments (1:N)
- One user can have many assessments
- Each assessment belongs to one user
- Cascade delete: Deleting a user deletes their assessments

### Conversation → Assessments (1:N)
- One conversation can have many assessments
- Each assessment belongs to one conversation
- Cascade delete: Deleting a conversation deletes its assessments

### Providers (Independent)
- No foreign key relationships
- Standalone healthcare provider directory
- Used for location-based searches

## JSON Field Structures

### users.location
```json
{
  "city": "San Francisco",
  "state": "CA",
  "country": "USA",
  "lat": 37.7749,
  "lng": -122.4194
}
```

### users.medical_history
```json
[
  {
    "type": "condition",
    "name": "Hypertension",
    "diagnosedDate": "2020-01-15"
  },
  {
    "type": "allergy",
    "name": "Penicillin",
    "severity": "high"
  },
  {
    "type": "medication",
    "name": "Lisinopril",
    "dosage": "10mg daily"
  }
]
```

### conversations.symptoms
```json
[
  "headache",
  "nausea",
  "dizziness"
]
```

### messages.metadata
```json
{
  "model": "gpt-4",
  "tokens": 150,
  "temperature": 0.7,
  "processingTime": 1250
}
```

### assessments.symptoms
```json
[
  {
    "name": "headache",
    "severity": "moderate",
    "duration": "2 days"
  }
]
```

### assessments.self_care_recommendations
```json
[
  "Stay hydrated",
  "Get adequate rest",
  "Avoid bright lights"
]
```

### providers.insurance_accepted
```json
[
  "Blue Cross",
  "Aetna",
  "UnitedHealthcare"
]
```

### providers.languages
```json
[
  "English",
  "Spanish",
  "Mandarin"
]
```

## Indexes

### users
- `email` - Unique index for fast login lookups
- `is_active` - Filter active users

### conversations
- `user_id` - Fast user conversation queries
- `status` - Filter by conversation status
- `last_message_at` - Sort by recent activity

### messages
- `conversation_id` - Fast message retrieval
- `role` - Filter by message type
- `created_at` - Chronological ordering

### assessments
- `user_id` - User assessment history
- `conversation_id` - Conversation assessments
- `severity` - Filter by urgency
- `created_at` - Chronological ordering

### providers
- `specialty` - Search by medical specialty
- `(city, state)` - Location-based searches
- `(latitude, longitude)` - Geospatial queries
- `is_accepting_new_patients` - Filter available providers

## Data Types

- **UUID** - Primary keys and foreign keys
- **VARCHAR** - Text fields with length limits
- **TEXT** - Unlimited text (descriptions, content)
- **JSON/JSONB** - Structured data (PostgreSQL native)
- **DATE** - Date only fields
- **TIMESTAMP** - Date and time fields
- **BOOLEAN** - True/false flags
- **FLOAT** - Decimal numbers (ratings, coordinates)
- **INTEGER** - Whole numbers (counts)
- **ENUM** - Predefined value sets (status, role, severity)

## Constraints

- **Primary Keys** - All tables use UUID
- **Foreign Keys** - Enforce referential integrity
- **Unique** - Email must be unique
- **Not Null** - Required fields enforced
- **Check** - Enum values validated
- **Default** - Sensible defaults set
- **Cascade Delete** - Related records cleaned up

## Timestamps

All tables include:
- `created_at` - Record creation time
- `updated_at` - Last modification time (auto-updated via trigger)
