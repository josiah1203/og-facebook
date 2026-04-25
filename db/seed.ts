import { getDb } from "../api/queries/connection";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  const db = getDb();
  console.log("Seeding OG database...");

  // Clear existing data (order matters due to FKs)
  await db.delete(schema.comments);
  await db.delete(schema.likes);
  await db.delete(schema.friendships);
  await db.delete(schema.posts);
  await db.delete(schema.emailVerifications);
  await db.delete(schema.users);

  // Create demo users
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { name: "Alex Chen", email: "alex.chen@harvard.edu", college: "Harvard", major: "Computer Science", gradYear: 2026, hometown: "San Francisco, CA", bio: "CS major who loves building things. Always down for late-night code sessions." },
    { name: "Jordan Rivera", email: "j.rivera@stanford.edu", college: "Stanford", major: "Biology", gradYear: 2025, hometown: "Miami, FL", bio: "Pre-med student. Coffee enthusiast." },
    { name: "Taylor Park", email: "t.park@mit.edu", college: "MIT", major: "Physics", gradYear: 2027, hometown: "Seattle, WA", bio: "Physics nerd and amateur photographer." },
    { name: "Morgan Blake", email: "m.blake@yale.edu", college: "Yale", major: "English Literature", gradYear: 2026, hometown: "New York, NY", bio: "Bookworm, writer, and campus radio DJ." },
    { name: "Casey Kim", email: "c.kim@berkeley.edu", college: "Berkeley", major: "Economics", gradYear: 2025, hometown: "Los Angeles, CA", bio: "Econ major with a passion for social impact." },
    { name: "Riley O'Brien", email: "r.obrien@harvard.edu", college: "Harvard", major: "History", gradYear: 2026, hometown: "Boston, MA", bio: "History buff and intramural basketball player." },
    { name: "Sam Patel", email: "s.patel@stanford.edu", college: "Stanford", major: "Mechanical Engineering", gradYear: 2027, hometown: "Chicago, IL", bio: "Building robots and breaking things (then fixing them)." },
    { name: "Jamie Foster", email: "j.foster@mit.edu", college: "MIT", major: "Mathematics", gradYear: 2026, hometown: "Austin, TX", bio: "Math major who believes in the beauty of primes." },
  ];

  const createdUsers: { id: number; email: string }[] = [];

  for (const u of users) {
    const result = await db.insert(schema.users).values({
      email: u.email,
      passwordHash,
      name: u.name,
      college: u.college,
      major: u.major,
      gradYear: u.gradYear,
      hometown: u.hometown,
      bio: u.bio,
      emailVerified: true,
      role: "user",
    });
    createdUsers.push({ id: Number(result[0].insertId), email: u.email });
  }

  // Create friendships (mutual connections)
  const friendshipPairs = [
    [0, 1], [0, 2], [0, 5], [0, 6], // Alex friends
    [1, 2], [1, 6], [1, 7], // Jordan friends
    [2, 7], [2, 4], // Taylor friends
    [3, 5], [3, 0], // Morgan friends
    [4, 6], [4, 7], // Casey friends
    [5, 6], // Riley friends
  ];

  for (const [a, b] of friendshipPairs) {
    await db.insert(schema.friendships).values({
      requesterId: createdUsers[a].id,
      addresseeId: createdUsers[b].id,
      status: "accepted",
    });
  }

  // Create a pending request
  await db.insert(schema.friendships).values({
    requesterId: createdUsers[3].id,
    addresseeId: createdUsers[4].id,
    status: "pending",
  });

  // Create posts
  const posts = [
    { userIdx: 0, content: "Just finished my first machine learning project! The accuracy isn't where I want it yet, but it's a start. Anyone at Harvard taking CS281 next semester?" },
    { userIdx: 1, content: "Spent 6 hours in the lab today and finally got the cell cultures to behave. Small wins matter." },
    { userIdx: 2, content: "The physics department coffee machine is broken again. This is a crisis." },
    { userIdx: 3, content: "Started reading 'The Overstory' for my contemporary fiction class. Richard Powers is incredible." },
    { userIdx: 4, content: "Econ 101 midterm went better than expected. Time to actually sleep tonight." },
    { userIdx: 0, content: "Does anyone want to start a study group for algorithms? Thinking of meeting at Lamont Library on Tuesdays." },
    { userIdx: 5, content: "Beat the law school team in intramural basketball tonight. History majors > Law students, confirmed." },
    { userIdx: 6, content: "My robot finally navigated the maze without hitting a single wall. Small victories." },
    { userIdx: 7, content: "Discovered a beautiful property about twin primes today. Days like this remind me why I love math." },
    { userIdx: 2, content: "Late night at the Media Lab working on my photonics project. The city looks incredible from the 4th floor at 2am." },
    { userIdx: 4, content: "Just registered for a social entrepreneurship seminar. Really excited about the speaker lineup this semester." },
    { userIdx: 1, content: "Taught my first peer tutoring session today. Explaining concepts to others really solidifies your own understanding." },
  ];

  const createdPosts: number[] = [];
  for (const p of posts) {
    const result = await db.insert(schema.posts).values({
      userId: createdUsers[p.userIdx].id,
      content: p.content,
    });
    createdPosts.push(Number(result[0].insertId));
  }

  // Create likes
  const likes = [
    { userIdx: 1, postIdx: 0 }, { userIdx: 2, postIdx: 0 }, { userIdx: 5, postIdx: 0 },
    { userIdx: 0, postIdx: 1 }, { userIdx: 2, postIdx: 1 }, { userIdx: 6, postIdx: 1 },
    { userIdx: 0, postIdx: 2 }, { userIdx: 1, postIdx: 2 }, { userIdx: 7, postIdx: 2 },
    { userIdx: 0, postIdx: 3 }, { userIdx: 5, postIdx: 3 },
    { userIdx: 1, postIdx: 4 }, { userIdx: 3, postIdx: 4 },
    { userIdx: 1, postIdx: 5 }, { userIdx: 2, postIdx: 5 }, { userIdx: 5, postIdx: 5 }, { userIdx: 6, postIdx: 5 },
    { userIdx: 0, postIdx: 6 }, { userIdx: 3, postIdx: 6 },
    { userIdx: 0, postIdx: 7 }, { userIdx: 4, postIdx: 7 }, { userIdx: 7, postIdx: 7 },
    { userIdx: 2, postIdx: 8 }, { userIdx: 4, postIdx: 8 },
    { userIdx: 1, postIdx: 9 }, { userIdx: 7, postIdx: 9 },
    { userIdx: 0, postIdx: 10 }, { userIdx: 6, postIdx: 10 },
    { userIdx: 0, postIdx: 11 }, { userIdx: 4, postIdx: 11 }, { userIdx: 5, postIdx: 11 },
  ];

  for (const l of likes) {
    await db.insert(schema.likes).values({
      userId: createdUsers[l.userIdx].id,
      postId: createdPosts[l.postIdx],
    });
  }

  // Create comments
  const comments = [
    { userIdx: 2, postIdx: 0, content: "Congrats! I'm in CS281 right now - it's intense but worth it." },
    { userIdx: 5, postIdx: 0, content: "I'd be down for a study group! DM me." },
    { userIdx: 0, postIdx: 1, content: "The dedication is admirable. Keep it up!" },
    { userIdx: 7, postIdx: 2, content: "I feel this on a spiritual level." },
    { userIdx: 0, postIdx: 5, content: "Tuesdays work for me. Let's do it." },
    { userIdx: 3, postIdx: 6, content: "History majors representing!" },
    { userIdx: 4, postIdx: 7, content: "That's amazing! When do we get to see it in action?" },
  ];

  for (const c of comments) {
    await db.insert(schema.comments).values({
      userId: createdUsers[c.userIdx].id,
      postId: createdPosts[c.postIdx],
      content: c.content,
    });
  }

  console.log("Seeded OG database successfully!");
  console.log(`Created ${users.length} users, ${friendshipPairs.length} friendships, ${posts.length} posts, ${likes.length} likes, ${comments.length} comments.`);
  console.log("Demo login: alex.chen@harvard.edu / password123");
}

seed().catch(console.error);
