import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { databaseHealth } from './config/database.js';
import { openApiDocument } from './config/swagger.js';
import { attachmentRouter, taskAttachmentRouter } from './modules/attachments/attachment.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { commentRouter, taskCommentRouter } from './modules/comments/comment.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { projectRouter } from './modules/projects/project.routes.js';
import { projectTaskRouter, taskRouter } from './modules/tasks/task.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { AppError } from './shared/appError.js';

export const app = express();

if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

const allowedOrigins = env.CLIENT_URL.split(',')
  .map((value) => value.trim())
  .filter(Boolean);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('Origin is not allowed by CORS.', 403));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
if (env.NODE_ENV !== 'test') app.use(morgan('combined'));

app.get('/api/health', (_request, response) => {
  const database = databaseHealth();
  response.status(database === 'connected' ? 200 : 503).json({
    success: true,
    data: {
      status: database === 'connected' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/api/docs.json', (_request, response) => response.json(openApiDocument));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/projects/:projectId/tasks', projectTaskRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks/:taskId/comments', taskCommentRouter);
app.use('/api/tasks/:taskId/attachments', taskAttachmentRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/comments', commentRouter);
app.use('/api/attachments', attachmentRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit-logs', auditRouter);

app.use(notFound);
app.use(errorHandler);
