const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('MongoDB URI not found. Check your .env file.');
  process.exit(1);
}

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.log('Database connection error:', err));

//Create schema
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const createAndSaveUser = (username, done) => {
  var newItem = new User({ username: username });
  newItem.save((err, data) => {
    if (err) return console.error(err);
    done(null, data);
  });
};

const getUserList = (done) => {
  itemList = User.find({}, (err, data) => {
    if (err) return console.error(err);
    done(data);
  })
}

app.post('/api/users', function (req, res) {
  const username = req.body.username;
  createAndSaveUser(username, (err, response) => {
    res.json({
      username: response.username,
      _id: response._id
    })
  });
});

app.get('/api/users', function (req, res) {
  getUserList((response) => {
    res.json(response);
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
