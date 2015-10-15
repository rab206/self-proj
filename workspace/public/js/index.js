'use strict';

$(document).ready(function() {  
  
  // var console = {};
  // console.log = function(text) {
  //   alert(text);
  // };

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
    var date = new Date();
    action.timestamp = date;
    audit_trail.push(action);
    $.post('log', {guid: getDeviceId(), trail: audit_trail});
  }
  
  var page_actions = {
    'default': {
        'search_selfridges': {sample : 'search for gucci handbags', func: function(action) {
          var search_term;
          if(action.answers.entities.search_entity[0] && action.answers.entities.search_entity[0].value) {
            search_term = action.answers.entities.search_entity[0].value;
          } else if(action.answers.entities.search_entity.value){
            search_term = action.answers.entities.search_entity.value;
          } else {
            search_term = action.speech;
          }
          var search = 'http://www.selfridges.com/webapp/wcs/stores/servlet/FhBrowse?ajax=true&catalogId=16151&msg=&ppp=6&srch=Y&storeId=10052&freeText='+encodeURIComponent(search_term) + '&pn=1';
          action.context = 'search_results';
          changePage(search, action);
        }},
        'previous': {sample : 'go back', func:function(action){
          if(history.length > 1){
            history.pop();
          }
          var previous_action = history[history.length -1];
          action.context = previous_action.context;
          refreshObject(previous_action.target,action);
        }},
        'inspiration': {sample : 'inspire me', func:function(action){
          var target = 'http://www.youtube.com/embed/92mFJkee1mE?list=UUvXRE9A1im1wsmfjYzds_9Q&autoplay=1';
          action.context = 'inspiration';
          changePage(target,action);
        }}
    },
    'search_results': {
        'more_results': {sample : 'show more results', func:function(action) {
          var search = history[history.length -1]['target'],
              page_num = Number(search.substring(search.length - 1,search.length)) + 1,
              target = search.substring(0, search.length - 1) + page_num;
          action.context = 'search_results';
          changePage(target,action);
        }},
        'select': {sample : 'open the first product', func:function(action){
          var num;
          if(action.answers.entities.number){
            if(action.answers.entities.number.value){
              num = action.answers.entities.number.value
            } else {
              num = action.answers.entities.number[0].value;
            }
          } else if(action.answers.entities.ordinal) {
            if(action.answers.entities.ordinal) {
              num = action.answers.entities.ordinal.value;
            } else {
              num = action.answers.entities.ordinal[0].value;
            }
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
    console.log("loading: " + target);
    refreshObject(target, action);
    history.push(action);
  }
  
  /**
   * This is a short term fix to get the pages back into the site.
   * In a proper implementation we would use REST services or equivalent
   **/
  function refreshObject(target, action){
    // inspiration is a youtube video so no doctype, upload is just an image from the server
    if(action.context === 'inspiration'){
      // if it's not a search we just load the contents directly into the object.
      document.getElementById("output").innerHTML='<object height="800" width="1100" class="output" id="object" type="text/html" data="' + target + '" ></object>';
      $loading.hide();
      $results.show();
    } else if(action.context === 'upload'){
      document.getElementById("output").innerHTML='<img width="1100" class="uploadedImage" id="uploadedImage" src="' + target + '" />';
      $loading.hide();
      $results.show();
    } else {
      // use jsonp to avoid cross domain origin issues
      $.ajax({
          url: "http://jsonp.wemakelive.com",
          jsonp: "callback",
          dataType: "jsonp",
          // async: false,
          data: {
              url: target
          },
          // Work with the response
          success: function( response ) {
            $loading.hide();
            $results.show();
            // if there is a 301 redirect to a landing page
            // then we only want to deal with the actual html rather than the redirect as well
            var responseHtml = response.contents;
            var $html = $(responseHtml.substring(responseHtml.indexOf("<!DOCTYPE html>")));
            $('#output').html($html.find('#masterContent').html());
            $('.productContainer img').each(function(){
              $(this).attr('src', $(this).attr('data-mainsrc'));
            });
            $('.productContainer img').css('visibility', 'visible');
            $('#paginationFooter').hide();
          }
        });
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
    var outcomes;
    if(args[0].outcome){
      var json = args[0];
      outcomes = json.outcome;
      outcomes._text = json.msg_body;
    } else {
      json = JSON.parse(args[0]);
      outcomes = json.outcomes[0];
    }
    if(outcomes){
      var confidence = outcomes.confidence;
      if(confidence > 0.3){        
        processWitResponse(outcomes); 
      } else {
        witError();
      }
    } else {
      witError();
    }
  }
  
  function on_image (args) {
    var imageName = args[0];
    if(imageName){
      var action = {
        top_action: 'upload',
        speech: 'upload image',
        context: 'upload',
        previous_context: history[history.length-1]['context']
      };
      refreshObject('/uploads/' + imageName, action);
    }
  }
  


  loadQuestions(defaultQuestions);


  var wsuri = "ws://crossbar-rab206.c9.io/ws";  
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
    
    
    // SUBSCRIBE to speech events
    session.subscribe('com.selfridges.speech', on_text).then(
      function (sub) {
        console.log('subscribed to topic');
      },
      function (err) {
        console.log('failed to subscribe to topic', err);
      }
    );
    
    // SUBSCRIBE to image upload events
    session.subscribe('com.selfridges.uploadimage', on_image).then(
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
