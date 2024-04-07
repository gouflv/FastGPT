import { createClient } from 'webdav';

export const client = createClient('http://127.0.0.1:8001/remote.php/webdav', {
  // TODO env config
  username: 'root',
  password: 'root'
});
