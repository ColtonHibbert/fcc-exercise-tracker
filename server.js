const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const knex = require('knex');

const cors = require('cors');

//const mongoose = require('mongoose')
//mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

const db = knex({
  client: "pg",
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: 'Datahero45!',
    database: 'fccexercisetracker'
  }
})

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.urlencoded())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// // Error Handling middleware
// app.use((err, req, res, next) => {
//   let errCode, errMessage

//   if (err.errors) {
//     // mongoose validation error
//     errCode = 400 // bad request
//     const keys = Object.keys(err.errors)
//     // report the first validation error
//     errMessage = err.errors[keys[0]].message
//   } else {
//     // generic or custom error
//     errCode = err.status || 500
//     errMessage = err.message || 'Internal Server Error'
//   }
//   res.status(errCode).type('txt')
//     .send(errMessage)
// })

app.post("/api/exercise/new-user", function (req, res) {
  console.log("new-user was pinged")
  const username = req.body.username
  console.log(username);
  db.transaction(trx => {
    trx('users')
    .returning("*")
    .insert({
      username: username
    })
    .then(data => {
      res.json({username: data[0].username, _id: data[0]._id })
    })
    .then(trx.commit)
    .catch(err => {
      trx.rollback
      console.log(err, "error adding new user")
    })
  }).catch(err => {
    console.log(err)
  })
})

app.get("/api/exercise/users", (req, res) => {
  db.select("_id", "username").from('users')
  .returning("_id", "username")
  .then(data => {
    console.log(data)
    res.json(data)
  })
})

app.post("/api/exercise/add", (req, res) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;
  console.log("here is the date of req.body", date)
  console.log(typeof date)

  if(date) {
    date = new Date(date).toString();
    console.log(date)
    const dateArray = date.split(" ");
    const dateOutputStringArray = [];
    for (let i = 0; i < 4; i++) {
      dateOutputStringArray.push(dateArray[i])
    }
    date = dateOutputStringArray.join(" ");
    console.log(date);
  } else if (date !== true) {
    date = new Date().toString();
    const dateArray = date.split(" ");
    const dateOutputStringArray = [];
    for (let i = 0; i < 4; i++) {
      dateOutputStringArray.push(dateArray[i]);
    }
    date = dateOutputStringArray.join(" ");
    console.log(date, "inside not true statement");
  }
  
  console.log(date,"before the sql")

  let username = "";
  db.transaction(trx => {
    trx("exercises")
    .returning("*")
    .insert({
      users_id: userId,
      description: description,
      duration: duration,
      date: date
    })
    .then(data => {
          db.transaction(trx => {
              trx("users").where("_id", "=", userId)
              .returning("username")
              .increment('count', 1)
              .then(trx.commit)
              .catch(err => {
                trx.rollback
                console.log(err)
              })
            }
          ).catch(err => {
            console.log(err)
          })
  
          db.transaction(trx => {
              trx("users").select("username")
              .where("_id", "=", userId)
              .then(userData => {
                console.log(userData[0].username)
                return userData[0].username
              })
            }
          ).catch(err => {
            console.log(err)
          })
          
        res.json({
            "username": username,
            "description": data[0].description,
            "duration": data[0].duration,
            "_id": data[0].users_id,
            "date": data[0].date
          })
        
      console.log("here is the username after transaction calls", username)
      
    })
    .then(trx.commit)
    .catch(err => {
      trx.rollback
      console.log(err)
    })
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
