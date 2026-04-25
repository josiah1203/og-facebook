
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function seed() {
  const conn = await createConnection('mysql://2Vn1GfmwPo9UhbS.root:FRXSJhQ7box5zara8eC12s1v0aFHKzYk@ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com:4000/19dc2688-22e2-8449-8000-09474a422b3f');
  console.log('Seeding OG database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Clear tables
  await conn.execute('DELETE FROM comments');
  await conn.execute('DELETE FROM likes');
  await conn.execute('DELETE FROM friendships');
  await conn.execute('DELETE FROM posts');
  await conn.execute('DELETE FROM email_verifications');
  await conn.execute('DELETE FROM users');

  const users = [
    { name: 'Alex Chen', email: 'alex.chen@harvard.edu', college: 'Harvard', major: 'Computer Science', gradYear: 2026, hometown: 'San Francisco, CA', bio: 'CS major who loves building things.' },
    { name: 'Jordan Rivera', email: 'j.rivera@stanford.edu', college: 'Stanford', major: 'Biology', gradYear: 2025, hometown: 'Miami, FL', bio: 'Pre-med student. Coffee enthusiast.' },
    { name: 'Taylor Park', email: 't.park@mit.edu', college: 'MIT', major: 'Physics', gradYear: 2027, hometown: 'Seattle, WA', bio: 'Physics nerd and amateur photographer.' },
    { name: 'Morgan Blake', email: 'm.blake@yale.edu', college: 'Yale', major: 'English Literature', gradYear: 2026, hometown: 'New York, NY', bio: 'Bookworm, writer, and campus radio DJ.' },
    { name: 'Casey Kim', email: 'c.kim@berkeley.edu', college: 'Berkeley', major: 'Economics', gradYear: 2025, hometown: 'Los Angeles, CA', bio: 'Econ major with a passion for social impact.' },
    { name: 'Riley OBrien', email: 'r.obrien@harvard.edu', college: 'Harvard', major: 'History', gradYear: 2026, hometown: 'Boston, MA', bio: 'History buff and intramural basketball player.' },
    { name: 'Sam Patel', email: 's.patel@stanford.edu', college: 'Stanford', major: 'Mechanical Engineering', gradYear: 2027, hometown: 'Chicago, IL', bio: 'Building robots and breaking things.' },
    { name: 'Jamie Foster', email: 'j.foster@mit.edu', college: 'MIT', major: 'Mathematics', gradYear: 2026, hometown: 'Austin, TX', bio: 'Math major who believes in the beauty of primes.' },
  ];

  const userIds = [];
  for (const u of users) {
    const [result] = await conn.execute(
      'INSERT INTO users (email, passwordHash, name, college, major, gradYear, hometown, bio, emailVerified, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, "user")',
      [u.email, passwordHash, u.name, u.college, u.major, u.gradYear, u.hometown, u.bio]
    );
    userIds.push(result.insertId);
  }

  // Friendships
  const pairs = [[0,1],[0,2],[0,5],[0,6],[1,2],[1,6],[1,7],[2,7],[2,4],[3,5],[3,0],[4,6],[4,7],[5,6]];
  for (const [a,b] of pairs) {
    await conn.execute('INSERT INTO friendships (requesterId, addresseeId, status) VALUES (?, ?, "accepted")', [userIds[a], userIds[b]]);
  }
  await conn.execute('INSERT INTO friendships (requesterId, addresseeId, status) VALUES (?, ?, "pending")', [userIds[3], userIds[4]]);

  // Posts
  const posts = [
    { u: 0, c: 'Just finished my first machine learning project! Anyone at Harvard taking CS281 next semester?' },
    { u: 1, c: 'Spent 6 hours in the lab today and finally got the cell cultures to behave. Small wins matter.' },
    { u: 2, c: 'The physics department coffee machine is broken again. This is a crisis.' },
    { u: 3, c: "Started reading 'The Overstory' for my contemporary fiction class. Richard Powers is incredible." },
    { u: 4, c: 'Econ 101 midterm went better than expected. Time to actually sleep tonight.' },
    { u: 0, c: 'Does anyone want to start a study group for algorithms? Thinking of meeting at Lamont Library on Tuesdays.' },
    { u: 5, c: 'Beat the law school team in intramural basketball tonight. History majors > Law students, confirmed.' },
    { u: 6, c: 'My robot finally navigated the maze without hitting a single wall. Small victories.' },
    { u: 7, c: 'Discovered a beautiful property about twin primes today. Days like this remind me why I love math.' },
    { u: 2, c: 'Late night at the Media Lab working on my photonics project. The city looks incredible from the 4th floor at 2am.' },
    { u: 4, c: 'Just registered for a social entrepreneurship seminar. Really excited about the speaker lineup this semester.' },
    { u: 1, c: 'Taught my first peer tutoring session today. Explaining concepts to others really solidifies your own understanding.' },
  ];

  const postIds = [];
  for (const p of posts) {
    const [result] = await conn.execute('INSERT INTO posts (userId, content) VALUES (?, ?)', [userIds[p.u], p.c]);
    postIds.push(result.insertId);
  }

  // Likes
  const likes = [
    [1,0],[2,0],[5,0],[0,1],[2,1],[6,1],[0,2],[1,2],[7,2],[0,3],[5,3],
    [1,4],[3,4],[1,5],[2,5],[5,5],[6,5],[0,6],[3,6],[0,7],[4,7],[7,7],
    [2,8],[4,8],[1,9],[7,9],[0,10],[6,10],[0,11],[4,11],[5,11]
  ];
  for (const [u,p] of likes) {
    await conn.execute('INSERT INTO likes (userId, postId) VALUES (?, ?)', [userIds[u], postIds[p]]);
  }

  // Comments
  const comments = [
    [2,0,'Congrats! Im in CS281 right now - its intense but worth it.'],
    [5,0,'Id be down for a study group! DM me.'],
    [0,1,'The dedication is admirable. Keep it up!'],
    [7,2,'I feel this on a spiritual level.'],
    [0,5,'Tuesdays work for me. Lets do it.'],
    [3,6,'History majors representing!'],
    [4,7,'Thats amazing! When do we get to see it in action?'],
  ];
  for (const [u,p,c] of comments) {
    await conn.execute('INSERT INTO comments (userId, postId, content) VALUES (?, ?, ?)', [userIds[u], postIds[p], c]);
  }

  await conn.end();
  console.log('Seeded OG database successfully!');
  console.log('Demo login: alex.chen@harvard.edu / password123');
}

seed().catch(console.error);
