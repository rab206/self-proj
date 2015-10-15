/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express    = require('express'),
  app          = express(),
  multer       = require('multer');
    
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    var originalfileName = file.originalname,
        dotIndex = originalfileName.indexOf('.'),
        suffix = originalfileName.substring(dotIndex),
        name = originalfileName.substring(0,dotIndex);
    cb(null, name + '-' + Date.now() + suffix);
  }
});

var upload = multer({storage: storage});
  
// Bootstrap application settings
require('./config/express')(app);

// render index page
app.get('/', function(req, res) {
  res.render('index');
});

// render interaction page
app.get('/interact', function(req, res) {
  res.render('userinput');
});

var db = {};

// redirect nfc user to latest page from that device
app.get('/nfc/:id', function(req,res,next){
  // req.params.id
  var audit_trail = db[req.params.id];
  var target = audit_trail[audit_trail.length -1].target;
  if(target){
    target = target.replace("ajax=true&",'');
  } else {
    target = 'http://www.selfridges.com/';
  }
  res.redirect(target);
});

// log the updates to the database
app.post('/log', function(req,res,next){
  //{guid: guid(), trail: audit_trail}
  console.log(req.body);
  db[req.body.guid] = [];
  db[req.body.guid] = req.body.trail;
  res.end('{"success" : "Updated Successfully", "status" : 200}');
});

// receive images from customers
app.post('/uploadimage', upload.single('imgFile'), function(req,res){
    res.end(req.file.filename);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.code = 404;
  err.message = 'Not Found';
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  var error = {
    code: err.code || 500,
    error: err.message || err.error
  };
  console.log('error:', error);

  res.status(error.code).json(error);
});

var port = process.env.VCAP_APP_PORT || process.env.PORT;
app.listen(port, process.env.ip);
console.log('listening at:', port);
