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
  bluemix      = require('./config/bluemix'),
  extend       = require('util')._extend,
  watson       = require('watson-developer-cloud');

// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials = extend({
  version: 'v1',
  url: "https://gateway.watsonplatform.net/natural-language-classifier/api",
  username: "9e0ba511-b4ae-4f7a-baa8-0dceed36cedf",
  password: "PxDpcK0SVMv1"
}, bluemix.getServiceCreds('natural_language_classifier')); // VCAP_SERVICES

// Create the service wrapper
var nlClassifier = watson.natural_language_classifier(credentials);

// render index page
app.get('/', function(req, res) {
  res.render('index');
});

// Call the pre-trained classifier with body.text
// Responses are json
app.post('/', function(req, res, next) {
  var params = {
    classifier: process.env.CLASSIFIER_ID || 'D39290-nlc-865', // pre-trained classifier
    text: req.body.text
  };

  nlClassifier.classify(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

var db = {};

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

app.post('/log', function(req,res,next){
  //{guid: guid(), trail: audit_trail}
  console.log(req.body);
  db[req.body.guid] = [];
  db[req.body.guid] = req.body.trail;
  res.end('{"success" : "Updated Successfully", "status" : 200}');
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
