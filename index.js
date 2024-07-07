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
const exerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: false },
  user: { type: userSchema, required: true },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

const createAndSaveUser = (username, done) => {
  var newItem = new User({ username: username });
  newItem.save((err, data) => {
    if (err) return console.error(err);
    done(null, data);
  });
};

const createAndSaveExercise = (newExercise, done) => {
  User.findById(newExercise.userId, (err, data) => {
    if (err) return console.log(err);

    var newItem = new Exercise({
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date ? newExercise.date : Date.now(),
      user: data
    });

    newItem.save((err, response) => {
      if (err) return console.error(err);
      done(response);
    });
  })
};

const getUserList = (done) => {
  User.find({}, (err, data) => {
    if (err) return console.error(err);
    done(data);
  })
}

const getExecisesOfUser = (userId, from, to, limit, done) => {
  let filter = null;

  if (from && to) {
    filter = {
      date: {
        $gte: new Date(from),
        $lte: new Date(to)
      }
    }
  }
  else if (from) {
    filter = {
      date: {
        $gte: new Date(from),
      }
    }
  }
  else if (to) {
    filter = {
      date: {
        $lte: new Date(to),
      }
    }
  }

  User.findById(userId, (err, userData) => {
    if (err) return console.log(err);

    let limitQuery = 0;
    Exercise.countDocuments({ user: userData }, (error, dataCount) => {
      if (error) return console.error(error);
      limitQuery = dataCount;
    })

    if (limit) {
      limitQuery =  parseInt(limit);
    }

    if (filter) {
      Exercise.find({
        user: userData, ...filter
      }, (err, exerciseData) => {
        if (err) return console.error(err);

        Exercise.countDocuments({ user: userData }, (error, dataCount) => {
          if (error) return console.error(error);

          done({
            user: userData,
            exerciseData: exerciseData,
            count: dataCount
          });
        })
      }).limit(limitQuery);
    }
    else {
      Exercise.find({
        user: userData
      }, (err, exerciseData) => {
        if (err) return console.error(err);

        Exercise.countDocuments({ user: userData }, (error, dataCount) => {
          if (error) return console.error(error);

          done({
            user: userData,
            exerciseData: exerciseData,
            count: dataCount
          });
        })
      }).limit(limitQuery);
    }
  });
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

app.post('/api/users/:_id/exercises', function (req, res) {
  const exercise = req.body;
  const userId = req.params._id;

  const newExercise = {
    ...exercise,
    userId: userId
  }

  createAndSaveExercise(newExercise, (response) => {
    res.json({
      _id: response.user._id,
      username: response.user.username,
      date: new Date(response.date).toDateString(),
      duration: response.duration,
      description: response.description
    })
  });
});

app.get('/api/users/:_id/logs', function (req, res) {
  const userId = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;

  getExecisesOfUser(userId, from, to, limit, (response) => {
    const { user, exerciseData, count } = response;

    const logResult = [];
    exerciseData.forEach(el => {
      logResult.push({
        description: el.description,
        duration: el.duration,
        date: new Date(el.date).toDateString(),
      })
    })

    res.json({
      username: user.username,
      _id: user._id,
      count: count,
      log: [...logResult]
    });
  })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
