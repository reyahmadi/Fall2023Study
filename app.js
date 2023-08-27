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
  origin:'http://localhost:3000', 
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
  host: 'localhost', 
  user: 'root', 
  password: '1234', 
  database: 'dashboard',
  port: 3307,
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
          let group = rows[0].division;
          let insert_sql = "INSERT INTO LOG(visit_time, student_number) VALUES (?, ?)"
          conn.query(insert_sql, [new Date(), req.body.student_number]) 
          .then()
          .catch(err => {
            console.log(err); 
            conn.end();
          })

          let assgn_query = "select max(id), name from assignment group by id;";
          conn.query(assgn_query).then(
            assignment => {
          assignment_id = assignment[0]["max(id)"];
          assignment_name = assignment[0]['name'];
          let grade_query = "select * from performance where assignment = ? and student_number = ?";
          conn.query(grade_query,[assignment_id, Number(req.body.student_number)]).then(
              your_grade => 
              {
                console.log(rows[0].division, rows[0].division?.[0] === 'intervention')
                if(rows[0].division?.[0] === 'intervention'){

                  console.log(assignment_id);
                  grade_query = "Select * from performance where assignment = ? and time >= ? and grade >= ? and student_number!= ?";
                  conn.query(grade_query,[assignment_id, your_grade[0]['time'], your_grade[0]['grade'], req.body.student_number]).then(
                    result => {
                    console.log({loggedIn: true, your_perf: {time: your_grade[0]['time'], grade: your_grade[0]['grade']}, peers: result})
                    return res.send({
                      loggedIn: true, 
                      group: "intervention", 
                      assignment_name: assignment_name,
                      your_perf: {time: your_grade[0]['time'], grade: your_grade[0]['grade']}, 
                      peers: result
                    });
                  });
                  }
                else{
                  grade_query = "Select grade from performance where assignment = ? order by grade";
                  conn.query(grade_query, [assignment_id]).then(result => {
                    let grade_array = result.map(g => g.grade);
                    return res.send(
                      {
                        loggedIn: true,
                        group: "control",
                        assignment_name: assignment_name,
                        your_perf: your_grade[0]['grade'],
                        grades: [
                        grade_array[0], 
                        quantile(grade_array, .25), 
                        mean(grade_array), 
                        quantile(grade_array, .75), 
                        grade_array[grade_array.length - 1]
                      ]});

                  });
                }
              });
          });
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










  // // let data = req.body;
  // // res.send('Data Received: ' + JSON.stringify(data));
  // var sql = "SELECT * FROM ?? WHERE ?? = ?";
  // sql = mysql.format(sql, ['student', 'student_number', req.body.student_number])
  // connection.query(sql, (err, rows, fields) => {
  //   if (err) throw err
  //   if(rows.length){
  //     let group = rows[0].division;
  //     let insert_sql = "INSERT INTO LOG(visit_time, student_number) VALUES (?, ?)"
  //     insert_sql = mysql.format(insert_sql, [new Date(), req.body.student_number]);
  //     connection.query(insert_sql, (err, rows, fields) => {
  //       if (err) throw err
  //     })
  //     let assgn_query = "select max(id), name from assignment group by id;";
  //     connection.query(assgn_query, (err, assignment, fields) => {
  //       assignment_id = assignment[0]["max(id)"];
  //       assignment_name = assignment[0]['name'];
  //       let grade_query = "select * from performance where assignment = ? and student_number = ?";
  //       grade_query = mysql.format(grade_query, [assignment_id, Number(req.body.student_number)]);
  //         connection.query(grade_query, (err, your_grade, fields) => {
  //           if(rows[0].division === "intervention"){

  //             console.log(assignment_id);
  //             grade_query = "Select * from performance where assignment = ? and time >= ? and grade >= ? and student_number!= ?";
  //             grade_query = mysql.format(grade_query, [assignment_id, your_grade[0]['time'], your_grade[0]['grade'], req.body.student_number]);
  //             grades = connection.query(grade_query, (err, result, fields) => {
  //               console.log({loggedIn: true, your_perf: {time: your_grade[0]['time'], grade: your_grade[0]['grade']}, peers: result})
  //               return res.send({
  //                 loggedIn: true, 
  //                 group: group, 
  //                 assignment_name: assignment_name,
  //                 your_perf: {time: your_grade[0]['time'], grade: your_grade[0]['grade']}, 
  //                 peers: result});
  //             });
  //             }
  //           else{
  //             grade_query = "Select grade from performance where assignment = ? order by grade";
  //             grade_query = mysql.format(grade_query, [assignment_id]);
  //             grades = connection.query(grade_query, (err, result, fields) => {
  //               let grade_array = result.map(g => g.grade);
  //               return res.send(
  //                 {
  //                   loggedIn: true,
  //                   group: group,
  //                   assignment_name: assignment_name,
  //                   your_perf: your_grade[0]['grade'],
  //                   grades: [
  //                   grade_array[0], 
  //                   quantile(grade_array, .25), 
  //                   mean(grade_array), 
  //                   quantile(grade_array, .75), 
  //                   grade_array[grade_array.length - 1]
  //                 ]});

  //             });
  //           }
  //         });


  //     })

  //   }
  //   else{
  //     return res.send({loggedIn: false});
  //   }

  // })
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
