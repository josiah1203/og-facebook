
import { createConnection } from 'mysql2/promise';
async function test() {
  try {
    const conn = await createConnection('mysql://2Vn1GfmwPo9UhbS.root:FRXSJhQ7box5zara8eC12s1v0aFHKzYk@ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com:4000/19dc2688-22e2-8449-8000-09474a422b3f');
    const [rows] = await conn.execute('SELECT 1 as test');
    console.log('Connection OK:', rows);
    await conn.end();
  } catch(e) {
    console.error('Connection failed:', e.message);
  }
}
test();
