import { createClient } from 'webdav';

const { WEBDAV_HOST, WEBDAV_USER, WEBDAV_PWD } = process.env;

const host = WEBDAV_HOST || 'http://127.0.0.1:8001';
const username = WEBDAV_USER || 'root';
const password = WEBDAV_PWD || 'root';

console.log(`connect WebDAV ${host} ${username}@${password}`);

export const webDAVClient = createClient(`${host}/remote.php/webdav`, {
  username,
  password
});

export const webDAVFileClient = createClient(`${host}/remote.php/dav/files/${username}`, {
  username,
  password
});
