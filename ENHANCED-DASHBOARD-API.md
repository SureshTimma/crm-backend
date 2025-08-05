# Enhanced Dashboard API Documentation

## Overview
The Dashboard API has been enhanced to provide comprehensive analytics data similar to the original Next.js implementation, with exactly 5 companies and a complete 7-day activities timeline.

## Endpoint
**GET** `/api/dashboard`

## Authentication
Requires JWT Bearer token in Authorization header.

## Enhanced Response Structure

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalContacts": 150,
      "totalActivities": 89,
      "totalTags": 12,
      "recentActivityCount": 15
    },
    "contactsByCompany": [
      {
        "name": "Acme Corp",
        "value": 45
      },
      {
        "name": "Beta Solutions",
        "value": 32
      },
      {
        "name": "Gamma Industries",
        "value": 28
      },
      {
        "name": "Delta Tech",
        "value": 20
      },
      {
        "name": "No Company",
        "value": 25
      }
    ],
    "activityTimeline": [
      {
        "date": "2025-07-29",
        "count": 5,
        "label": "Mon, Jul 29"
      },
      {
        "date": "2025-07-30",
        "count": 8,
        "label": "Tue, Jul 30"
      },
      {
        "date": "2025-07-31",
        "count": 12,
        "label": "Wed, Jul 31"
      },
      {
        "date": "2025-08-01",
        "count": 6,
        "label": "Thu, Aug 1"
      },
      {
        "date": "2025-08-02",
        "count": 9,
        "label": "Fri, Aug 2"
      },
      {
        "date": "2025-08-03",
        "count": 3,
        "label": "Sat, Aug 3"
      },
      {
        "date": "2025-08-04",
        "count": 7,
        "label": "Sun, Aug 4"
      }
    ],
    "tagDistribution": [
      {
        "name": "VIP",
        "value": 25,
        "color": "#3B82F6"
      },
      {
        "name": "Client",
        "value": 42,
        "color": "#EF4444"
      },
      {
        "name": "Prospect",
        "value": 18,
        "color": "#10B981"
      }
    ],
    "recentContacts": [
      {
        "_id": "contact_id",
        "name": "John Doe",
        "email": "john@example.com",
        "company": "Acme Corp",
        "createdAt": "2025-08-04T10:30:00.000Z"
      }
    ],
    "recentActivities": [
      {
        "_id": "activity_id",
        "action": "Created contact",
        "entityType": "Contact",
        "entityName": "John Doe",
        "timestamp": "2025-08-04T10:30:00.000Z"
      }
    ],
    "topTags": [
      {
        "_id": "tag_id",
        "tagName": "VIP",
        "color": "#3B82F6",
        "usageCount": 25
      }
    ]
  }
}
```

## Key Enhancements

### 1. Contacts by Company Distribution
- **Exactly 5 companies** are returned (as requested)
- Uses MongoDB aggregation to group contacts by company
- Handles null/undefined companies as "No Company"
- If fewer than 5 companies exist, pads with zero-value placeholders
- Sorted by count in descending order

### 2. Activities Timeline
- **Complete 7-day timeline** with proper date labels
- Includes days with zero activities for consistent charting
- Only includes activities from the last 7 days
- Provides both ISO date and formatted label for each day
- Sorted chronologically (oldest to newest)

### 3. Tag Distribution
- Uses predefined color palette for consistent branding
- Cycles through 10 professional colors
- Includes usage counts for each tag
- Sorted by usage frequency

### 4. Additional Dashboard Data
- **Recent Contacts**: Last 5 created contacts
- **Recent Activities**: Last 10 activities with details
- **Top Tags**: Top 5 most used tags with metadata

## Data Processing Features

### Smart Company Grouping
```javascript
// Handles null companies gracefully
{ 
  $group: { 
    _id: { $ifNull: ["$company", "No Company"] }, 
    count: { $sum: 1 } 
  } 
}
```

### Complete Timeline Generation
```javascript
// Ensures all 7 days are present, even with 0 activities
for (let i = 6; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  // ... creates entry for each day
}
```

### Professional Color Palette
```javascript
// 10 carefully chosen colors for consistent branding
const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];
```

## Performance Optimizations

1. **Single Database Query Set**: All data fetched in one efficient operation
2. **MongoDB Aggregation**: Uses database-level grouping for company distribution
3. **Limited Results**: Returns only top 5 companies and recent items
4. **Indexed Queries**: Leverages user-based indexes for fast filtering

## Frontend Integration

The enhanced dashboard data structure is fully compatible with:
- **Chart.js** / **Recharts** for visualizations
- **React Dashboard Components** for displaying metrics
- **Timeline Components** for activity tracking
- **Tag Cloud Components** for tag visualization

## Error Handling

```json
{
  "success": false,
  "error": "Failed to fetch dashboard data"
}
```

## Usage Example

```javascript
// Frontend code to consume the enhanced dashboard API
const fetchDashboardData = async () => {
  const response = await api.get('/dashboard');
  const { data } = response.data;
  
  // Use exactly 5 companies for pie chart
  setCompanyData(data.contactsByCompany);
  
  // Use complete 7-day timeline for line chart
  setActivityData(data.activityTimeline);
  
  // Display recent items
  setRecentContacts(data.recentContacts);
  setRecentActivities(data.recentActivities);
};
```

## Backward Compatibility

The enhanced API maintains full backward compatibility with existing frontend components while providing additional data fields for richer dashboard experiences.
