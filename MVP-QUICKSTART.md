# Political Sphere MVP - Quick Start Guide

## 🚀 Phase 1: Core Loop - IMPLEMENTED

### What's Working Now

✅ **Authentication System** - JWT-based login/register
✅ **Game State API** - Create/join games, submit proposals, vote  
✅ **Frontend Integration** - Login, lobby, game board

### Quick Start

1. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   # Copy example env files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env

   # Generate secure JWT secrets
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))" >> apps/api/.env
   node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))" >> apps/api/.env
   ```

3. **Start the API server**:

   ```bash
   cd apps/api
   npx tsx src/index.ts
   ```

4. **Start the frontend** (in a new terminal):

   ```bash
   cd apps/web
   npm run dev
   ```

5. **Open your browser**:
   - Frontend: http://localhost:5173
   - API Health: http://localhost:3001/health

### First Play Through

1. **Register** a new account (username + password)
2. **Create a game** from the lobby
3. **Open another browser** (or incognito window)
4. **Register another user** and **join the game**
5. **Submit proposals** and **vote** on them!

### Current Limitations (MVP)

- Games stored in memory (lost on server restart)
- No real-time updates (refresh to see changes)
- No WebSocket yet (Phase 2)
- Basic UI (functional but not polished)
- No persistence (Phase 2)

### Next Steps - Phase 2 (Multiplayer)

- [ ] WebSocket integration for real-time updates
- [ ] Database persistence (SQLite/PostgreSQL)
- [ ] Turn management with timers
- [ ] Improve UI/UX

### Architecture

```
apps/
  api/
    src/
      auth/          # JWT authentication
      game/          # Game state management
      index.ts       # Express server
  web/
    src/
      components/    # React UI components
      utils/         # API client
      App.tsx        # Main app router
libs/
  game-engine/       # Deterministic game logic (already exists)
```

### API Endpoints

**Auth**:

- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user

**Game**:

- `POST /game/create` - Create game
- `GET /game/list` - List all games
- `GET /game/my-games` - Get your games
- `GET /game/:id` - Get game details
- `POST /game/:id/join` - Join game
- `POST /game/:id/start` - Start game (creator only)
- `POST /game/:id/action` - Submit action (propose, vote, etc.)
- `DELETE /game/:id` - Delete game (creator only)

### Troubleshooting

**API won't start**:

- Check `.env` file exists in `apps/api/`
- Ensure port 3001 is not already in use

**Frontend can't connect**:

- Verify API is running on http://localhost:3001
- Check browser console for CORS errors
- Ensure `.env` in `apps/web/` has correct API URL

**TypeScript errors**:

- Run `npm run type-check` to see all errors
- Most `any` types are MVP shortcuts, will be typed in Phase 2

### Testing

Run basic tests:

```bash
npm run test:api
npm run test:frontend
```

### Development Mode

The project follows "Fast Mode" governance during MVP:

- Comprehensive testing deferred
- Accessibility basics only
- Manual deployment
- Simple error handling

Full governance reactivates after MVP ships.

---

**Ready to play? Start the servers and visit http://localhost:5173!**
