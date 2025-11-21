/*
const bcrypt = require('bcrypt');
const saltRounds = 5;

$(document).ready(function () {
  $("#register-btn").click(function () {
    /*
    const pass = $('#password1').val(); 
    bcrypt.hash(pass, saltRounds, function(err, hash) {
      if (err) {
        console.error(err);
        return;
      }
      $.post('register', {
        userName: $('#username').val(),
        userEmail: $('#email').val(),
        password: hash,
        userDetails: $('#bio').val(),
        userPicture: $('#customFile').val()
      }, function (data, status) {
        if (status === 'success') {
          const newItem = document.createElement('div');
          newItem.innerHTML = data.msg;
          $('#register-result').append(newItem);
        }
      }); //post
    }); //hash
  }); //btn
});
*/


$(document).ready(function() {
	$("#register-form").submit(function(e) {
    /*
		e.preventDefault(); // disable refresh

    let email = $("#email").val();
    let username = $("#username").val();
    let pass = $("#password").val();
    let pass2 = $("#retype-password").val();
    let bio = $("#bio").val();
    let pfp = $("#avatar").val();

    if (pass != pass2 || pass.length < 8) {
      // passwords not the same
      // put error here
    } else {
      // passwords the same
      // send to server
      $.post(`/register`, {
        email: email,
        username: username,
        pass: pass,
        bio: bio,
        pfp: pfp,
      }, function(d, s) {
        // res here
        console.log(d);
        if (d.res == "success") {
          window.location.href = "/";
        }
      })
    }
    */

  })
})