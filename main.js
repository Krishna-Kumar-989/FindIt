const express = require("express");
const mongoose = require("mongoose");

const bcrypt = require("bcrypt");

const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 3000;

const router = express.Router();

const bodyParser = require("body-parser");

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST"],
  })
);

app.use(express.static("public"));

//////universal variables////
let current_session = "john_doe";
const dbUrl = process.env.DATABASE_CONNECTION_STRING;

/////////////////////////////

// Middleware to parse JSON bodies
app.use(express.json()); // For parsing application/json

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Connect to MongoDB

let url = dbUrl;

mongoose
  .connect(url)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(() => {
    console.log("Error connecting to MongoDB");
  });

///////////////////////////////////////////////////////////////////////////////////////////////
//login and signup  are below

// Create Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// POST route for signup
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const data = {
      username: username,
      email: email,
      password: hashedPassword,
    };

    const existinguser = await User.findOne({ username: data.username });

    if (existinguser) {
      console.log("already user");
    } else {
      // Save user to the database
      const userdata = await User.insertMany(data);

      console.log("user created succesfully");

      res.redirect("/login.html");
    }
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Error creating user" });
  }
});

////////////////////////////////////////////////////
////login////////////////////////////////////////////////

app.use(express.json()); // Middleware to parse JSON requests
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded requests

// POST route for login
app.post("/login", async (req, res) => {
  try {
    // Check if the username exists in the database
    const check = await User.findOne({ username: req.body.username });

    console.log("Database query result:", check);

    if (!check) {
      // Username not found
      console.log("Username not found");

      //return res.json({ success: false, message: "Username not found", username: "" });
    }

    // Compare the password with the hashed password in the database
    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      check.password
    );

    if (isPasswordMatch) {
      // Password matched, successful login
      console.log("Password matched");

      current_session = req.body.username;
      console.log("current session :" + current_session);

      //login_response(req.body.username);

      //res.redirect('navbar.html');

      res.json({ success: true, redirectUrl: "/navbar.html" });

      // res.json({ success: true, message: "Successful login", username: req.body.username, redirectUrl: "/navbar.html" });
    } else {
      // Password mismatch

      console.log("Incorrect password");
      //  return res.json({ success: false, message: "Incorrect password", username: "" });
    }
  } catch (error) {
    // Handle any errors during the process
    console.log("Error during login:", error);
    return res.json({
      success: false,
      message: "An error occurred during login",
      username: error,
    });
  }
});

/////////////////////////////////////////////////////////////////////////////////////

///below is the code for main screen////////

// Define the schema
const textObjectSchema = new mongoose.Schema({
  user_who_registered: { type: String, required: true },
  is_resolved: { type: Boolean, required: true },
  lost_or_found: { type: String, required: true }, //l or F
  name: { type: String, required: true },
  place: { type: String, required: true },
  time: { type: String, required: true },
  contact: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: String, required: true },
});

// Create the model
const collection = mongoose.model("Lost_data", textObjectSchema);

// Middleware

app.use(express.json());

// // POST route: Insert new data into the database
app.post("/registration", async (req, res, next) => {
  const name = req.body;

  if (!name) {
    return res.status(400).send({ status: "failed" });
  }

  try {
    await collection.insertMany(name); // Insert the data
    //res.status(200).send({ status: 'received' });
    console.log("Data inserted:", name);
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).send({ status: "failed", message: "Error inserting data" });
  }

  next();
});

console.log("hearoeridgfkj");

//////////////////////////////////////////////////////

// POST endpoint to send JSON to the client
app.post("/", async (req, res) => {
  // Log the request body (for demonstration)
  console.log("Request received:", req.body);

  // Create a JSON object to send as a response for basic info

  const data = await collection
    .find()
    .select("_id lost_or_found  name timestamp"); // Fetch required fields
  const databasics_extracted = data.map((obj) => ({
    _id: obj._id,
    lost_or_found: obj.lost_or_found,
    name: obj.name,
    timestamp: obj.timestamp,
  }));

  console.log("Extracted data:", databasics_extracted);

  res.json(databasics_extracted); // Send the JSON data directly
  console.log("JSON sent to client");
});

/////////////////////////////////////////////

///code for posting complete details to the client below

app.use(bodyParser.json());

// POST endpoint to send JSON to the client
app.post("/details", async (req, res) => {
  // Log the request body (for demonstration)
  console.log("Request received:", req.body);

  // Extract the id to search for
  let idval = req.body.id; // Assuming the request body is { id: 'some-id' }

  // Ensure the id is a valid ObjectId (if necessary)
  if (!mongoose.Types.ObjectId.isValid(idval)) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  try {
    // Fetch the document from MongoDB
    const data = await collection
      .find({ _id: new mongoose.Types.ObjectId(idval) })
      .select(
        "_id user_who_registered is_resolved lost_or_found  name place time contact description timestamp"
      ); // Fetch only required fields

    // If no data found
    if (data.length === 0) {
      return res
        .status(404)
        .json({ message: "No document found for the given ID" });
    }

    // Extract necessary fields
    const data_extracted = data.map((obj) => ({
      _id: obj._id,
      user_who_registered: obj.user_who_registered,
      is_resolved: obj.is_resolved,
      lost_or_found: obj.lost_or_found,
      name: obj.name,
      place: obj.place,
      time: obj.time,
      contact: obj.contact,
      description: obj.description,
      timestamp: obj.timestamp,
    }));

    console.log("Extracted data:", data_extracted);

    // Send the JSON data as response
    res.json(data_extracted);
    console.log("JSON sent to client");
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//////////////////////////////////////////////////////////

/////load information to account section

/*
app.post('/account', async (req, res) => {
  // Log the request body (for demonstration)
  console.log('Request received:', req.body);

  try {
    // Fetch the user based on username from the request body
    const account_data = await User.findOne({ username: req.body.username }).select('username email');

    if (!account_data) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract the necessary fields
    const account_data_extracted = {
      username: account_data.username,
      email: account_data.email,
    };

    console.log("Extracted data:", account_data_extracted);

    // Send the JSON response
    res.json(account_data_extracted);
    console.log("JSON sent to client");

  } catch (error) {
    console.error('Error fetching account data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
*/

//////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////
//load items list to account ////section/////////////////////

// POST endpoint to send JSON to the client
app.post("/account_item_list", async (req, res) => {
  // Log the request body (for demonstration)
  console.log("Request received:", req.body);

  // Create a JSON object to send as a response for basic info

  const data = await collection
    .find()
    .select("_id user_who_registered lost_or_found  name timestamp"); // Fetch required fields
  const databasics_extracted = data.map((obj) => ({
    _id: obj._id,
    user_who_registered: obj.user_who_registered,
    lost_or_found: obj.lost_or_found,
    name: obj.name,
    timestamp: obj.timestamp,
    current_session: current_session,
  }));

  console.log("Extracted data:", databasics_extracted);

  res.json(databasics_extracted); // Send the JSON data directly
  console.log("JSON sent to client");
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////

///code to send user session details to the footer///////////////////////////////////

app.post("/footer", async (req, res) => {
  // Log the request body (for demonstration)
  console.log("Request received:", req.body);
  const account_data = await User.findOne({ username: current_session }).select(
    "username email"
  );

  // Create a JSON object to send as a response for basic info

  const databasics_extracted = {
    current_session: current_session,
    details: {
      username: account_data.username,
      email: account_data.email,
    },
  };

  console.log("Extracted data:", databasics_extracted);

  res.json(databasics_extracted); // Send the JSON data directly
  console.log("JSON sent to client");
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////code for mark as resolved status///////////////////////////////////////////////

app.post("/markasresolved", async (req, res, next) => {
  const value = req.body;

  if (!value) {
    return res.status(400).send({ status: "failed" });
  }

  try {
    // Update the document by its ObjectId
    const result = await collection.updateOne(
      { _id: value.info_id }, // Find the document by ObjectId
      { is_resolved: value.case_resol_status } // Use $set to update specified fields
    );

    console.log("truth value changed:", value);
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).send({ status: "failed", message: "Error inserting data" });
  }
});

////////////////////////////////////////////////////////

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
