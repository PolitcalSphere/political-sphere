# API Documentation

> **Note:** The current implementation ships with a lightweight stub (`apps/api`) that exposes health checks and a synthetic `/api/news` feed to unblock development. The broader contract documented below remains the long-term target.

### Implemented endpoints (MVP)

- `GET /api/news` – list stories with optional filters (`category`, `tag`, `search`, `limit`).
- `POST /api/news` – create a new story (requires `title`, `excerpt`, `content`).
- `GET /api/news/{id}` & `PUT /api/news/{id}` – retrieve or update a story by id.
- `GET /metrics/news` – aggregate analytics used by the worker/frontend.
- `GET /healthz` – readiness probe.

## Overview

The Political Sphere API provides a comprehensive set of endpoints for managing political discourse, user interactions, and platform analytics. The API follows RESTful principles with GraphQL support for complex queries.

## Authentication

All API requests require authentication using JWT tokens obtained through the authentication service.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow
1. **Login**: POST `/auth/login` with credentials
2. **Receive Token**: JWT token in response
3. **Use Token**: Include in Authorization header for all requests
4. **Refresh**: POST `/auth/refresh` when token expires

## Core Endpoints

### Users

#### GET /api/users
Get list of users with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search by name or email
- `role` (string): Filter by user role

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLogin": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### GET /api/users/{id}
Get detailed user information.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "bio": "Political enthusiast",
  "location": "New York, NY",
  "website": "https://example.com",
  "verified": true,
  "stats": {
    "posts": 45,
    "followers": 1200,
    "following": 89
  },
  "preferences": {
    "notifications": true,
    "privacy": "public"
  }
}
```

#### PUT /api/users/{id}
Update user profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "location": "Updated location",
  "website": "https://updated-website.com",
  "preferences": {
    "notifications": false,
    "privacy": "private"
  }
}
```

### Posts

#### GET /api/posts
Get posts feed with filtering and sorting.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `sort` (string): Sort by (recent, popular, trending)
- `category` (string): Filter by category
- `author` (string): Filter by author ID
- `tags` (array): Filter by tags

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Important Policy Discussion",
      "content": "Full post content...",
      "author": {
        "id": "uuid",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "category": "policy",
      "tags": ["healthcare", "economy"],
      "stats": {
        "views": 1250,
        "likes": 89,
        "comments": 23,
        "shares": 12
      },
      "createdAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

#### POST /api/posts
Create a new post.

**Request Body:**
```json
{
  "title": "New Policy Proposal",
  "content": "Detailed content of the post...",
  "category": "policy",
  "tags": ["healthcare", "reform"],
  "isDraft": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "New Policy Proposal",
  "content": "Detailed content of the post...",
  "status": "published",
  "createdAt": "2024-01-15T15:00:00Z"
}
```

#### PUT /api/posts/{id}
Update an existing post.

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["healthcare", "reform", "updated"]
}
```

#### DELETE /api/posts/{id}
Delete a post (soft delete).

### Comments

#### GET /api/posts/{postId}/comments
Get comments for a specific post.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `sort` (string): Sort by (oldest, newest, popular)

#### POST /api/posts/{postId}/comments
Add a comment to a post.

**Request Body:**
```json
{
  "content": "This is my comment on the post.",
  "parentId": "uuid" // Optional: for replies
}
```

### Categories

#### GET /api/categories
Get all available categories.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Policy",
      "slug": "policy",
      "description": "Government policy discussions",
      "color": "#3B82F6",
      "postCount": 1250
    },
    {
      "id": "uuid",
      "name": "Elections",
      "slug": "elections",
      "description": "Election-related content",
      "color": "#10B981",
      "postCount": 890
    }
  ]
}
```

### Analytics

#### GET /api/analytics/overview
Get platform analytics overview.

**Query Parameters:**
- `period` (string): Time period (day, week, month, year)

**Response:**
```json
{
  "period": "month",
  "metrics": {
    "totalUsers": 15420,
    "activeUsers": 8920,
    "totalPosts": 3450,
    "totalComments": 12890,
    "engagement": {
      "avgLikesPerPost": 12.5,
      "avgCommentsPerPost": 3.7,
      "avgSharesPerPost": 2.1
    }
  },
  "trends": {
    "userGrowth": 8.5,
    "postGrowth": 15.2,
    "engagementGrowth": 22.1
  }
}
```

#### GET /api/analytics/content
Get content performance analytics.

**Response:**
```json
{
  "topCategories": [
    {
      "category": "policy",
      "posts": 450,
      "engagement": 12500
    }
  ],
  "topPosts": [
    {
      "id": "uuid",
      "title": "Popular Post Title",
      "views": 5000,
      "likes": 234,
      "comments": 89
    }
  ],
  "contentTrends": {
    "dailyPosts": [12, 15, 8, 22, 18, 25, 20],
    "engagementRate": 4.2
  }
}
```

## GraphQL API

For complex queries and mutations, the API also supports GraphQL at `/graphql`.

### Example Query
```graphql
query GetPosts($first: Int, $after: String) {
  posts(first: $first, after: $after) {
    edges {
      node {
        id
        title
        content
        author {
          id
          name
          avatar
        }
        stats {
          views
          likes
          comments
        }
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Example Mutation
```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    status
    createdAt
  }
}
```

## WebSocket API

Real-time features are available through WebSocket connections.

### Connection
```
ws://api.political-sphere.com/ws?token=<jwt_token>
```

### Events

#### Post Updates
```json
{
  "type": "post.updated",
  "data": {
    "postId": "uuid",
    "action": "liked",
    "userId": "uuid",
    "timestamp": "2024-01-15T16:00:00Z"
  }
}
```

#### Comments
```json
{
  "type": "comment.created",
  "data": {
    "commentId": "uuid",
    "postId": "uuid",
    "content": "New comment content",
    "author": {
      "id": "uuid",
      "name": "John Doe"
    },
    "timestamp": "2024-01-15T16:05:00Z"
  }
}
```

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authenticated Users**: 1000 requests per hour
- **Anonymous Users**: 100 requests per hour
- **Search Requests**: 50 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Authentication required or failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install @political-sphere/sdk
```

```typescript
import { PoliticalSphereAPI } from '@political-sphere/sdk';

const api = new PoliticalSphereAPI({
  baseURL: 'https://api.political-sphere.com',
  token: 'your-jwt-token'
});

// Get posts
const posts = await api.posts.list({ limit: 10 });

// Create a post
const newPost = await api.posts.create({
  title: 'My Post',
  content: 'Post content...',
  category: 'discussion'
});
```

## Versioning

The API uses semantic versioning. Breaking changes will be communicated in advance and available under new version endpoints:

- Current: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

## Support

For API support and questions:
- **Documentation**: https://docs.political-sphere.com
- **Status Page**: https://status.political-sphere.com
- **Support**: support@political-sphere.com
- **Community**: https://community.political-sphere.com

## Changelog

### v1.0.0 (Current)
- Initial release with core CRUD operations
- Authentication and authorization
- Basic analytics and reporting
- GraphQL support
- WebSocket real-time updates

### Upcoming Features
- Advanced search and filtering
- Bulk operations
- Webhook integrations
- Advanced analytics
- Content moderation APIs
