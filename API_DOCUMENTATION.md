# Careverse API Documentation

## Table of Contents
- [Assessment Generation API](#assessment-generation-api)
  - [Generate Assessment](#generate-assessment)
  - [Get Assessment by ID](#get-assessment-by-id)
- [Error Codes](#error-codes)
- [Data Models](#data-models)

---

## Assessment Generation API

### Generate Assessment

Generate a comprehensive health assessment from a conversation history using AI-powered multi-agent analysis.

**Endpoint:** `POST /api/v1/assessments/generate`

**Authentication:** Required (Bearer Token)

**Description:** 
This endpoint analyzes a user's conversation history and generates a structured health assessment including:
- Extracted symptoms and urgency classification
- Possible medical condition diagnosis with confidence score
- Nearby healthcare provider recommendations
- Product and medication suggestions
- Actionable next steps

The system uses multiple specialized AI agents orchestrated with LangGraph to provide comprehensive analysis in under 15 seconds.

#### Request

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body Schema:**
```json
{
  "conversationId": "string (UUID, required)"
}
```

**Request Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| conversationId | string (UUID) | Yes | The ID of the conversation to analyze. Must belong to the authenticated user and contain at least 2 user messages. |

**Example Request:**
```json
{
  "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Response

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Assessment generated successfully",
  "data": {
    "assessmentId": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
    "possibleCondition": {
      "name": "Migraine",
      "description": "A neurological condition that can cause multiple symptoms including severe headaches, often accompanied by nausea, vomiting, and sensitivity to light and sound. Migraines can last from 4 to 72 hours and may be preceded by warning symptoms called aura.",
      "commonTriggers": [
        "Stress, hormonal changes, certain foods and drinks (aged cheese, alcohol, caffeine)",
        "Lack of sleep or changes in sleep patterns",
        "Bright lights, loud sounds, or strong smells",
        "Weather changes or barometric pressure shifts"
      ],
      "initialSelfCare": [
        "Rest in a quiet, dark room to minimize sensory stimulation",
        "Apply a cold compress to your forehead or neck",
        "Stay hydrated and avoid known trigger foods",
        "Practice relaxation techniques like deep breathing or meditation",
        "Maintain a regular sleep schedule"
      ]
    },
    "nextSteps": [
      {
        "title": "Book a Neurologist Appointment",
        "description": "Schedule a consultation with a headache specialist to discuss treatment options and prevention strategies",
        "icon": "doctor",
        "actionType": "view_providers",
        "url": "/providers?specialty=Neurologist"
      },
      {
        "title": "Explore Stress Management Programs",
        "description": "Learn coping mechanisms and relaxation techniques to reduce migraine triggers",
        "icon": "meditation",
        "actionType": "external_link",
        "url": "https://www.headaches.org/resources/stress-management"
      },
      {
        "title": "View Relevant Medications",
        "description": "Explore over-the-counter and prescription treatment options for migraine relief",
        "icon": "medication",
        "actionType": "view_products",
        "url": "/products?condition=Migraine"
      },
      {
        "title": "Track Your Symptoms",
        "description": "Keep a headache diary to identify patterns and triggers",
        "icon": "calendar",
        "actionType": "external_link",
        "url": "https://www.headaches.org/resources/headache-diary"
      }
    ],
    "providers": [
      {
        "name": "Dr. Evelyn Reed",
        "specialty": "Neurologist - Headache Specialist",
        "distance": "2.1 miles away",
        "rating": 4.9,
        "reviewCount": 125,
        "profileUrl": "https://www.zocdoc.com/doctor/evelyn-reed-md",
        "bookingUrl": "https://www.zocdoc.com/doctor/evelyn-reed-md/book",
        "phone": "(415) 555-0100",
        "address": "123 Medical Plaza, Suite 200, San Francisco, CA 94102"
      },
      {
        "name": "Dr. Marcus Chen",
        "specialty": "Neurologist",
        "distance": "3.5 miles away",
        "rating": 4.8,
        "reviewCount": 98,
        "profileUrl": "https://www.healthgrades.com/physician/dr-marcus-chen",
        "bookingUrl": null,
        "phone": "(415) 555-0200",
        "address": "456 Healthcare Center, San Francisco, CA 94103"
      },
      {
        "name": "San Francisco Neurology Clinic",
        "specialty": "Neurology Practice",
        "distance": "4.2 miles away",
        "rating": 4.7,
        "reviewCount": 203,
        "profileUrl": "https://www.google.com/maps/place/sf-neurology",
        "bookingUrl": "https://www.sfneurology.com/appointments",
        "phone": "(415) 555-0300",
        "address": "789 Medical Drive, San Francisco, CA 94104"
      }
    ],
    "products": [
      {
        "name": "Ibuprofen (Advil, Motrin)",
        "type": "OTC Pain Reliever",
        "description": "Non-steroidal anti-inflammatory drug (NSAID) effective for mild to moderate migraine pain. Take at the first sign of symptoms.",
        "purchaseUrl": "https://www.amazon.com/dp/B001234567",
        "imageUrl": "https://images.example.com/ibuprofen.jpg",
        "isPrescription": false
      },
      {
        "name": "Excedrin Migraine",
        "type": "OTC Migraine Relief",
        "description": "Combination of acetaminophen, aspirin, and caffeine specifically formulated for migraine relief.",
        "purchaseUrl": "https://www.amazon.com/dp/B002345678",
        "imageUrl": "https://images.example.com/excedrin.jpg",
        "isPrescription": false
      },
      {
        "name": "Sumatriptan (Imitrex)",
        "type": "Prescription Triptan",
        "description": "Prescription medication that narrows blood vessels around the brain and blocks pain pathways. Consult your doctor before use.",
        "purchaseUrl": null,
        "imageUrl": "https://images.example.com/sumatriptan.jpg",
        "isPrescription": true
      },
      {
        "name": "Magnesium Supplement",
        "type": "Dietary Supplement",
        "description": "May help prevent migraines when taken regularly. Studies suggest 400-500mg daily may reduce frequency.",
        "purchaseUrl": "https://www.amazon.com/dp/B003456789",
        "imageUrl": "https://images.example.com/magnesium.jpg",
        "isPrescription": false
      }
    ],
    "severity": "medium",
    "confidence": 0.85,
    "urgency": "routine",
    "extractedSymptoms": [
      {
        "name": "Severe headache",
        "severity": "severe",
        "location": "temples and forehead",
        "duration": "4-6 hours per episode",
        "frequency": "2-3 times per week"
      },
      {
        "name": "Sensitivity to light",
        "severity": "moderate",
        "location": "eyes",
        "duration": "during headache episodes",
        "frequency": "with each headache"
      },
      {
        "name": "Nausea",
        "severity": "mild",
        "location": "stomach",
        "duration": "1-2 hours",
        "frequency": "occasionally with headaches"
      }
    ],
    "redFlags": [],
    "disclaimer": "This assessment is generated by AI and is not a medical diagnosis. The information provided is for educational purposes only and should not replace professional medical advice. Please consult with a qualified healthcare provider for an accurate diagnosis and appropriate treatment plan. If you experience severe symptoms or your condition worsens, seek immediate medical attention.",
    "executionTimeMs": 12450,
    "tokensUsed": 3250,
    "createdAt": "2024-11-04T10:30:00.000Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Indicates if the request was successful |
| message | string | Human-readable success message |
| data.assessmentId | string (UUID) | Unique identifier for the generated assessment |
| data.possibleCondition | object | Diagnosed condition information |
| data.possibleCondition.name | string | Name of the identified condition |
| data.possibleCondition.description | string | Detailed description of the condition |
| data.possibleCondition.commonTriggers | array[string] | List of common triggers for the condition |
| data.possibleCondition.initialSelfCare | array[string] | Self-care recommendations |
| data.nextSteps | array[object] | 3-5 actionable recommendations |
| data.nextSteps[].title | string | Title of the action step |
| data.nextSteps[].description | string | Detailed description of the step |
| data.nextSteps[].icon | string | Icon identifier for UI display |
| data.nextSteps[].actionType | string | Type of action: `view_providers`, `view_products`, `external_link`, `emergency` |
| data.nextSteps[].url | string | URL for the action (optional) |
| data.providers | array[object] | Up to 10 nearby healthcare providers |
| data.providers[].name | string | Provider or clinic name |
| data.providers[].specialty | string | Medical specialty |
| data.providers[].distance | string | Distance from user location |
| data.providers[].rating | number | Rating out of 5.0 |
| data.providers[].reviewCount | number | Number of reviews |
| data.providers[].profileUrl | string | Link to provider profile (optional) |
| data.providers[].bookingUrl | string | Link to book appointment - dynamically discovered via web search based on user location (optional) |
| data.providers[].phone | string | Contact phone number |
| data.providers[].address | string | Full address |
| data.products | array[object] | Up to 8 product recommendations |
| data.products[].name | string | Product name |
| data.products[].type | string | Product category |
| data.products[].description | string | Product description and usage |
| data.products[].purchaseUrl | string | Link to purchase - dynamically discovered via web search based on user location (optional) |
| data.products[].imageUrl | string | Product image URL (optional) |
| data.products[].isPrescription | boolean | Whether prescription is required |
| data.severity | string | Overall severity: `low`, `medium`, `high`, `emergency` |
| data.confidence | number | AI confidence score (0.0 to 1.0) |
| data.urgency | string | Urgency level: `routine`, `urgent`, `emergency` |
| data.extractedSymptoms | array[object] | Structured symptom data |
| data.extractedSymptoms[].name | string | Symptom name |
| data.extractedSymptoms[].severity | string | `mild`, `moderate`, `severe` |
| data.extractedSymptoms[].location | string | Body location (optional) |
| data.extractedSymptoms[].duration | string | How long symptom lasts (optional) |
| data.extractedSymptoms[].frequency | string | How often it occurs (optional) |
| data.redFlags | array[string] | Emergency warning symptoms detected |
| data.disclaimer | string | Medical disclaimer text |
| data.executionTimeMs | number | Processing time in milliseconds |
| data.tokensUsed | number | AI tokens consumed |
| data.createdAt | string (ISO 8601) | Assessment creation timestamp |

#### Error Responses

**400 Bad Request - Insufficient Conversation Data:**
```json
{
  "success": false,
  "message": "Insufficient conversation data. Please continue the conversation before generating an assessment.",
  "error": "INSUFFICIENT_DATA"
}
```

**400 Bad Request - Invalid Conversation ID:**
```json
{
  "success": false,
  "message": "Invalid conversation ID format",
  "error": "INVALID_INPUT"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

**404 Not Found - Conversation Not Found:**
```json
{
  "success": false,
  "message": "Conversation not found or does not belong to user",
  "error": "NOT_FOUND"
}
```

**500 Internal Server Error - Generation Failed:**
```json
{
  "success": false,
  "message": "Failed to generate assessment. Please try again.",
  "error": "GENERATION_FAILED"
}
```

**503 Service Unavailable - AI Service Down:**
```json
{
  "success": false,
  "message": "AI service is temporarily unavailable. Please try again later.",
  "error": "SERVICE_UNAVAILABLE"
}
```

**504 Gateway Timeout:**
```json
{
  "success": false,
  "message": "Assessment generation timed out. Please try again.",
  "error": "TIMEOUT"
}
```

#### Example Usage

**cURL:**
```bash
curl -X POST https://api.careverse.com/api/v1/assessments/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('https://api.careverse.com/api/v1/assessments/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
});

const data = await response.json();
console.log(data);
```

**Python (Requests):**
```python
import requests

url = "https://api.careverse.com/api/v1/assessments/generate"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}
payload = {
    "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print(data)
```

#### Notes

- **Processing Time:** Assessment generation typically completes in 10-15 seconds
- **Conversation Requirements:** The conversation must contain at least 2 user messages describing symptoms
- **User Location:** Provider recommendations require user location data in the profile
- **Dynamic URL Discovery:** Booking and purchase URLs are dynamically discovered via web search based on user location, ensuring region-appropriate platforms are used (e.g., Zocdoc for US, Marham.pk for Pakistan, Practo for India)
- **Location-Aware Results:** All provider booking links and product purchase URLs are tailored to the user's country and city
- **Caching:** Provider and product results are cached to improve performance
- **Rate Limiting:** Limited to 10 requests per minute per user
- **Medical Disclaimer:** All assessments include a disclaimer that this is not a medical diagnosis
- **Response Structure:** The API response structure remains unchanged; URL discovery happens transparently in the background

---

### Get Assessment by ID

Retrieve a previously generated assessment by its ID.

**Endpoint:** `GET /api/v1/assessments/:id`

**Authentication:** Required (Bearer Token)

**Description:** 
Retrieves a complete assessment record including all analysis results, provider recommendations, product suggestions, and next steps. The assessment must belong to the authenticated user.

#### Request

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | The unique identifier of the assessment to retrieve |

**Example Request:**
```
GET /api/v1/assessments/f9e8d7c6-b5a4-3210-9876-543210fedcba
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "assessment": {
      "id": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
      "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "possibleCondition": {
        "name": "Tension Headache",
        "description": "A common type of headache characterized by a dull, aching sensation all over the head, often described as a tight band around the forehead. Unlike migraines, tension headaches typically don't cause nausea, vomiting, or sensitivity to light and sound.",
        "commonTriggers": [
          "Stress and anxiety",
          "Poor posture, especially during computer work",
          "Eye strain from prolonged screen time",
          "Lack of sleep or irregular sleep patterns",
          "Dehydration"
        ],
        "initialSelfCare": [
          "Apply a heating pad or warm compress to neck and shoulders",
          "Practice good posture and take regular breaks from desk work",
          "Stay hydrated throughout the day",
          "Try relaxation techniques like progressive muscle relaxation",
          "Get adequate sleep (7-9 hours per night)"
        ]
      },
      "nextSteps": [
        {
          "title": "Consult a Primary Care Physician",
          "description": "Schedule an appointment to discuss persistent headaches and rule out underlying conditions",
          "icon": "doctor",
          "actionType": "view_providers",
          "url": "/providers?specialty=Primary Care"
        },
        {
          "title": "Try Over-the-Counter Pain Relief",
          "description": "Explore medications like ibuprofen or acetaminophen for symptom management",
          "icon": "medication",
          "actionType": "view_products",
          "url": "/products?condition=Tension Headache"
        },
        {
          "title": "Learn Stress Management Techniques",
          "description": "Access resources for managing stress and preventing tension headaches",
          "icon": "meditation",
          "actionType": "external_link",
          "url": "https://www.headaches.org/resources/stress-management"
        }
      ],
      "providers": [
        {
          "name": "Dr. Sarah Johnson",
          "specialty": "Family Medicine",
          "distance": "1.3 miles away",
          "rating": 4.8,
          "reviewCount": 156,
          "profileUrl": "https://www.zocdoc.com/doctor/sarah-johnson-md",
          "bookingUrl": "https://www.zocdoc.com/doctor/sarah-johnson-md/book",
          "phone": "(415) 555-0400",
          "address": "321 Health Street, San Francisco, CA 94105"
        },
        {
          "name": "Bay Area Medical Group",
          "specialty": "Primary Care Practice",
          "distance": "2.8 miles away",
          "rating": 4.6,
          "reviewCount": 89,
          "profileUrl": null,
          "bookingUrl": "https://www.bayareamedical.com/appointments",
          "phone": "(415) 555-0500",
          "address": "654 Wellness Ave, San Francisco, CA 94106"
        }
      ],
      "products": [
        {
          "name": "Acetaminophen (Tylenol)",
          "type": "OTC Pain Reliever",
          "description": "Effective for mild to moderate tension headache pain. Safe for most adults when used as directed.",
          "purchaseUrl": "https://www.amazon.com/dp/B004567890",
          "imageUrl": "https://images.example.com/tylenol.jpg",
          "isPrescription": false
        },
        {
          "name": "Ibuprofen (Advil)",
          "type": "OTC Pain Reliever",
          "description": "NSAID that reduces inflammation and relieves headache pain. Take with food to minimize stomach upset.",
          "purchaseUrl": "https://www.amazon.com/dp/B005678901",
          "imageUrl": "https://images.example.com/advil.jpg",
          "isPrescription": false
        },
        {
          "name": "Heating Pad",
          "type": "Therapeutic Device",
          "description": "Provides soothing heat therapy to relax tense neck and shoulder muscles that contribute to headaches.",
          "purchaseUrl": "https://www.amazon.com/dp/B006789012",
          "imageUrl": "https://images.example.com/heating-pad.jpg",
          "isPrescription": false
        },
        {
          "name": "Blue Light Blocking Glasses",
          "type": "Preventive Device",
          "description": "Reduces eye strain from screens, which can trigger tension headaches. Wear during computer work.",
          "purchaseUrl": "https://www.amazon.com/dp/B007890123",
          "imageUrl": "https://images.example.com/blue-light-glasses.jpg",
          "isPrescription": false
        }
      ],
      "severity": "low",
      "confidence": 0.78,
      "urgency": "routine",
      "extractedSymptoms": [
        {
          "name": "Dull headache",
          "severity": "moderate",
          "location": "forehead and temples",
          "duration": "2-3 hours",
          "frequency": "3-4 times per week"
        },
        {
          "name": "Neck tension",
          "severity": "mild",
          "location": "back of neck",
          "duration": "throughout the day",
          "frequency": "daily"
        }
      ],
      "redFlags": [],
      "warnings": [],
      "disclaimer": "This assessment is generated by AI and is not a medical diagnosis. The information provided is for educational purposes only and should not replace professional medical advice. Please consult with a qualified healthcare provider for an accurate diagnosis and appropriate treatment plan. If you experience severe symptoms or your condition worsens, seek immediate medical attention.",
      "executionTimeMs": 11230,
      "tokensUsed": 2890,
      "createdAt": "2024-11-04T09:15:00.000Z",
      "updatedAt": "2024-11-04T09:15:00.000Z"
    }
  }
}
```

**Response Fields:**

All fields are the same as the Generate Assessment response, with the addition of:

| Field | Type | Description |
|-------|------|-------------|
| data.assessment.id | string (UUID) | Assessment unique identifier |
| data.assessment.conversationId | string (UUID) | Associated conversation ID |
| data.assessment.warnings | array[string] | Additional warnings or notices |
| data.assessment.updatedAt | string (ISO 8601) | Last update timestamp |

#### Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Assessment not found or does not belong to user",
  "error": "NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to retrieve assessment",
  "error": "SERVER_ERROR"
}
```

#### Example Usage

**cURL:**
```bash
curl -X GET https://api.careverse.com/api/v1/assessments/f9e8d7c6-b5a4-3210-9876-543210fedcba \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript (Fetch):**
```javascript
const assessmentId = 'f9e8d7c6-b5a4-3210-9876-543210fedcba';
const response = await fetch(`https://api.careverse.com/api/v1/assessments/${assessmentId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log(data.data.assessment);
```

**Python (Requests):**
```python
import requests

assessment_id = "f9e8d7c6-b5a4-3210-9876-543210fedcba"
url = f"https://api.careverse.com/api/v1/assessments/{assessment_id}"
headers = {
    "Authorization": f"Bearer {access_token}"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data['data']['assessment'])
```

#### Notes

- **Ownership Verification:** The API verifies that the assessment belongs to the authenticated user
- **Complete Data:** All fields from the original generation are preserved
- **Historical Access:** Assessments remain accessible indefinitely for user reference
- **No Regeneration:** This endpoint retrieves existing data; it does not regenerate the assessment

---

## Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| INSUFFICIENT_DATA | 400 | Conversation doesn't have enough messages (minimum 2 user messages required) |
| INVALID_INPUT | 400 | Request body contains invalid data or malformed UUID |
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| NOT_FOUND | 404 | Resource (conversation or assessment) not found or doesn't belong to user |
| GENERATION_FAILED | 500 | Assessment generation process failed |
| SERVICE_UNAVAILABLE | 503 | AI service (OpenAI, Pinecone) is temporarily unavailable |
| TIMEOUT | 504 | Assessment generation exceeded 30-second timeout |
| SERVER_ERROR | 500 | Generic server error |

---

## Data Models

### Assessment Model

Complete structure of an assessment object:

```typescript
interface Assessment {
  id: string;                          // UUID
  conversationId: string;              // UUID
  userId: string;                      // UUID (not exposed in API)
  
  // Condition Information
  possibleCondition: {
    name: string;
    description: string;
    commonTriggers: string[];
    initialSelfCare: string[];
  };
  
  // Extracted Symptoms
  extractedSymptoms: Array<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    location?: string;
    duration?: string;
    frequency?: string;
  }>;
  
  // Recommendations
  nextSteps: Array<{
    title: string;
    description: string;
    icon: string;
    actionType: 'view_providers' | 'view_products' | 'external_link' | 'emergency';
    url?: string;
  }>;
  
  providers: Array<{
    name: string;
    specialty: string;
    distance: string;
    rating: number;
    reviewCount: number;
    profileUrl?: string;
    bookingUrl?: string;
    phone: string;
    address: string;
  }>;
  
  products: Array<{
    name: string;
    type: string;
    description: string;
    purchaseUrl?: string;
    imageUrl?: string;
    isPrescription: boolean;
  }>;
  
  // Metadata
  severity: 'low' | 'medium' | 'high' | 'emergency';
  confidence: number;                  // 0.0 to 1.0
  urgency: 'routine' | 'urgent' | 'emergency';
  redFlags: string[];
  warnings: string[];
  disclaimer: string;
  executionTimeMs: number;
  tokensUsed: number;
  
  // Timestamps
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}
```

### Symptom Object

```typescript
interface Symptom {
  name: string;                        // e.g., "Severe headache"
  severity: 'mild' | 'moderate' | 'severe';
  location?: string;                   // e.g., "temples and forehead"
  duration?: string;                   // e.g., "4-6 hours per episode"
  frequency?: string;                  // e.g., "2-3 times per week"
}
```

### Next Step Object

```typescript
interface NextStep {
  title: string;                       // e.g., "Book a Neurologist"
  description: string;                 // Detailed explanation
  icon: string;                        // Icon identifier for UI
  actionType: 'view_providers' | 'view_products' | 'external_link' | 'emergency';
  url?: string;                        // Action URL (optional)
}
```

### Provider Object

```typescript
interface Provider {
  name: string;                        // Provider or clinic name
  specialty: string;                   // Medical specialty
  distance: string;                    // e.g., "2.1 miles away"
  rating: number;                      // 0.0 to 5.0
  reviewCount: number;                 // Number of reviews
  profileUrl?: string;                 // Link to provider profile
  bookingUrl?: string;                 // Link to book appointment
  phone: string;                       // Contact phone number
  address: string;                     // Full address
}
```

### Product Object

```typescript
interface Product {
  name: string;                        // Product name
  type: string;                        // Product category
  description: string;                 // Usage and benefits
  purchaseUrl?: string;                // Link to purchase
  imageUrl?: string;                   // Product image
  isPrescription: boolean;             // Requires prescription
}
```

---

## Best Practices

### For Frontend Developers

1. **Loading States:** Display a loading indicator during assessment generation (10-15 seconds)
2. **Error Handling:** Implement user-friendly error messages for all error codes
3. **Disclaimer Display:** Always prominently display the medical disclaimer
4. **Emergency Handling:** If `urgency === 'emergency'` or `redFlags.length > 0`, show urgent care warnings
5. **Low Confidence:** If `confidence < 0.6`, emphasize the need for professional consultation
6. **Prescription Products:** Clearly mark products with `isPrescription: true` and show consultation disclaimer
7. **Provider Actions:** Implement click handlers for `actionType` to navigate appropriately
8. **Caching:** Cache assessment results locally to avoid unnecessary API calls

### For Backend Developers

1. **Conversation Validation:** Always verify conversation has sufficient data before processing
2. **User Verification:** Ensure conversation belongs to authenticated user
3. **Timeout Handling:** Implement 30-second timeout for assessment generation
4. **Error Logging:** Log all errors with context for debugging
5. **Rate Limiting:** Implement per-user rate limits to prevent abuse
6. **Caching Strategy:** Cache provider and product results to reduce API costs
7. **Token Tracking:** Monitor OpenAI token usage to manage costs
8. **Graceful Degradation:** Return partial results if non-critical components fail

---

## Rate Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| POST /api/v1/assessments/generate | 10 requests | per minute per user |
| GET /api/v1/assessments/:id | 100 requests | per minute per user |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1699099200
```

**Rate Limit Exceeded Response (429):**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

---

## Location-Aware Dynamic URL Discovery

### Overview

The Careverse API uses intelligent web search tools to dynamically discover location-appropriate booking platforms and e-commerce sites. Instead of hardcoded URLs, the system searches the web in real-time to find the best booking links and purchase URLs based on the user's geographic location.

### How It Works

1. **Location Detection**: The system extracts the user's country, city, and coordinates from their profile
2. **Intelligent Search**: When generating provider or product recommendations, the system constructs location-aware search queries
3. **Web Search**: The system uses Serper API (with Brave Search as fallback) to find relevant booking platforms and e-commerce sites
4. **URL Extraction**: The most relevant URLs are extracted from search results and included in the response
5. **Caching**: Results are cached with location-based keys to improve performance

### Benefits

- **Global Applicability**: Works for users in any country without maintaining hardcoded platform lists
- **Always Current**: Discovers current, working URLs rather than outdated hardcoded links
- **Region-Appropriate**: Automatically finds platforms familiar to users in their region (e.g., Zocdoc in US, Marham.pk in Pakistan, Practo in India)
- **Graceful Fallback**: If web search fails, the system falls back to provider websites or generic search URLs

### Examples

**US User - Provider Booking:**
- Search Query: "book appointment Dr. Sarah Johnson family medicine San Francisco USA"
- Discovered URL: `https://www.zocdoc.com/doctor/sarah-johnson-md/book`

**Pakistan User - Provider Booking:**
- Search Query: "book appointment Dr. Ahmed Khan cardiologist Lahore Pakistan"
- Discovered URL: `https://marham.pk/doctors/lahore/cardiologist/dr-ahmed-khan`

**India User - Product Purchase:**
- Search Query: "buy Ibuprofen online Mumbai India"
- Discovered URL: `https://www.1mg.com/drugs/ibuprofen-200mg`

**UK User - Product Purchase:**
- Search Query: "buy Paracetamol online London UK"
- Discovered URL: `https://www.boots.com/paracetamol-500mg-tablets`

### Performance Considerations

- **Caching**: Search results are cached for 6 hours by default to reduce API calls
- **Parallel Execution**: Web searches run in parallel with other assessment tasks
- **Timeout Protection**: Searches timeout after 10 seconds to prevent blocking
- **Retry Logic**: Failed searches are retried up to 2 times with exponential backoff

### Configuration

Web search behavior can be configured via environment variables:
- `SERPER_API_KEY`: Primary search API (required)
- `BRAVE_SEARCH_API_KEY`: Fallback search API (optional)
- `WEB_SEARCH_TIMEOUT_MS`: Search timeout in milliseconds (default: 10000)
- `WEB_SEARCH_MAX_RETRIES`: Maximum retry attempts (default: 2)
- `WEB_SEARCH_CACHE_TTL_HOURS`: Cache duration in hours (default: 6)

---

## Changelog

### Version 1.1.0 (2024-11-07)
- Added location-aware dynamic URL discovery via web search tools
- Implemented intelligent booking platform and e-commerce site detection
- Added Serper API integration with Brave Search fallback
- Enhanced provider and product recommendations with region-appropriate URLs
- Added location-based caching for improved performance
- Improved global applicability for users in any country

### Version 1.0.0 (2024-11-04)
- Initial release of AI-powered assessment generation
- Multi-agent orchestration with LangGraph
- Provider matching with Google Places integration
- Product recommendations with purchase links
- Comprehensive error handling and fallbacks

---

## Support

For API support, please contact:
- **Email:** api-support@careverse.com
- **Documentation:** https://docs.careverse.com
- **Status Page:** https://status.careverse.com

For urgent issues or security concerns:
- **Security Email:** security@careverse.com
