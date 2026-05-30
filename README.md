# KabuChat

A Chat application built with React Native(Expo) and Node.js.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Project Architecture](#project-architecture)

## Features

### Messaging
- **Real-time Chat**: Instant message delivery via WebSocket (Socket.IO)
- **Message Management**: Send, edit, delete, and reply to messages
- **Message Status**: Track message read receipts with timestamps
- **Message History**: Full conversation history with message persistence

### Social Features
- **Friend System**: Add and manage friends with friend requests
- **Friend Requests**: Send, receive, and manage friend requests with status tracking
- **User Profiles**: Customizable user profiles with avatars and usernames

### Notifications
- **Push Notifications**: Real-time push notifications for new messages
- **Device Management**: Store and manage multiple push notification tokens per user
- **Smart Notifications**: Notification handling with Sentry error tracking

### User Experience
- **Offline Support**: Offline banner indicator for network status
- **Dark Mode Support**: Theme customization with light/dark mode
- **Authentication**: Secure authentication via Clerk
- **Error Tracking**: Sentry integration for error monitoring and analytics

### Conversations
- **Direct Messages**: One-on-one conversations
- **Conversation Management**: Create, manage, and leave conversations

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js (v5.2.1)
- **Real-time Communication**: Socket.IO (v4.8.3)
- **Database**: PostgreSQL via Neon
- **ORM**: Prisma (v7.8.0)
- **Authentication**: Clerk
- **WebSockets**: Native WebSocket support via ws (v8.19.0)
- **Validation**: Zod (v4.3.6)
- **CORS**: Cross-Origin Resource Sharing support

### Mobile (Frontend)
- **Framework**: React Native with Expo (v55.0.25)
- **Navigation**: Expo Router (file-based routing)
- **Authentication**: Clerk for React Native
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Real-time**: Socket.IO client
- **Notifications**: Expo Notifications
- **State Management**: React Context API
- **Storage**: Async Storage, Expo SQLite
- **Image Handling**: Expo Image, Image Picker, Image Manipulator
- **UI Components**: Expo Symbols, Glass Effects
- **Error Tracking**: Sentry

## Project Structure

```
kabuchat/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express server setup
│   │   ├── socket.ts              # Socket.IO event handlers
│   │   ├── controllers/           # Business logic
│   │   │   ├── conversation.controller.ts
│   │   │   ├── friend.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── routes/                # API endpoints
│   │   │   ├── conversation.routes.ts
│   │   │   ├── friend.routes.ts
│   │   │   ├── message.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── lib/                   # Utilities & helpers
│   │   │   ├── clerk.ts           # Clerk authentication helpers
│   │   │   ├── message.helpers.ts # Message formatting utilities
│   │   │   ├── prisma.ts          # Prisma client initialization
│   │   │   ├── push-notification.ts
│   │   │   └── socket.ts
│   │   └── middleware/            # Express middleware
│   │       └── auth.middleware.ts # Authentication validation
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # Database migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── prisma.config.ts
│
└── mobile/
    ├── src/
    │   ├── app/
    │   │   ├── _layout.tsx        # Root layout with providers
    │   │   ├── (auth)/            # Authentication screens
    │   │   ├── (modals)/          # Modal screens
    │   │   ├── (tabs)/            # Tabbed screens
    │   │   └── chat/              # Chat screens
    │   ├── components/            # Reusable components
    │   │   ├── ChatInput.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── MessageMenu.tsx
    │   │   └── ...
    │   ├── hooks/                 # Custom React hooks
    │   │   ├── useChatSocket.ts
    │   │   ├── useMessageActions.ts
    │   │   ├── useNotifications.ts
    │   │   └── ...
    │   ├── contexts/              # React Context providers
    │   │   └── theme.context.tsx
    │   └── lib/                   # Utilities
    │       ├── api.ts             # API client configuration
    │       ├── socket.ts          # Socket.IO configuration
    │       ├── notifications.ts
    │       └── ...
    ├── assets/
    │   ├── images/                # Image assets
    │   └── expo.icon/             # App icon
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── metro.config.js
    ├── eas.json                   # Expo Application Services config
    └── app.json                   # App configuration
```

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: Package manager
- **PostgreSQL**: v14+ (using Neon for serverless PostgreSQL)
- **Expo CLI**: For running the mobile app
- **Android Studio**: For native mobile development (optional)
- **Clerk Account**: For authentication services
- **Sentry Account**: For error tracking (optional)

## Installation & Setup

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `backend` directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:port/kabuchat"

   # Clerk Authentication
    CLERK_SECRET_KEY=your_clerk_secret_key_here
    CLERK_JWT_KEY=your_clerk_jwt_key_here
    CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Socket.IO CORS
   SOCKET_CORS_ORIGINS=exp://192.168.1.65:8081,http://192.168.1.65:8081

   # Push Notifications (optional)
   EXPO_ACCESS_TOKEN=your_expo_access_token
   ```

4. **Setup database**:
   ```bash
   # Generate Prisma client
   npm run postinstall

   # Run migrations
   npx prisma migrate deploy

   # (Optional) Seed database
   npx prisma db seed
   ```

### Mobile Setup

1. **Navigate to mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create an `.env.local` file in the `mobile` directory:
   ```env
   # API Configuration
   EXPO_PUBLIC_API_BASE_URL=http://your-backend-url:3000

   # Clerk Authentication
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

   # Sentry (optional)
   EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_url
   ```

4. **Generate TypeScript types**:
   ```bash
   npm run lint
   ```

##  Running the Application

### Backend

**Development mode with hot reload**:
```bash
cd backend
npm run dev
```

The server will start at `http://localhost:5000` with Socket.IO available at the same URL.

**Production build**:
```bash
npm run build
npm start
```

### Mobile

**Start Expo development server**:
```bash
cd mobile
npm start (or npx expo)
```

**Run on Android**:
```bash
npm run android
```

**Run on iOS**:
```bash
npm run ios
```

**Build for production**:
```bash
eas build --platform android
eas build --platform ios
```

## Database Schema

The application uses PostgreSQL with the following main models:

### User
- `id` (UUID): Primary key
- `clerkId` (String): Unique Clerk user identifier
- `username` (String): Optional display name
- `avatar` (String): Profile avatar URL
- `createdAt` (DateTime): Account creation timestamp

### Message
- `id` (UUID): Primary key
- `content` (String): Message text (max 5000 chars)
- `senderId` (UUID): Reference to User
- `conversationId` (UUID): Reference to Conversation
- `replyToId` (UUID): Optional reply reference
- `isDeleted`, `isEdited`: Soft delete and edit flags
- `createdAt`, `editedAt`, `deletedAt`: Timestamps

### Conversation
- `id` (UUID): Primary key
- `name` (String): Optional group name
- `isGroup` (Boolean): Group vs. DM indicator
- `createdAt` (DateTime): Creation timestamp

### ConversationMember
- Links users to conversations with join/leave tracking

### FriendRequest
- `id` (UUID): Primary key
- `senderId`, `receiverId` (UUID): User references
- `status` (String): "pending", "accepted", "rejected"
- `createdAt` (DateTime): Request timestamp

### MessageRead
- `id` (UUID): Primary key
- `messageId`, `userId` (UUID): References
- `readAt` (DateTime): Read timestamp
- Unique constraint on (messageId, userId)

### PushToken
- `id` (UUID): Primary key
- `userId` (UUID): User reference
- `token` (String): Device push token
- `createdAt` (DateTime): Registration timestamp

## API Endpoints

### User Routes
```
POST   /api/users/register          # Register new user
GET    /api/users/:id               # Get user profile
PUT    /api/users/:id               # Update user profile
```

### Conversation Routes
```
GET    /api/conversations           # List user conversations
POST   /api/conversations           # Create new conversation
GET    /api/conversations/:id       # Get conversation details
PUT    /api/conversations/:id       # Update conversation
DELETE /api/conversations/:id       # Delete conversation
```

### Message Routes
```
GET    /api/messages/:conversationId   # Get conversation messages
POST   /api/messages                    # Send message (REST fallback)
PUT    /api/messages/:id                # Edit message
DELETE /api/messages/:id                # Delete message
```

### Friend Routes
```
GET    /api/friends                  # Get friend list
POST   /api/friends/request          # Send friend request
GET    /api/friends/requests         # Get friend requests
PUT    /api/friends/requests/:id     # Accept/Reject request
DELETE /api/friends/:id              # Remove friend
```

### Notification Routes
```
POST   /api/notifications/token      # Register push token
DELETE /api/notifications/token/:id  # Unregister token
GET    /api/notifications            # Get notifications
```

## WebSocket Events

### Client -> Server Events

**Chat Events**:
- `joinRoom(conversationId)` - Join a conversation room
- `sendMessage(data)` - Send a message
  - `data`: `{ conversationId, content, replyToId? }`
- `editMessage(data)` - Edit a message
  - `data`: `{ messageId, content }`
- `deleteMessage(messageId)` - Delete a message
- `markAsRead(messageId)` - Mark message as read
- `leaveRoom(conversationId)` - Leave a room

**Presence Events**:
- `userTyping(conversationId)` - Indicate user is typing
- `userStoppedTyping(conversationId)` - Indicate typing stopped

### Server -> Client Events

- `messageReceived(message)` - New message in joined room
- `messageEdited(message)` - Message was edited
- `messageDeleted(messageId)` - Message was deleted
- `messageRead(data)` - User read a message
- `error(error)` - Error occurred
- `userTyping(userId)` - User is typing
- `userStoppedTyping(userId)` - User stopped typing

## Project Architecture

### Data Flow

1. **Authentication**: Users authenticate via Clerk, receiving JWT tokens
2. **API Communication**: REST API for CRUD operations
3. **Real-time Updates**: WebSocket (Socket.IO) for:
   - Message delivery
   - Presence and typing indicators
   - Real-time notifications
4. **Database**: Prisma ORM handles all database operations
5. **Push Notifications**: Expo Notifications API sends device notifications

### Security
- **JWT Authentication**: All API requests validated with JWT tokens
- **Socket.IO Authentication**: Socket connections require valid JWT
- **CORS**: Configurable cross-origin resource sharing
- **Database Transactions**: Prisma manages data consistency
- **Input Validation**: Zod schemas validate all inputs

### Performance
- **Connection Pooling**: Neon adapter handles PostgreSQL connections
- **Indexed Queries**: MessageRead index on (userId, readAt)
- **Socket.IO Rooms**: Message routing via conversation rooms
- **Caching**: Client-side caching in mobile app

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

**Last Updated**: May 2026
