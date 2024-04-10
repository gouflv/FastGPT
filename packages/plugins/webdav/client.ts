import { createClient } from 'webdav';

const { WEBDAV_HOST, WEBDAV_USER, WEBDAV_PWD } = process.env;

const host = WEBDAV_HOST || 'http://localhost:8001';
const username = WEBDAV_USER || 'root';
const password = WEBDAV_PWD || 'root';

export const webDAVClient = createClient(`${host}/remote.php/webdav`, {
  username,
  password
});

export const webDAVFileClient = createClient(`${host}/remote.php/dav/files/${username}`, {
  username,
  password
});
