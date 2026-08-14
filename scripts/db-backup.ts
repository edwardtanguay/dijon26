import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export async function backupDatabase() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error('DATABASE_URL is missing in environment variables.');
    process.exit(1);
  }
  
  if (url.startsWith('file:')) {
    console.warn('DATABASE_URL is a local file. This backup script is for remote databases.');
    process.exit(0);
  }

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  
  const backupDir = path.join(process.cwd(), 'dev', 'backups', 'database');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Pre-backup cleanup: delete any unneeded sidecar files (-wal, -shm, -info, .tmp) left behind by prior backup runs
  try {
    const files = fs.readdirSync(backupDir);
    for (const file of files) {
      if (file.startsWith('.tmp') || file.endsWith('-wal') || file.endsWith('-shm') || file.endsWith('-info')) {
        try {
          fs.unlinkSync(path.join(backupDir, file));
        } catch (e) {
          // Ignore if locked by another active process
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }

  // Query contact and challenge counts from remote database
  let contactCount = 0;
  let challengeCount = 0;
  try {
    const remoteDb = createClient({ url, authToken });
    
    try {
      const contactRes = await remoteDb.execute('SELECT COUNT(*) as count FROM Contact');
      if (contactRes.rows.length > 0 && contactRes.rows[0].count !== undefined) {
        contactCount = Number(contactRes.rows[0].count);
      }
    } catch (e) {
      console.warn('Could not query remote Contact count:', e);
    }

    try {
      const challengeRes = await remoteDb.execute('SELECT COUNT(*) as count FROM Challenge');
      if (challengeRes.rows.length > 0 && challengeRes.rows[0].count !== undefined) {
        challengeCount = Number(challengeRes.rows[0].count);
      }
    } catch (e) {
      console.warn('Could not query remote Challenge count:', e);
    }

    remoteDb.close();
  } catch (e) {
    console.warn('Could not connect to remote database for count check:', e);
  }

  const filename = `dijon26-data-${timestamp}-${contactCount}contacts-${challengeCount}challenges.sqlite`;
  const filePath = path.join(backupDir, filename);

  console.log(`Starting backup to ${filePath}...`);
  
  const backupClient = createClient({
    url: `file:${filePath}`,
    syncUrl: url,
    authToken: authToken
  });

  await backupClient.sync();
  backupClient.close();

  // Wait 500ms for LibSQL sync client native handle release
  await new Promise(r => setTimeout(r, 500));

  // Open plain local connection to checkpoint WAL and convert journal mode to DELETE
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const localDb = createClient({ url: `file:${filePath}` });
      await localDb.execute('PRAGMA wal_checkpoint(TRUNCATE)');
      await localDb.execute('PRAGMA journal_mode = DELETE');
      localDb.close();
      break;
    } catch (e) {
      if (attempt === 3) {
        // Silently proceed if journal mode is locked; backup SQLite file is still valid
      } else {
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }

  // Wait 100ms for local handle release
  await new Promise(r => setTimeout(r, 100));

  // Clean sidecar files (.sqlite-wal, .sqlite-shm, .sqlite-info)
  const sidecars = [filePath + '-wal', filePath + '-shm', filePath + '-info'];
  for (const sidecar of sidecars) {
    if (fs.existsSync(sidecar)) {
      try {
        fs.unlinkSync(sidecar);
      } catch (e) {
        // Ignore if locked
      }
    }
  }

  // Clean orphaned .tmp, -wal, -shm files across backup directory
  try {
    const files = fs.readdirSync(backupDir);
    for (const file of files) {
      if (file.startsWith('.tmp') || file.endsWith('-wal') || file.endsWith('-shm') || file.endsWith('-info')) {
        try {
          fs.unlinkSync(path.join(backupDir, file));
        } catch (e) {
          // Ignore locked files
        }
      }
    }
  } catch (e) {
    console.warn('Could not clean up sidecar files:', e);
  }

  console.log(`✅ Backup successful! Saved to ${filePath}`);
}

// Allow direct execution if run as standalone script
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  backupDatabase().catch(console.error);
}
