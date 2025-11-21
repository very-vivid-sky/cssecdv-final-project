$(document).ready(function () {

  $("#register-btn").click(function () {
    $.post('register', {
      userName: $('#username').val(),
      userEmail: $('#email').val(),
      password: $('#password1').val(),
      userDetails: $('#bio').val(),
      userPicture: $('#customFile').val(),

    }, function (data, status) {
      if (status === 'success') {
        const newItem = document.createElement('div');
        newItem.innerHTML = data.msg;
        $('#register-result').append(newItem);
      }
    });//post
  });//btn


  $("#reviewSubmit").submit(function () {
    let url = "restaurant/"+ $('#restaurantAcc').val();
    $.post(url,{ 
      userAcc: $('#restaurantAcc').val(),
      reviewBody: $('#reviewBody').val(),
      restaurantAcc: $('#restaurantAcc').val(),
      rating: 4.5,
      images: null,
    }, function (data, status) {
      if (status === 'success') {
        console.log("SUCCESS");
      }else{
        console.log('ERRROR');
      }
    });//post
  });
})



