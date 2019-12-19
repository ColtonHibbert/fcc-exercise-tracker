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

//app.use(bodyParser.urlencoded({extended: false}))
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

app.post("/api/exercise/add", async (req, res) => {
  const userId = parseInt(req.body.userId);
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  let date = req.body.date;
  console.log("here is the date of req.body", date)
  console.log("here is type of userId", typeof userId)
  console.log("here is the type of duration", typeof duration)
  console.log(typeof date)
  if(date) {
    date = new Date(date)
    console.log("initial date converted", date)
  } else if(date != true) {
    date = new Date()
    console.log("todays date", date)
  }
  
  console.log(date,"before the sql")
  console.log(typeof userId, "here is the userId type")
  let username = "";
  async function insertExercises() {
    await db.transaction(trx => {
      trx("exercises")
      .returning("*")
      .insert({
        users_id: userId,
        description: description,
        duration: duration,
        date: date
      })
      .then(async data => {  
          const a = await db.transaction(trx => {
            console.log("countup ran")
            trx("users")
            .where("_id", "=", userId)
            .increment('count', 1)
            .then(trx.commit)
            .catch(err => {
              trx.rollback
              console.log(err)
            })
          }).catch(err => {
          console.log(err)
          })
          console.log(a, "here is a")

          const b = await db.transaction(trx => {
            console.log("username ran")
            trx("users").select("username")
            .where("_id", "=", userId)
            .returning("username")
            .then(userData => {
              console.log(userData[0].username)
              username = userData[0].username
            })
            .then(trx.commit)
            .catch(err => {
              console.log("get username error",err)
            })
          }).catch(err => {
          console.log("get username error",err)
          })
          console.log(b, "here is b")

        console.log("this runs before res.json")
        const resDate = (() => {
            console.log(data[0])
            const dateArray = data[0].date.toString().split(" ");
            const dateOutputStringArray = [];
            for (let i = 0; i < 4; i++) {
              dateOutputStringArray.push(dateArray[i]);
            }
            const shortenedDate = dateOutputStringArray.join(" ");
            return shortenedDate
        })()
        res.json({
          "username": username,
          "description": data[0].description,
          "duration": data[0].duration,
          "_id": data[0].users_id,
          "date": resDate
        })
      //})()
      console.log("here is the username after transaction calls", username)
      })
      .then(trx.commit)
      .catch(err => {
        trx.rollback
        console.log(err)
      })
    })
  }
  const exercisesInserted = await insertExercises();  
})

app.get('/api/exercise/log', async (req, res) => {
  
  const userId = Number(req.query.userId);
  const from = ((fromArg) => {
    if (fromArg) {
      return new Date(fromArg);
    } else {
      return fromArg
    }
  })(req.query.from)

  const to = ((toArg) => {
    if (toArg) {
      return new Date(toArg);
    } else {
      return toArg
    }
  })(req.query.to)

  const limit = ((limitArg) => {
    if(limitArg) {
      return parseInt(req.query.limit);
    } {
      return limitArg
    }
  })(req.query.limit)

  function splitDate(date) {
    const stringDate = date.toString();
    const dateArray = stringDate.split(" ");
    let dateOutputStringArray = [];
      for (let i = 0; i < 4; i++) {
        dateOutputStringArray.push(dateArray[i])
      }
    return dateOutputStringArray.join(" ");
  }

  console.log(userId)
  const user = await db.transaction(trx => {
    trx('users')
    .where("_id", "=", userId)
    .returning("*")
    .then(trx.commit)
    .catch(err => {
      console.log(err)
    })
  })
  console.log(user, "user")

  const exerciseArray = await db.transaction(trx => {
    const exerciseArrayQueryBuilder = trx("exercises")
    .select("description", "duration", "date")
    .where("users_id", "=", userId);

    if(from) {
      exerciseArrayQueryBuilder.andWhere("date", ">=", from)
    }
    if(to) {
      exerciseArrayQueryBuilder.andWhere("date", "<=", to)
    }
    if(limit) {
      exerciseArrayQueryBuilder.limit(limit)
    }
    
    exerciseArrayQueryBuilder.returning("description", "duration", "date")
    .then(trx.commit)
    .catch(err => {
      console.log(err)
    })
  })
  console.log(exerciseArray, "exerciseArray")
  const exerciseArrayResponse = ((exerciseArray) => {
    let responseArray = exerciseArray;
      for(let i = 0; i < responseArray.length; i++) {
        
        console.log(splitDate(responseArray[i].date))
        responseArray[i].date = splitDate(responseArray[i].date)
    }
    return responseArray;
  })(exerciseArray)
  if(from && to) {
    res.json({
      _id: user[0]._id,
      username: user[0].username,
      from: splitDate(from),
      to: splitDate(to),
      count: user[0].count,
      log: exerciseArrayResponse
    })
    return
  }
  if(from) {
    res.json({
      _id: user[0]._id,
      username: user[0].username,
      from: splitDate(from),
      count: user[0].count,
      log: exerciseArrayResponse
    })
    return
  }
  if(to) {
    res.json({
      _id: user[0]._id,
      username: user[0].username,
      to: splitDate(to),
      count: user[0].count,
      log: exerciseArrayResponse
    })
    return
  }
  if(from !== true && to !== true) {
    res.json({
      _id: user[0]._id,
      username: user[0].username,
      count: user[0].count,
      log: exerciseArrayResponse
    })
  }
 
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
