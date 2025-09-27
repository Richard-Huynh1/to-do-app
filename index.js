import bcrypt from "bcrypt";
import env from "dotenv";
import express from "express";
import flash from "connect-flash";
import GoogleStrategy from "passport-google-oauth2";
import passport from "passport";
import session from "express-session";
import { Strategy } from "passport-local";
import pg from "pg";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extend: true }));
app.use(express.static("public"));  

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();
let userId;

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs"); 
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { message: req.flash("error") });
});

function capitalizeFirstLettter(str) {
  if (typeof str !== "string" || str.length == 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.log(err);
    res.redirect("/");
  })
});

app.get("/tasks", async (req, res) => {
  if (req.isAuthenticated()) {
    const timeframe = req.query.sort;
    const filter = req.query.filter;
    let tasks;
    let title;
    let orderBy = " ORDER BY "
    switch (filter) {
      case "newest":
        orderBy += "id DESC";
        break;
      case "oldest":
        orderBy += "id ASC";
        break;
      case "hardest":
        orderBy += "difficulty DESC";
        break;
      case "easiest":
        orderBy += "difficulty ASC";
        break;
      default:
        orderBy = "";
    }
    try {
      if (timeframe) {
        const result = await db.query(
          "SELECT * FROM tasks WHERE user_id = $1 AND timeframe = $2" + orderBy, [userId, timeframe]
        );
        tasks = result.rows;
        title = capitalizeFirstLettter(timeframe) + " tasks";
      } else {
        const result = await db.query("SELECT * FROM tasks WHERE user_id = $1" + orderBy, [userId]);
        tasks = result.rows;
        title = "All tasks"
      }
      res.render("tasks.ejs", { title: title, tasks: tasks });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

app.get(
  "/auth/google/register",
  passport.authenticate("google-register", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/login",
  passport.authenticate("google-login", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/tasks-register",
  passport.authenticate("google-register", {
    successRedirect: "/tasks",
    failureRedirect: "/register",
  })
);

app.get(
  "/auth/google/tasks-login",
  passport.authenticate("google-login", {
    successRedirect: "/tasks",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.post("/login", passport.authenticate("local", {
  successRedirect: "/tasks",
  failureRedirect: "/login",
  failureFlash: true,
}));

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkResult.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            userId = user.id;
            console.log("success");
            res.redirect("/tasks");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.redirect("/register");
  }
});

app.post("/edit", async (req, res) => {
  try {
    const difficulty = parseInt(req.body.rating);
    if (!Number.isNaN(difficulty)) {
      await db.query(
        "UPDATE tasks SET description = $1, difficulty = $2 WHERE id = $3",
        [req.body.description, difficulty, req.body.id]
      );
      res.json({ message: "Task updated sucessfully" });
    } else {
      res.json({ message: "Difficulty not a number. Task not edited" })
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/tasks", async (req, res) => {
  const timeframe = req.query.sort;
  try {
    const difficulty = parseInt(req.body.rating);
    if (!Number.isNaN(difficulty)) {
      await db.query(
        "INSERT INTO tasks (description, difficulty, user_id, timeframe) VALUES ($1, $2, $3, $4)",
        [req.body.description, difficulty, userId, timeframe]
      );
      res.status(201).json({ message: "Task added successfully" });
    } else {
      res.json({ message: "Difficulty of task not a number. Not added" });
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.delete("/tasks", async (req, res) => {
  try {
    await db.query("DELETE FROM tasks WHERE id = $1", [req.body.id]);
    res.status(200).json({ message: "Task sucessfully deleted." });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            return cb(err);
          } else {
            if (valid) {
              userId = user.id;
              return cb(null, user);
            } else {
              return cb(null, false, { message: "Incorrect password" });
            }
          }
        });
      } else {
        return cb(null, false, { message: "User not found" });
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google-register",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/tasks-register",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE email = $1", [profile.email]
        );
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"]
          );
          userId = newUser.id;
          return cb(null, newUser.rows[0]);
        } else {
          const user = result.rows[0];
          userId = user.id;
          return cb(null, user);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.use(
  "google-login",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/tasks-login",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE email = $1", [profile.email]
        );
        if (result.rows.length === 0) {
          return cb(null, false, { message: "Google account not registered" });
        } else {
          const user = result.rows[0];
          userId = user.id;
          return cb(null, user);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});