// //Advances in JavaScript have made it so that certain functionality
// //has been built in. This file will not use JQuery. The more modern
// //standard of JavaScript is called ES6. Read more:
// //https://www.w3schools.com/Js/js_es6.asp

// //This line waits for the document to complete loading before connecting
// //the necessary onclick listeners.
// //It is also shown how to declare a function using the new syntax.
// document.addEventListener('DOMContentLoaded', () => {
	
// var reviewForm = document.querySelector('reviewForm');

// //This connects the onclick event
// reviewForm.onsubmit = async (e) => {
//     e.preventDefault();
// 	let result = await fetch(	 
//         `restaurant/${restaurantAcc.value}`,{
//             method: "POST", 
//             body: new FormData(reviewForm)
//         });
//     let asd = await response.json();
//     console.log(asd);
// };//onclick

// });//addEventListener


