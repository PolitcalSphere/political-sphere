import { fileURLToPath } from 'node:url';
import { JsonNewsStore } from './newsStore.js';
import { NewsService } from './newsService.js';
import { createNewsServer, startServer } from './server.js';

const PORT = Number.parseInt(process.env.API_PORT ?? '4000', 10);
const HOST = process.env.API_HOST ?? '0.0.0.0';

const store = new JsonNewsStore(new URL('../data/news.json', import.meta.url));
const service = new NewsService(store);
const server = createNewsServer(service);

startServer(server, PORT, HOST);
