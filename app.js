var db = require('./variable')
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

const corsOptions ={
  origin:'http://206.12.7.97:8080/', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200
}

app.use(cors(corsOptions));


const asc = arr => arr.sort((a, b) => a - b);

const sum = arr => arr.reduce((a, b) => a + b, 0);

const mean = arr => sum(arr) / arr.length;

// sample standard deviation
const std = (arr) => {
    const mu = mean(arr);
    const diffArr = arr.map(a => (a - mu) ** 2);
    return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

const quantile = (arr, q) => {
    const sorted = asc(arr);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};

const mariadb = require('mariadb');
const pool = mariadb.createPool({
  host: db.DB_HOST, 
  user: db.DB_USER, 
  password: db.DB_PASS, 
  database: db.DB_NAME,
  port: db.DB_PORT,
  connectionLimit: 5});















// const mysql = require('mysql')
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '1234',
//   database: 'dashboard'
// })

// connection.connect()



app.post('/',(req, res) => {
  pool.getConnection()
  .then(conn => {
    var sql = "SELECT * FROM student WHERE student_number = ?";
    conn.query(sql, [req.body.student_number])
      .then((rows) => {
        console.log(rows); 
        if(rows.length){
          var hasVisited = false;
          var sql = "SELECT * FROM log where student_number = ? and event = 'exit'";
          conn.query(sql, [req.body.student_number])
          .then((visited) =>{
            if(visited.length){
              hasVisited = true;
            }
          })          
          .catch(err => {
            console.log(err); 
            conn.end();
          })
          let group = rows[0].division;
          let insert_sql = "INSERT INTO log(visit_time, student_number) VALUES (?, ?)"
          conn.query(insert_sql, [new Date(), req.body.student_number]) 
          .then()
          .catch(err => {
            console.log(err); 
            conn.end();
          })

          let assgn_query = "select id, name from assignment where id = (select max(id) from assignment);";
          conn.query(assgn_query).then(
            assignment => {
          assignment_id = assignment[0]["id"];
          assignment_name = assignment[0]['name'];
          let grade_query = "select * from performance where assignment = ? and student_number = ?";
          conn.query(grade_query,[assignment_id, Number(req.body.student_number)]).then(
              your_grade => 
              {
                console.log(rows[0].division, rows[0].division?.[0] === 'intervention')
                if(rows[0].division?.[0] === 'intervention'){

                  console.log(assignment_id);
                  grade_query = "Select grade, time from comparator where assignment = ? and student_number = ? ";
                  conn.query(grade_query,[assignment_id, req.body.student_number]).then(
                    result => {
                      console.log("*******\n", result,assignment_id, req.body.student_number);
                      conn.release()
                      return res.send({
                        loggedIn: true, 
                        group: "intervention", 
                        assignment_name: assignment_name,
                        your_perf: {time: your_grade[0]['time'], grade: your_grade[0]['grade']}, 
                        peers: result,
                        hasVisited: hasVisited,
                        class: rows[0].class[0]
                      });
                    

                  })          
                  .catch(err => {
                    console.log(err); 
                    conn.end();
                  });
                  }
                else{
                  grade_query = `
                  Select grade 
                  from performance inner join student on performance.student_number = student.student_number
                  where assignment = ? and class = ?
                  order by grade`;
                  conn.query(grade_query, [assignment_id, rows[0].class[0]])
                  .then(result => {
                    console.log("//////////\n", assignment_id, rows[0].class[0], result);
                    let grade_array = result.map(g => g.grade);
                    conn.release();
                    return res.send(
                      {
                        loggedIn: true,
                        group: "control",
                        assignment_name: assignment_name,
                        your_perf: your_grade[0]['grade'],
                        hasVisited: hasVisited,
                        class: rows[0].class[0],
                        grades: [
                        grade_array[0], 
                        quantile(grade_array, .25), 
                        mean(grade_array), 
                        quantile(grade_array, .75), 
                        grade_array[grade_array.length - 1]
                      ]});

                  })          
                  .catch(err => {
                    console.log(err); 
                    conn.end();
                  });
                }
              });
          });
        }
        else{
          conn.release();
          return res.send({loggedIn: false});
        }
      })
      .catch(err => {
        //handle error
        console.log(err); 
        conn.end();
      })
  }).catch(err => {
    //not connected

  });

})

app.post('/exit', (req, res) => {
  pool.getConnection()
  .then(conn => {
          let insert_sql = "INSERT INTO log(visit_time, student_number, event) VALUES (?, ?, 'exit')"
          conn.query(insert_sql, [new Date(), req.body.student_number]) 
          .then((result) => {
            conn.release();
            return res.send({exit: true});
          }
          )
          .catch(err => {
            console.log(err); 
            conn.end();
          })

    }).catch(err => {
      console.log(err); 
    })

})

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
