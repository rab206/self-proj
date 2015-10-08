'use strict';

$(document).ready(function() {  
  
  var console = {};
  console.log = function(text) {
    alert(text);
  };

  // jQuery variables attached to DOM elements
  var $error = $('.error'),
    $errorMsg = $('.errorMsg'),
    $loading = $('.loading'),
    $results = $('.results'),
    //$output = $('.output'),
    //$question = $('.questionText'),
    $connecting = $('.connecting');
    
  var processWitResponse = function(answers) {

    $loading.show();
    $error.hide();
    $results.hide();
    
    console.log(answers.intent);
    performAction(answers);
    $('html, body').animate({ scrollTop: 0 }, 'fast');
    
  };
  
  var witError = function(error){
    $error.show();
    $errorMsg.text(error ||
      'Sorry i could not understand the question, please try again');
    $loading.hide();
  };
  
  var history = [{context:'default'}];
  var audit_trail = [];
  var device_id;
  
  function getDeviceId() {
    if(!device_id) {
      // get device id via socket
      device_id = 1;
    }
    return device_id;
  }
  
  function logAction(action){
    audit_trail.push(action);
    $.post('log', {guid: getDeviceId(), trail: audit_trail});
  }
  
  var page_actions = {
    'default': {
        'search_selfridges': {sample : 'search for corner sofas', func: function(action) {
          var search_term;
          if(action.answers.entities.sofa_search[0].value) {
            search_term = action.answers.entities.sofa_search[0].value;
          } else {
            search_term = action.speech;
          }
          var search = 'http://www.selfridges.com/webapp/wcs/stores/servlet/FhBrowse?ajax=true&catalogId=16151&msg=&ppp=12&srch=Y&storeId=10052&freeText=blue%20dress'+encodeURIComponent(search_term) + '&pn=1';
          action.context = 'search_results';
          changePage(search,action);
        }},
        'previous': {sample : 'go back', func:function(action){
          if(history.length > 1)
            history.pop();
          var previous_action = history[history.length -1];
          refreshObject(previous_action.target,action);
        }}
    },
    'search_results': {
        'more_results': {sample : 'show more results', func:function(action) {
          //console.log(history[history.length -1]['target']);
          var search = history[history.length -1]['target'],
              page_num = Number(search.substring(search.length - 1,search.length)) + 1,
              target = search.substring(0, search.length - 1) + page_num;
          action.context = 'search_results';
          changePage(target,action);
        }},
        'select': {sample : 'open the first product', func:function(action){
          var num;
          if(action.answers.entities.number){
            num = action.answers.entities.number[0].value;
          } else if(action.answers.entities.ordinal) {
            num = action.answers.entities.ordinal[0].value;
          } else {
            num = nthToNum(action.speech.match(new RegExp(Object.keys(nth).join('|'),'g'))[0]);
          }
          var target = $('.productsInner div:nth-child(' + num + ') .title').attr('href');
          action.context = 'product_viewer';
          changePage(target, action);
        }}
    },
    'lister': {
        'select': function() { /* ... */ },
        'filter': function() { /* ... */ },
        'sort': function() { /* ... */ }
    },
    'product_viewer': {
        'next': function() { /* ... */ },
        'previous': function() { /* ... */ },
        'info': function() { /* ... */ }
    }
  };
  
  var nth = {
    'first': 1,
    'second': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'eighth': 8
  };
  
  function nthToNum(text){
    return nth[text];
  }
  
  function defaultAction(action){
    /* display usage tips based on current page and default options */
    var questions = [];
    logAction(action);
    for(var i in page_actions[action.previous_context]){
      questions.push(page_actions[action.previous_context][i]['sample']);
    }
    if(action.previous_context != 'default'){
      for(var j in page_actions['default']){
        questions.push(page_actions['default'][j]['sample']);
      }
    }
    loadQuestions(questions);
    console.log("default action");
  }
  
  function changePage(target, action){
    refreshObject(target, action);
    history.push(action);
  }
  
  function refreshObject(target, action){
    if(action.context === 'search_results'){
      $.ajax({
          url: "http://jsonp.wemakelive.com",
          jsonp: "callback",
          dataType: "jsonp",
          data: {
              url: target
          },
          // Work with the response
          success: function( response ) {
             $loading.hide();
             $results.show();
             $('#output').html( response.contents ); // server response
          }
      });
    } else  {
      //console.log(target);
      document.getElementById("output").innerHTML='<object height="800" width="1100" class="output" id="object" type="text/html" data="' + target + '" ></object>';
      $loading.hide();
      $results.show();
    }
    action.target = target;
    logAction(action);
  }
  
  function performAction(answers) {
    var top_action = answers.intent,
        speech = answers._text,
        context = history[history.length-1]['context'],
        action_object = {};
    action_object.top_action = top_action;
    action_object.previous_context = context;
    action_object.speech = speech;
    action_object.answers = answers;
    if (top_action) {
        if (top_action in page_actions[context]) {
          page_actions[context][top_action]['func'](action_object);
        } else if(top_action in page_actions['default']){
          page_actions['default'][top_action]['func'](action_object);
        } else {
          console.log('undefined action ' + context + ': ' + top_action);
          defaultAction(action_object);
        }
    } else {
        console.log('undefined context: ' + context);
        defaultAction(action_object);
    }
  }

  var loadQuestions = function (questions){
    questions.forEach(function(question){
      $('<a>').text(question).appendTo('.example-questions').append('&nbsp; &nbsp; &nbsp;');
    });
  };
  
  var defaultQuestions = [
    'Im looking for a 3 seater sofa',
    'Find black leather sofas',
    'Tell me about finance options',
    'Corner sofas'
  ];

  function on_text (args) {
    var json = JSON.parse(args[0]);
    if(json && json.outcomes){
      //console.log(json.outcomes[0]);
      var outcomes = json.outcomes[0],
          confidence = outcomes.confidence;
      if(confidence > 0.3){        
        processWitResponse(outcomes); 
      } else {
        witError();
      }
    } else {
      witError();
    }
  }


  loadQuestions(defaultQuestions);


  var wsuri = "ws://127.0.0.1:8080/ws";  
  // the WAMP connection to the Router
  //
  var connection = new autobahn.Connection({
    url: wsuri,
    realm: "realm1"
  });
  
  // fired when connection is established and session attached
  //
  connection.onopen = function (session, details) {
    $connecting.hide();
    
    
    // SUBSCRIBE to a topic and receive events
    session.subscribe('com.selfridges.speech', on_text).then(
      function (sub) {
        console.log('subscribed to topic');
      },
      function (err) {
        console.log('failed to subscribe to topic', err);
      }
    );
  };
  
  connection.onclose = function (session, details){
    $connecting.show();
  };

  connection.open();

});