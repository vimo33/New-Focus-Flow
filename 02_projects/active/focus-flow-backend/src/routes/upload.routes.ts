import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const UPLOAD_DIR = '/srv/focus-flow/00_inbox/raw/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.docx', '.pdf', '.md', '.txt', '.json', '.csv', '.png', '.jpg', '.jpeg', '.svg', '.zip', '.html'];

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Preserve original name, prefix with timestamp to avoid collisions
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  },
});

// POST /api/uploads - Upload file(s)
router.post('/uploads', upload.array('files', 10), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const result = files.map((f) => ({
      name: f.filename,
      originalName: f.originalname,
      size: f.size,
      path: f.path,
      uploadedAt: new Date().toISOString(),
    }));

    res.status(201).json({ files: result });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/uploads - List uploaded files
router.get('/uploads', async (_req: Request, res: Response) => {
  try {
    const entries = await fs.promises.readdir(UPLOAD_DIR);
    const files = await Promise.all(
      entries.map(async (name) => {
        const filePath = path.join(UPLOAD_DIR, name);
        const stat = await fs.promises.stat(filePath);
        return {
          name,
          originalName: name.replace(/^\d+-/, ''),
          size: stat.size,
          uploadedAt: stat.mtime.toISOString(),
        };
      })
    );

    // Sort newest first
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    res.json({ files, count: files.length });
  } catch (error: any) {
    console.error('Error listing uploads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/uploads/:filename - Download a file
router.get('/uploads/:filename', (req: Request, res: Response) => {
  try {
    const filename = path.basename(String(req.params.filename));
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, filename.replace(/^\d+-/, ''));
  } catch (error: any) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/uploads/:filename - Remove a file
router.delete('/uploads/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(String(req.params.filename));
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.promises.unlink(filePath);
    res.json({ status: 'deleted', filename });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multer error handling middleware
router.use((err: any, _req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
